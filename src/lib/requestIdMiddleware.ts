/**
 * Request ID Middleware for AI Forsikringsguiden
 * Formål: Track requests across services med correlation IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { sessionTracker } from './sessionTracking';
import { performanceMonitor } from './performanceMonitor';

export interface RequestContext {
  requestId: string;
  sessionId?: string;
  correlationId?: string;
  userId?: string;
  userAgent: string;
  ipAddress: string;
  method: string;
  path: string;
  startTime: number;
  metadata: Record<string, any>;
}

export class RequestIdManager {
  private activeRequests = new Map<string, RequestContext>();
  private requestHistory: RequestContext[] = [];
  private maxHistorySize = 1000;

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;
  }

  /**
   * Create request context
   */
  createRequestContext(
    request: NextRequest,
    sessionId?: string,
    userId?: string
  ): RequestContext {
    const requestId = this.generateRequestId();
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ipAddress = this.getClientIp(request);
    const correlationId = request.headers.get('x-correlation-id') || undefined;

    const context: RequestContext = {
      requestId,
      sessionId,
      correlationId,
      userId,
      userAgent,
      ipAddress,
      method: request.method,
      path: request.nextUrl.pathname,
      startTime: Date.now(),
      metadata: {}
    };

    this.activeRequests.set(requestId, context);

    logger.info('Request started', {
      requestId,
      sessionId,
      correlationId,
      method: request.method,
      path: request.nextUrl.pathname,
      userAgent: userAgent.substring(0, 100),
      ipAddress: this.maskIpAddress(ipAddress)
    });

    return context;
  }

  /**
   * Update request context
   */
  updateRequestContext(
    requestId: string,
    updates: Partial<RequestContext>
  ): boolean {
    const context = this.activeRequests.get(requestId);
    if (!context) return false;

    Object.assign(context, updates);
    return true;
  }

  /**
   * Complete request
   */
  completeRequest(
    requestId: string,
    statusCode: number,
    responseSize?: number,
    error?: Error
  ): void {
    const context = this.activeRequests.get(requestId);
    if (!context) return;

    const duration = Date.now() - context.startTime;
    const success = statusCode < 400;

    // Move to history
    this.activeRequests.delete(requestId);
    this.requestHistory.push({
      ...context,
      metadata: {
        ...context.metadata,
        statusCode,
        duration,
        responseSize,
        success,
        error: error?.message
      }
    });

    // Maintain history size
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }

    // Log completion
    logger.info('Request completed', {
      requestId,
      sessionId: context.sessionId,
      correlationId: context.correlationId,
      method: context.method,
      path: context.path,
      statusCode,
      duration,
      success,
      error: error?.message
    });

    // Record metrics
    performanceMonitor.recordMetric('http.request.duration', duration, 'ms', {
      method: context.method,
      path: this.sanitizePath(context.path),
      status: statusCode.toString(),
      success: success.toString()
    });

    if (responseSize) {
      performanceMonitor.recordMetric('http.response.size', responseSize, 'bytes', {
        path: this.sanitizePath(context.path)
      });
    }

    // Track in session if available
    if (context.sessionId) {
      sessionTracker.trackAction(context.sessionId, 'api_call', {
        method: context.method,
        path: context.path,
        statusCode,
        duration,
        success
      });

      if (error) {
        sessionTracker.trackError(context.sessionId, error, {
          requestId,
          method: context.method,
          path: context.path
        });
      }
    }
  }

  /**
   * Get active request context
   */
  getRequestContext(requestId: string): RequestContext | null {
    return this.activeRequests.get(requestId) || null;
  }

  /**
   * Get request statistics
   */
  getRequestStats(timeRange: number = 3600000): {
    totalRequests: number;
    activeRequests: number;
    averageResponseTime: number;
    successRate: number;
    topEndpoints: Array<{ path: string; count: number; avgDuration: number }>;
    errorRate: number;
  } {
    const cutoff = Date.now() - timeRange;
    const recentRequests = this.requestHistory.filter(
      r => r.startTime > cutoff && r.metadata.duration
    );

    const totalRequests = recentRequests.length;
    const activeRequests = this.activeRequests.size;

    const totalDuration = recentRequests.reduce(
      (sum, r) => sum + (r.metadata.duration as number), 0
    );
    const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;

    const successfulRequests = recentRequests.filter(r => r.metadata.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const errorRequests = recentRequests.filter(r => !r.metadata.success).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    // Group by endpoint
    const endpointStats = new Map<string, { count: number; totalDuration: number }>();
    
    for (const request of recentRequests) {
      const path = this.sanitizePath(request.path);
      const stats = endpointStats.get(path) || { count: 0, totalDuration: 0 };
      
      stats.count++;
      stats.totalDuration += request.metadata.duration as number;
      
      endpointStats.set(path, stats);
    }

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([path, stats]) => ({
        path,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      activeRequests,
      averageResponseTime,
      successRate,
      topEndpoints,
      errorRate
    };
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('x-remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || remoteAddr || 'unknown';
  }

  /**
   * Mask IP address for privacy
   */
  private maskIpAddress(ip: string): string {
    if (ip === 'unknown') return ip;
    
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::xxxx';
    } else {
      // IPv4
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.xxx';
    }
  }

  /**
   * Sanitize path for metrics
   */
  private sanitizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\?.*$/, '')
      .toLowerCase();
  }

  /**
   * Cleanup old requests
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    // Remove old active requests (likely abandoned)
    for (const [requestId, context] of this.activeRequests.entries()) {
      if (context.startTime < oneHourAgo) {
        this.completeRequest(requestId, 408, 0, new Error('Request timeout'));
      }
    }

    // Trim history if needed
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.splice(0, this.requestHistory.length - this.maxHistorySize);
    }
  }
}

export const requestIdManager = new RequestIdManager();

/**
 * Next.js middleware for request tracking
 */
export function withRequestId(handler: any) {
  return async (request: NextRequest, context?: any) => {
    const requestContext = requestIdManager.createRequestContext(request);
    
    try {
      // Add request ID to headers
      const response = await handler(request, context);
      
      if (response instanceof NextResponse) {
        response.headers.set('x-request-id', requestContext.requestId);
        
        const contentLength = response.headers.get('content-length');
        
        requestIdManager.completeRequest(
          requestContext.requestId,
          response.status,
          contentLength ? parseInt(contentLength) : undefined
        );
      }
      
      return response;
      
    } catch (error) {
      requestIdManager.completeRequest(
        requestContext.requestId,
        500,
        0,
        error as Error
      );
      
      throw error;
    }
  };
}

/**
 * Express.js style middleware
 */
export function requestIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = requestIdManager.generateRequestId();
    
    // Add to request object
    req.requestId = requestId;
    req.startTime = Date.now();
    
    // Add to response headers
    res.setHeader('x-request-id', requestId);
    
    // Track completion
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      const contentLength = res.get('content-length');
      const responseSize = contentLength ? parseInt(contentLength) : undefined;
      
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('user-agent')?.substring(0, 100)
      });
      
      performanceMonitor.recordMetric('http.request.duration', duration, 'ms', {
        method: req.method,
        status: res.statusCode.toString()
      });
    });
    
    next();
  };
} 