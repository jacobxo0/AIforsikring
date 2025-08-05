/**
 * Timeout Handler for AI Forsikringsguiden
 * Formål: Håndter timeouts og request cancellation med intelligent recovery
 */

import { logger } from './logger';

export interface TimeoutConfig {
  timeout: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  onTimeout?: (attemptNumber: number) => void;
  onRetry?: (attemptNumber: number, error: unknown) => void;
}

export class TimeoutError extends Error {
  public readonly timeout: number;
  public readonly attempt: number;
  
  constructor(message: string, timeout: number, attempt: number = 1) {
    super(message);
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.attempt = attempt;
  }
}

/**
 * Execute function with timeout and retry logic
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  const { timeout, retries = 0, retryDelay = 1000, signal, onTimeout, onRetry } = config;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new Error('Anmodning blev annulleret');
      }
      
      return await executeWithTimeout(fn, timeout, signal, attempt);
      
    } catch (error) {
      lastError = error;
      
      if (error instanceof TimeoutError) {
        logger.warn(`Timeout på attempt ${attempt}/${retries + 1}`, {
          timeout,
          attempt,
          function: fn.name
        });
        
        onTimeout?.(attempt);
        
        // Don't retry if this was the last attempt
        if (attempt === retries + 1) {
          break;
        }
        
        // Wait before retry
        if (retryDelay > 0) {
          await sleep(retryDelay * attempt); // Exponential backoff
        }
        
        onRetry?.(attempt, error);
        continue;
      }
      
      // Non-timeout errors shouldn't be retried
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Execute function with timeout
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  signal?: AbortSignal,
  attempt: number = 1
): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId: NodeJS.Timeout = setTimeout(() => {
      controller.abort();
      signal?.removeEventListener('abort', handleAbort);
      reject(new TimeoutError(
        `Anmodning tog for lang tid (>${timeout}ms)`,
        timeout,
        attempt
      ));
    }, timeout);
    
    // Handle external abort signal
    const handleAbort = () => {
      controller.abort();
      clearTimeout(timeoutId);
      reject(new Error('Anmodning blev annulleret'));
    };
    
    if (signal) {
      if (signal.aborted) {
        reject(new Error('Anmodning blev annulleret'));
        return;
      }
      signal.addEventListener('abort', handleAbort);
    }
    
    // Execute function
    fn()
      .then(result => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleAbort);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', handleAbort);
        reject(error);
      });
  });
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create AbortController with timeout
 */
export function createAbortController(timeout: number): {
  controller: AbortController;
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  const cleanup = () => {
    clearTimeout(timeoutId);
  };
  
  return {
    controller,
    signal: controller.signal,
    cleanup
  };
}

/**
 * Race multiple promises with timeout
 */
export async function raceWithTimeout<T>(
  promises: Promise<T>[],
  timeout: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(
        `Ingen af anmodningerne blev færdig inden for ${timeout}ms`,
        timeout
      ));
    }, timeout);
  });
  
  return Promise.race([...promises, timeoutPromise]);
}

/**
 * Batch execute with timeout and concurrency control
 */
export async function executeBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: {
    timeout: number;
    concurrency?: number;
    retries?: number;
    retryDelay?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<R[]> {
  const { timeout, concurrency = 5, retries = 0, retryDelay = 1000, onProgress } = options;
  const results: R[] = [];
  let completed = 0;
  
  // Process items in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await withTimeout(() => fn(item), {
          timeout,
          retries,
          retryDelay
        });
        
        completed++;
        onProgress?.(completed, items.length);
        
        return result;
      } catch (error) {
        logger.error('Batch execution failed for item', error, { item });
        throw error;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Predefined timeout configurations
 */
export const TimeoutConfigs = {
  // Fast operations (UI responsiveness)
  fast: {
    timeout: 5000,
    retries: 1,
    retryDelay: 500
  },
  
  // Standard operations
  standard: {
    timeout: 15000,
    retries: 2,
    retryDelay: 1000
  },
  
  // Long operations (AI, file processing)
  long: {
    timeout: 60000,
    retries: 3,
    retryDelay: 2000
  },
  
  // Database operations
  database: {
    timeout: 10000,
    retries: 2,
    retryDelay: 1000
  },
  
  // Network requests
  network: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1500
  }
};

/**
 * Utility for common timeout patterns
 */
export const TimeoutUtils = {
  /**
   * Execute with fast timeout
   */
  fast: <T>(fn: () => Promise<T>) => 
    withTimeout(fn, TimeoutConfigs.fast),
  
  /**
   * Execute with standard timeout
   */
  standard: <T>(fn: () => Promise<T>) => 
    withTimeout(fn, TimeoutConfigs.standard),
  
  /**
   * Execute with long timeout
   */
  long: <T>(fn: () => Promise<T>) => 
    withTimeout(fn, TimeoutConfigs.long),
  
  /**
   * Execute database operation with timeout
   */
  database: <T>(fn: () => Promise<T>) => 
    withTimeout(fn, TimeoutConfigs.database),
  
  /**
   * Execute network request with timeout
   */
  network: <T>(fn: () => Promise<T>) => 
    withTimeout(fn, TimeoutConfigs.network)
}; 