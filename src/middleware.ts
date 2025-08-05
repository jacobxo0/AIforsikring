/**
 * Next.js Middleware for AI Forsikringsguiden
 * Formål: Request tracking, session enhancement, og sikkerhed
 * Kilder: Next.js middleware patterns, session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhanceRequestWithSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import { isFeatureFlagEnabled } from '@/lib/featureFlags';

/**
 * Paths that should be excluded from middleware processing
 */
const EXCLUDED_PATHS = [
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json'
];

/**
 * Rate limiting store (in production, use Redis or external store)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting implementation
 */
function checkRateLimit(identifier: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

/**
 * Security headers configuration
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.openai.com",
      "frame-ancestors 'none'"
    ].join('; '),
    
    // Security headers
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Additional security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Request-ID': '', // Will be set dynamically
  };
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const pathname = request.nextUrl.pathname;

  // Skip middleware for excluded paths
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    // Enhance request with session information
    const { request: enhancedRequest, sessionInfo } = await enhanceRequestWithSession(request);
    
    // Log request start
    const childLogger = logger.child({ 
      requestId, 
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId 
    });

    childLogger.info({
      method: request.method,
      pathname,
      userAgent,
      clientIP,
      isAuthenticated: sessionInfo.isAuthenticated,
      timestamp: new Date().toISOString()
    }, 'Middleware processing request');

    // Rate limiting (if security features are enabled)
    const enhancedSecurityEnabled = isFeatureFlagEnabled('ENABLE_ENHANCED_SECURITY', {
      userId: sessionInfo.userId || undefined,
      userRole: 'user', // Default role for rate limiting
      environment: process.env.NODE_ENV
    });

    if (enhancedSecurityEnabled) {
      const rateLimitKey = sessionInfo.userId || clientIP;
      const isWithinLimit = checkRateLimit(rateLimitKey, 120, 60000); // 120 requests per minute

      if (!isWithinLimit) {
        childLogger.warn({
          event: 'rate_limit_exceeded',
          identifier: rateLimitKey,
          clientIP,
          pathname
        }, 'Rate limit exceeded');

        return NextResponse.json(
          { 
            error: 'For mange forespørgsler. Prøv igen senere.',
            code: 'RATE_LIMIT_EXCEEDED',
            requestId 
          },
          { 
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-Request-ID': requestId
            }
          }
        );
      }
    }

    // Create response
    const response = NextResponse.next({
      request: {
        headers: new Headers(enhancedRequest.headers)
      }
    });

    // Add security headers
    const securityHeaders = getSecurityHeaders();
    securityHeaders['X-Request-ID'] = requestId;

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add CORS headers for API routes
    if (pathname.startsWith('/api/')) {
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    // Log request completion
    const duration = Date.now() - startTime;
    childLogger.info({
      duration,
      statusCode: response.status,
      timestamp: new Date().toISOString()
    }, 'Middleware completed request processing');

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error({
      requestId,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error),
      method: request.method,
      pathname,
      clientIP,
      userAgent,
      duration,
      timestamp: new Date().toISOString()
    }, 'Middleware error occurred');

    // Return error response with proper headers
    const response = NextResponse.json(
      {
        error: 'Der opstod en intern fejl',
        code: 'MIDDLEWARE_ERROR',
        requestId
      },
      { status: 500 }
    );

    response.headers.set('X-Request-ID', requestId);
    
    return response;
  }
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml, manifest.json (static files)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
}; 