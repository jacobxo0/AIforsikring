/**
 * API Error Handler for AI Forsikringsguiden
 * Formål: Comprehensive API error handling med intelligent categorization og recovery
 */

import { logger } from '@/lib/logger';
import { CircuitBreaker } from '@/lib/circuitBreaker';
import { retry } from '@/lib/retry';
import { sessionTracker } from '@/lib/sessionTracking';
import { realTimeMonitor } from '@/lib/realTimeMonitoring';
import { performanceMonitor } from '@/lib/performanceMonitor';

// Create circuit breaker instance
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5
});

/**
 * API Error types
 */
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * API Error severity levels
 */
export enum ApiErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * API Error interface
 */
export interface ApiError extends Error {
  type: ApiErrorType;
  severity: ApiErrorSeverity;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  requestId?: string;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: Record<string, any>;
  correlationId?: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
  statusCode: number;
  headers?: Record<string, string>;
  requestId?: string;
  timestamp: Date;
}

/**
 * API Error Handler configuration
 */
interface ApiErrorHandlerConfig {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableCircuitBreaker: boolean;
  enableRealTimeNotification: boolean;
  enableUserNotification: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ApiErrorHandlerConfig = {
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableCircuitBreaker: true,
  enableRealTimeNotification: true,
  enableUserNotification: true,
  logLevel: 'error'
};

/**
 * API Error Handler class
 */
export class ApiErrorHandler {
  private config: ApiErrorHandlerConfig;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  constructor(config: Partial<ApiErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle API error with comprehensive processing
   */
  async handleError(
    error: any,
    context: {
      endpoint?: string;
      method?: string;
      requestId?: string;
      sessionId?: string;
      userId?: string;
    } = {}
  ): Promise<ApiError> {
    const apiError = this.categorizeError(error, context);
    
    // Log error with context
    await this.logError(apiError, context);
    
    // Track error metrics
    this.trackErrorMetrics(apiError);
    
    // Update error counts
    this.updateErrorCounts(apiError);
    
    // Send real-time notification if enabled
    if (this.config.enableRealTimeNotification) {
      await this.sendRealTimeNotification(apiError, context);
    }
    
    // Track in session if available
    if (context.sessionId) {
      sessionTracker.trackError(context.sessionId, apiError, {
        endpoint: context.endpoint,
        method: context.method,
        apiError: true
      });
    }
    
    return apiError;
  }

  /**
   * Categorize error based on type and context
   */
  private categorizeError(error: unknown, context: any): ApiError {
    const timestamp = new Date();
    let type = ApiErrorType.UNKNOWN_ERROR;
    let severity = ApiErrorSeverity.MEDIUM;
    let userMessage = 'Der opstod en uventet fejl. Prøv igen senere.';
    let retryable = false;
    let statusCode: number | undefined;

    // Network/Fetch errors
    if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
      type = ApiErrorType.NETWORK_ERROR;
      severity = ApiErrorSeverity.HIGH;
      userMessage = 'Netværksfejl. Kontrollér din internetforbindelse.';
      retryable = true;
    }
    
    // Timeout errors
    else if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      type = ApiErrorType.TIMEOUT_ERROR;
      severity = ApiErrorSeverity.MEDIUM;
      userMessage = 'Anmodningen tog for lang tid. Prøv igen.';
      retryable = true;
    }
    
