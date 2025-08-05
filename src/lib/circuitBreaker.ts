/**
 * Circuit Breaker Pattern for AI Forsikringsguiden
 * Formål: Beskyt systemet mod fejlende eksterne services med intelligent failover
 */

import { logger } from './logger';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  monitoringWindow: number;
  name: string;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  requestCount: number;
  rejectedCount: number;
}

/**
 * Circuit Breaker implementering
 */
export class CircuitBreaker<T = any> {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private requestCount = 0;
  private rejectedCount = 0;
  private nextAttempt = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 10000,
      resetTimeout: 60000,
      monitoringWindow: 300000,
      name: 'default',
      ...config
    };

    logger.info(`Circuit breaker '${this.config.name}' initialized`, {
      config: this.config
    });
  }

  /**
   * Eksekver function med circuit breaker beskyttelse
   */
  async execute<R = T>(fn: () => Promise<R>): Promise<R> {
    this.requestCount++;

    // Tjek om circuit breaker er OPEN
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.rejectedCount++;
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        
        logger.warn(`Circuit breaker '${this.config.name}' rejected request`, {
          state: this.state,
          waitTime,
          rejectedCount: this.rejectedCount
        });

        throw new CircuitBreakerError(
          `Service utilgængelig. Prøv igen om ${waitTime} sekunder.`,
          'CIRCUIT_OPEN'
        );
      } else {
        // Prøv HALF_OPEN state
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        
        logger.info(`Circuit breaker '${this.config.name}' entering HALF_OPEN state`);
      }
    }

    try {
      // Eksekver funktionen med timeout
      const result = await this.executeWithTimeout(fn);
      
      // Success - update counters
      this.onSuccess();
      return result;

    } catch (error) {
      // Failure - update counters  
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Eksekver function med timeout
   */
  private async executeWithTimeout<R>(fn: () => Promise<R>): Promise<R> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CircuitBreakerError(
          `Anmodning tog for lang tid (>${this.config.timeout}ms)`,
          'TIMEOUT'
        ));
      }, this.config.timeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Håndter successful eksekveringer
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.rejectedCount = 0;
        
        logger.info(`Circuit breaker '${this.config.name}' recovered to CLOSED state`, {
          successCount: this.successCount,
          failureCount: this.failureCount
        });
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Håndter fejlede eksekveringer
   */
  private onFailure(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.error(`Circuit breaker '${this.config.name}' registered failure`, error, {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      state: this.state
    });

    if (this.state === 'HALF_OPEN') {
      // Return to OPEN on any failure in HALF_OPEN
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      
      logger.warn(`Circuit breaker '${this.config.name}' returned to OPEN state`);
      
    } else if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      // Trip to OPEN when threshold reached
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.resetTimeout;
      
      logger.error(`Circuit breaker '${this.config.name}' tripped to OPEN state`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold
      });
    }
  }

  /**
   * Få nuværende statistikker
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      requestCount: this.requestCount,
      rejectedCount: this.rejectedCount
    };
  }

  /**
   * Reset circuit breaker til initial state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.rejectedCount = 0;
    this.nextAttempt = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    
    logger.info(`Circuit breaker '${this.config.name}' manually reset`);
  }

  /**
   * Force circuit breaker til OPEN state
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.config.resetTimeout;
    
    logger.warn(`Circuit breaker '${this.config.name}' manually forced to OPEN state`);
  }

  /**
   * Tjek om circuit breaker er tilgængelig
   */
  isAvailable(): boolean {
    return this.state === 'CLOSED' || 
           (this.state === 'HALF_OPEN') ||
           (this.state === 'OPEN' && Date.now() >= this.nextAttempt);
  }
}

/**
 * Circuit Breaker fejl klasse
 */
export class CircuitBreakerError extends Error {
  public readonly type: 'CIRCUIT_OPEN' | 'TIMEOUT' | 'THRESHOLD_EXCEEDED';
  
  constructor(message: string, type: 'CIRCUIT_OPEN' | 'TIMEOUT' | 'THRESHOLD_EXCEEDED') {
    super(message);
    this.name = 'CircuitBreakerError';
    this.type = type;
  }
}

/**
 * Predefinerede circuit breakers for forskellige services
 */
export const CircuitBreakers = {
  // OpenAI API calls
  openai: new CircuitBreaker({
    name: 'openai-api',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 120000
  }),

  // Supabase database calls
  database: new CircuitBreaker({
    name: 'supabase-db',
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 15000,
    resetTimeout: 60000
  }),

  // Document processing
  documentProcessor: new CircuitBreaker({
    name: 'document-processor',
    failureThreshold: 4,
    successThreshold: 2,
    timeout: 45000,
    resetTimeout: 180000
  }),

  // External insurance APIs
  insuranceApi: new CircuitBreaker({
    name: 'insurance-api',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 20000,
    resetTimeout: 300000
  }),

  // Email service
  email: new CircuitBreaker({
    name: 'email-service',
    failureThreshold: 6,
    successThreshold: 3,
    timeout: 10000,
    resetTimeout: 900000 // 15 minutter
  })
};

/**
 * Health check for alle circuit breakers
 */
export function getCircuitBreakerHealthStatus(): Record<string, CircuitBreakerStats> {
  return {
    openai: CircuitBreakers.openai.getStats(),
    database: CircuitBreakers.database.getStats(),
    documentProcessor: CircuitBreakers.documentProcessor.getStats(),
    insuranceApi: CircuitBreakers.insuranceApi.getStats(),
    email: CircuitBreakers.email.getStats()
  };
}

/**
 * Wrapper function for easy circuit breaker usage
 */
export async function withCircuitBreaker<T>(
  circuitBreaker: CircuitBreaker,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await circuitBreaker.execute(fn);
  } catch (error) {
    if (error instanceof CircuitBreakerError && fallback) {
      logger.info(`Using fallback for circuit breaker '${circuitBreaker.getStats().state}'`);
      return await fallback();
    }
    throw error;
  }
} 