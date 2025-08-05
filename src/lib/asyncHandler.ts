/**
 * Generic async handler wrapper for Next.js API routes
 * Formål: Centralized fejlhåndtering og logging for alle API endpoints
 * Kilder: TypeScript strict mode, Next.js API best practices
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';
import { getSessionId } from './session';

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;
}

export class CustomApiError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown>;

  constructor(
    message: string, 
    statusCode = 500, 
    code = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CustomApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export type ApiHandler<T = any> = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrapper for API route handlers with comprehensive error handling
 * @param handler - The async API route handler function
 * @returns Wrapped handler with error catching and logging
 */
export function wrapAsync<T = any>(handler: (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse<T>>): ApiHandler<T> {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    const startTime = Date.now();
    let sessionId: string | null = null;
    let requestId: string | null = null;

    try {
      // Extract session and request IDs for logging context
      sessionId = await getSessionId(request);
      requestId = request.headers.get('x-request-id') || crypto.randomUUID();

      const childLogger = logger.child({ sessionId, requestId });

      childLogger.info({
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      }, 'API request started');

      // Execute the handler
      const result = await handler(request, context);

      const duration = Date.now() - startTime;
      childLogger.info({
        statusCode: result.status,
        duration,
        timestamp: new Date().toISOString()
      }, 'API request completed successfully');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const childLogger = logger.child({ sessionId, requestId });

      // Handle known API errors
      if (error instanceof CustomApiError) {
        childLogger.warn({
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            details: error.details,
            stack: error.stack
          },
          duration,
          timestamp: new Date().toISOString()
        }, 'API request failed with known error');

        return NextResponse.json(
          {
            error: {
              message: error.message,
              code: error.code,
              details: error.details,
              requestId
            }
          },
          { status: error.statusCode }
        );
      }

      // Handle unknown errors
      childLogger.error({
        error: {
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          stack: error instanceof Error ? error.stack : undefined
        },
        duration,
        timestamp: new Date().toISOString()
      }, 'API request failed with unexpected error');

      return NextResponse.json(
        {
          error: {
            message: 'Der opstod en intern fejl. Prøv igen senere.',
            code: 'INTERNAL_ERROR',
            requestId
          }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Creates a standardized API error response
 * @param message - Error message in Danish
 * @param statusCode - HTTP status code
 * @param code - Internal error code
 * @param details - Additional error details
 */
export function createApiError(
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: Record<string, unknown>
): CustomApiError {
  return new CustomApiError(message, statusCode, code, details);
}

/**
 * Standard error responses for common scenarios
 */
export const ApiErrors = {
  NotFound: (resource = 'ressource') => 
    createApiError(`${resource} blev ikke fundet`, 404, 'NOT_FOUND'),
  
  Unauthorized: () => 
    createApiError('Du skal være logget ind for at udføre denne handling', 401, 'UNAUTHORIZED'),
  
  Forbidden: () => 
    createApiError('Du har ikke tilladelse til at udføre denne handling', 403, 'FORBIDDEN'),
  
  BadRequest: (details?: string) => 
    createApiError(`Ugyldig forespørgsel${details ? ': ' + details : ''}`, 400, 'BAD_REQUEST'),
  
  RateLimit: () => 
    createApiError('For mange forespørgsler. Prøv igen senere.', 429, 'RATE_LIMIT_EXCEEDED'),
  
  ValidationError: (field: string, message: string) => 
    createApiError(`Valideringsfejl for ${field}: ${message}`, 422, 'VALIDATION_ERROR', { field, message }),
  
  DatabaseError: () => 
    createApiError('Database fejl opstod', 500, 'DATABASE_ERROR'),
  
  ExternalServiceError: (service: string) => 
    createApiError(`Fejl i ekstern service: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', { service })
} as const; 