    // HTTP status code errors
    else if (error && typeof error === 'object' && ('response' in error || 'status' in error)) {
      statusCode = (error as any).response?.status || (error as any).status;
      
      switch (statusCode) {
        case 400:
          type = ApiErrorType.VALIDATION_ERROR;
          severity = ApiErrorSeverity.LOW;
          userMessage = 'Ugyldig anmodning. Kontrollér dine data.';
          retryable = false;
          break;
          
        case 401:
          type = ApiErrorType.AUTHENTICATION_ERROR;
          severity = ApiErrorSeverity.HIGH;
          userMessage = 'Du skal logge ind for at fortsætte.';
          retryable = false;
          break;
          
        case 403:
          type = ApiErrorType.AUTHORIZATION_ERROR;
          severity = ApiErrorSeverity.HIGH;
          userMessage = 'Du har ikke tilladelse til denne handling.';
          retryable = false;
          break;
          
        case 429:
          type = ApiErrorType.RATE_LIMIT_ERROR;
          severity = ApiErrorSeverity.MEDIUM;
          userMessage = 'For mange anmodninger. Vent et øjeblik og prøv igen.';
          retryable = true;
          break;
          
        case 500:
        case 502:
        case 503:
          type = ApiErrorType.SERVER_ERROR;
          severity = statusCode === 503 ? ApiErrorSeverity.CRITICAL : ApiErrorSeverity.HIGH;
          userMessage = 'Serverfejl. Vi arbejder på at løse problemet.';
          retryable = true;
          break;
          
        case 504:
          type = ApiErrorType.TIMEOUT_ERROR;
          severity = ApiErrorSeverity.HIGH;
          userMessage = 'Serveren svarer ikke. Prøv igen senere.';
          retryable = true;
          break;
          
        default:
          if (statusCode && statusCode >= 500) {
            type = ApiErrorType.SERVER_ERROR;
            severity = ApiErrorSeverity.HIGH;
            retryable = true;
          }
      }
    }

    // Create API error object
    const apiError: ApiError = {
      name: 'ApiError',
      message: error instanceof Error ? error.message : 'Unknown API error',
      type,
      severity,
      statusCode,
      endpoint: context.endpoint,
      method: context.method,
      requestId: context.requestId || this.generateRequestId(),
      timestamp,
      retryable,
      userMessage,
      technicalDetails: {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        response: error && typeof error === 'object' && 'response' in error ? (error as any).response?.data : undefined,
        headers: error && typeof error === 'object' && 'response' in error ? (error as any).response?.headers : undefined
      },
      correlationId: context.sessionId
    };

    return apiError;
  }

  /**
   * Log error with appropriate level
   */
  private async logError(apiError: ApiError, context: any): Promise<void> {
    const logData = {
      errorId: apiError.requestId,
      type: apiError.type,
      severity: apiError.severity,
      endpoint: apiError.endpoint,
      method: apiError.method,
      statusCode: apiError.statusCode,
      userMessage: apiError.userMessage,
      sessionId: context.sessionId,
      userId: context.userId,
      timestamp: apiError.timestamp.toISOString(),
      retryable: apiError.retryable
    };

    switch (apiError.severity) {
      case ApiErrorSeverity.CRITICAL:
        logger.error('CRITICAL API Error', apiError, logData);
        break;
      case ApiErrorSeverity.HIGH:
        logger.error('High severity API error', apiError, logData);
        break;
      case ApiErrorSeverity.MEDIUM:
        logger.warn('Medium severity API error', apiError, logData);
        break;
      case ApiErrorSeverity.LOW:
        logger.info('Low severity API error', apiError, logData);
        break;
    }
  }

  /**
   * Track error metrics
   */
  private trackErrorMetrics(apiError: ApiError): void {
    // Record error count
    performanceMonitor.recordMetric('api.error.count', 1, 'count', {
      type: apiError.type,
      severity: apiError.severity,
      endpoint: apiError.endpoint || 'unknown',
      statusCode: apiError.statusCode?.toString() || 'unknown'
    });

    // Record error rate as count (since 'rate' is not supported)
    performanceMonitor.recordMetric('api.error.rate', 1, 'count', {
      endpoint: apiError.endpoint || 'unknown'
    });

    // Record response time if available (using 'ms' instead of 'histogram')
    if (apiError.technicalDetails?.responseTime) {
      performanceMonitor.recordMetric('api.response.time', apiError.technicalDetails.responseTime, 'ms', {
        endpoint: apiError.endpoint || 'unknown',
        status: 'error'
      });
    }
  }

