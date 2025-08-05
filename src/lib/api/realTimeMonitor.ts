/**
 * Real-time API Monitor for AI Forsikringsguiden
 * Formål: Real-time monitoring og event handling for API status
 */

import { EventEmitter } from 'events';
import { ApiError } from './errors';

export interface MonitorEvent {
  type: string;
  timestamp: Date;
  data: any;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastError?: ApiError;
  uptime: number;
}

class RealTimeMonitor extends EventEmitter {
  private metrics: ApiMetrics;
  private startTime: Date;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor() {
    super();
    this.startTime = new Date();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 0
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for window focus/blur to manage connection
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (!this.isConnected) {
          this.connect();
        }
      });

      window.addEventListener('blur', () => {
        // Keep connection alive but reduce frequency
      });

      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.connect();
      });

      window.addEventListener('offline', () => {
        this.disconnect();
      });
    }
  }

  public connect(): void {
    if (this.isConnected) return;

    try {
      // In a real implementation, this would establish WebSocket or SSE connection
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // Start periodic health checks
      this.startHealthChecks();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  public disconnect(): void {
    if (!this.isConnected) return;

    this.isConnected = false;
    this.emit('disconnected');
  }

  private handleConnectionError(error: Error): void {
    this.isConnected = false;
    this.emit('connection-error', error);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  private startHealthChecks(): void {
    if (!this.isConnected) return;

    // Simulate periodic health checks
    const healthCheckInterval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(healthCheckInterval);
        return;
      }

      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // In a real implementation, this would make actual health check requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const responseTime = Date.now() - startTime;
      
      this.updateMetrics({
        responseTime,
        success: true
      });

      this.emit('health-check', {
        status: 'healthy',
        responseTime,
        timestamp: new Date()
      });
    } catch (error) {
      this.updateMetrics({
        responseTime: 0,
        success: false,
        error: error as Error
      });

      this.emit('health-check', {
        status: 'unhealthy',
        error: error as Error,
        timestamp: new Date()
      });
    }
  }

  public recordApiCall(endpoint: string, method: string, responseTime: number, success: boolean, error?: ApiError): void {
    this.updateMetrics({
      responseTime,
      success,
      error
    });

    this.emit('api-call', {
      endpoint,
      method,
      responseTime,
      success,
      error,
      timestamp: new Date()
    });

    if (error) {
      this.emit('api-error', {
        endpoint,
        method,
        error: error.message,
        type: error.type,
        severity: error.severity,
        statusCode: error.statusCode,
        errorId: error.requestId,
        timestamp: error.timestamp,
        retryable: error.retryable,
        userMessage: error.userMessage,
        sessionId: error.correlationId
      });
    }
  }

  private updateMetrics(data: {
    responseTime: number;
    success: boolean;
    error?: Error | ApiError;
  }): void {
    this.metrics.totalRequests++;
    
    if (data.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      if (data.error && 'type' in data.error) {
        this.metrics.lastError = data.error as ApiError;
      }
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + data.responseTime) / 
      this.metrics.totalRequests;

    // Update error rate
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;

    // Update uptime
    this.metrics.uptime = Date.now() - this.startTime.getTime();

    this.emit('metrics-updated', this.metrics);
  }

  public getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 0
    };
    this.startTime = new Date();
    this.emit('metrics-reset');
  }

  public isHealthy(): boolean {
    return this.isConnected && this.metrics.errorRate < 0.1; // Less than 10% error rate
  }

  public getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    if (this.isConnected) return 'connected';
    if (this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
      return 'reconnecting';
    }
    return 'disconnected';
  }
}

// Export singleton instance
export const realTimeMonitor = new RealTimeMonitor();

// Auto-connect when module is loaded (if in browser environment)
if (typeof window !== 'undefined') {
  realTimeMonitor.connect();
} 