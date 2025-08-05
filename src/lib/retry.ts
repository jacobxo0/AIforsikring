/**
 * Retry Logic for AI Forsikringsguiden
 * Formål: Robust retry-mekanisme med eksponentiel backoff
 * Kilder: Network resilience patterns, exponential backoff algorithms
 */

import { logger } from './logger';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  retries?: number;
  /** Initial delay between retries in milliseconds */
  initialDelay?: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Jitter to add randomness to delays */
  jitter?: boolean;
  /** Function to determine if error should trigger retry */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Custom retry condition based on response */
  retryCondition?: (error: unknown) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
  /** Timeout for individual attempts in milliseconds */
  timeout?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: (error: Error, attempt: number) => {
    // Don't retry on client errors (4xx) except for specific cases
    if (error.name === 'HttpError') {
      const httpError = error as Error & { status?: number; statusCode?: number };
      const status = httpError.status || httpError.statusCode;
      
      if (status && status >= 400 && status < 500) {
        // Retry on rate limiting and specific client errors
        return status === 429 || status === 408 || status === 409;
      }
    }
    
    // Retry on network errors and server errors
    return error.name === 'NetworkError' || 
           error.name === 'TimeoutError' ||
           error.message.includes('fetch') ||
           error.message.includes('network') ||
           attempt <= 3;
  },
  retryCondition: (error: unknown) => {
    const errorObj = error as { isCancel?: boolean; isTimeout?: boolean };
    return !(errorObj.isCancel) && !(errorObj.isTimeout);
  },
  onRetry: (error: Error, attempt: number, delay: number) => {
    logger.warn({
      error: error.message,
      attempt,
      delay,
      nextRetryIn: `${delay}ms`
    }, `Retrying operation (attempt ${attempt})`);
  },
  timeout: 10000
};

/**
 * Custom error types for retry logic
 */
export class RetryError extends Error {
  public attempts: number;
  public lastError: Error;

  constructor(message: string, attempts: number, lastError: Error) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export class TimeoutError extends Error {
  constructor(timeout: number) {
    super(`Operation timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  delay = Math.min(delay, maxDelay);
  
  if (jitter) {
    // Add randomness: ±25% of the calculated delay
    const jitterAmount = delay * 0.25;
    delay += (Math.random() * 2 - 1) * jitterAmount;
  }
  
  return Math.max(delay, 0);
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a promise with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs)
    )
  ]);
}

/**
 * Generic retry function with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  const operationId = Math.random().toString(36).substr(2, 9);
  
  logger.debug({
    operationId,
    retries: config.retries,
    initialDelay: config.initialDelay,
    timeout: config.timeout
  }, 'Starting retry operation');

  for (let attempt = 1; attempt <= config.retries + 1; attempt++) {
    try {
      const startTime = Date.now();
      
      // Wrap operation with timeout
      const result = config.timeout 
        ? await withTimeout(operation(), config.timeout)
        : await operation();
      
      const duration = Date.now() - startTime;
      
      if (attempt > 1) {
        logger.info({
          operationId,
          attempt,
          duration,
          success: true
        }, `Operation succeeded on attempt ${attempt}`);
      }
      
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry this error
      if (!config.shouldRetry(lastError, attempt) || !config.retryCondition(lastError)) {
        logger.warn({
          operationId,
          attempt,
          error: lastError.message,
          reason: 'shouldRetry returned false'
        }, 'Not retrying operation');
        throw lastError;
      }
      
      // Don't retry on the last attempt
      if (attempt > config.retries) {
        break;
      }
      
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier,
        config.jitter
      );
      
      config.onRetry(lastError, attempt, delay);
      
      await sleep(delay);
    }
  }
  
  // If we get here, all retries failed
  logger.error({
    operationId,
    totalAttempts: config.retries + 1,
    finalError: lastError!.message
  }, 'All retry attempts failed');
  
  throw new RetryError(
    `Operation failed after ${config.retries + 1} attempts: ${lastError!.message}`,
    config.retries + 1,
    lastError!
  );
}

/**
 * Retry wrapper specifically for fetch operations
 */
export async function retryFetch(
  url: string,
  init: RequestInit = {},
  options: RetryOptions = {}
): Promise<Response> {
  const fetchOptions: RetryOptions = {
    retries: 3,
    initialDelay: 1000,
    shouldRetry: (error: Error, attempt: number) => {
      // Custom logic for fetch errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true; // Network error
      }
      return DEFAULT_RETRY_OPTIONS.shouldRetry(error, attempt);
    },
    onRetry: (error: Error, attempt: number, delay: number) => {
      logger.warn({
        url,
        method: init.method || 'GET',
        attempt,
        delay,
        error: error.message
      }, `Retrying fetch request`);
    },
    ...options
  };

  return retry(async () => {
    const response = await fetch(url, init);
    
    // Treat HTTP errors as retry-able based on status code
    if (!response.ok) {
      const httpError = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number; statusCode: number; name: string };
      httpError.name = 'HttpError';
      httpError.status = response.status;
      httpError.statusCode = response.status;
      throw httpError;
    }
    
    return response;
  }, fetchOptions);
}

/**
 * Retry wrapper for async functions with specific error handling
 */
export function retryAsync<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return async (...args: T): Promise<R> => {
    return retry(() => fn(...args), options);
  };
}

/**
 * Create a retry decorator for class methods
 */
export function Retry(options: RetryOptions = {}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      return retry(() => originalMethod.apply(this, args), options);
    };
    
    return descriptor;
  };
}

/**
 * Predefined retry configurations for common scenarios
 */
export const RetryConfigs = {
  /**
   * Fast retry for UI operations
   */
  Fast: {
    retries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5
  } as RetryOptions,

  /**
   * Standard retry for API calls
   */
  Standard: {
    retries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  } as RetryOptions,

  /**
   * Aggressive retry for critical operations
   */
  Aggressive: {
    retries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  } as RetryOptions,

  /**
   * Gentle retry for background operations
   */
  Gentle: {
    retries: 3,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitter: true
  } as RetryOptions,

  /**
   * Database operation retry
   */
  Database: {
    retries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    shouldRetry: (error: Error) => {
      // Retry on connection errors, timeouts, but not on constraint violations
      return error.message.includes('connection') ||
             error.message.includes('timeout') ||
             error.message.includes('network') ||
             !error.message.includes('constraint') &&
             !error.message.includes('unique') &&
             !error.message.includes('foreign key');
    }
  } as RetryOptions,

  /**
   * File operation retry
   */
  FileOperation: {
    retries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    shouldRetry: (error: Error) => {
      return error.message.includes('ENOENT') ||
             error.message.includes('EBUSY') ||
             error.message.includes('EMFILE') ||
             error.message.includes('ENFILE');
    }
  } as RetryOptions
} as const; 