  /**
   * Update error counts for circuit breaker logic
   */
  private updateErrorCounts(apiError: ApiError): void {
    if (!apiError.endpoint) return;

    const key = `${apiError.endpoint}:${apiError.type}`;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);
    this.lastErrors.set(key, apiError.timestamp);

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [errorKey, lastError] of this.lastErrors.entries()) {
      if (lastError < oneHourAgo) {
        this.errorCounts.delete(errorKey);
        this.lastErrors.delete(errorKey);
      }
    }
  }

  /**
   * Send real-time notification
   */
  private async sendRealTimeNotification(apiError: ApiError, context: any): Promise<void> {
    try {
      await realTimeMonitor.emit('error', {
        errorId: apiError.requestId,
        type: apiError.type,
        severity: apiError.severity,
        endpoint: apiError.endpoint,
        method: apiError.method,
        statusCode: apiError.statusCode,
        userMessage: apiError.userMessage,
        timestamp: apiError.timestamp.toISOString(),
        sessionId: context.sessionId,
        retryable: apiError.retryable
      });
    } catch (notificationError) {
      logger.error('Failed to send real-time error notification', notificationError);
    }
  }

  /**
   * Execute API call with error handling
   */
  async executeWithErrorHandling<T>(
    apiCall: () => Promise<T>,
    context: {
      endpoint?: string;
      method?: string;
      sessionId?: string;
      userId?: string;
      enableRetry?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    const callContext = {
      ...context,
      requestId
    };

    try {
      // Execute API call with retry if enabled
      let result: T;
      if (context.enableRetry !== false && this.config.enableRetry) {
        result = await retry(
          apiCall,
          {
            retries: context.maxRetries || this.config.maxRetries,
            initialDelay: this.config.retryDelay,
            shouldRetry: (error: Error) => {
              const apiError = this.categorizeError(error, callContext);
              return apiError.retryable;
            }
          }
        );
      } else {
        result = await apiCall();
      }

      // Record success metrics
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordMetric('api.response.time', responseTime, 'ms', {
        endpoint: context.endpoint || 'unknown',
        status: 'success'
      });

      performanceMonitor.recordMetric('api.success.count', 1, 'count', {
        endpoint: context.endpoint || 'unknown'
      });

      return {
        data: result,
        success: true,
        statusCode: 200,
        requestId,
        timestamp: new Date()
      };

    } catch (error) {
      // Handle error
      const apiError = await this.handleError(error, callContext);
      
      // Record failure metrics
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordMetric('api.response.time', responseTime, 'ms', {
        endpoint: context.endpoint || 'unknown',
        status: 'error'
      });

      return {
        error: apiError,
        success: false,
        statusCode: apiError.statusCode || 500,
        requestId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(endpoint?: string): {
    totalErrors: number;
    errorsByType: Record<ApiErrorType, number>;
    errorsBySeverity: Record<ApiErrorSeverity, number>;
    recentErrors: number;
  } {
    const stats = {
      totalErrors: 0,
      errorsByType: {} as Record<ApiErrorType, number>,
      errorsBySeverity: {} as Record<ApiErrorSeverity, number>,
      recentErrors: 0
    };

    // Initialize counters
    Object.values(ApiErrorType).forEach(type => {
      stats.errorsByType[type] = 0;
    });
    
    Object.values(ApiErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity] = 0;
    });

    // Count errors
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [key, count] of this.errorCounts.entries()) {
      const [errorEndpoint, errorType] = key.split(':');
      
      if (!endpoint || errorEndpoint === endpoint) {
        stats.totalErrors += count;
        stats.errorsByType[errorType as ApiErrorType] += count;
        
        const lastError = this.lastErrors.get(key);
        if (lastError && lastError > oneHourAgo) {
          stats.recentErrors += count;
        }
      }
    }

    return stats;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear error statistics
   */
  clearErrorStatistics(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

/**
 * Global API error handler instance
 */
export const apiErrorHandler = new ApiErrorHandler();

/**
 * Utility function to handle API errors
 */
export const handleApiError = (error: any, context: any = {}): Promise<ApiError> => {
  return apiErrorHandler.handleError(error, context);
};

/**
 * Utility function to execute API calls with error handling
 */
export const executeApiCall = <T>(
  apiCall: () => Promise<T>,
  context: any = {}
): Promise<ApiResponse<T>> => {
  return apiErrorHandler.executeWithErrorHandling(apiCall, context);
};