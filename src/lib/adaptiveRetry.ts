/**
 * Adaptive Retry System for AI Forsikringsguiden
 * Formål: Intelligent retry strategy som lærer af failure patterns
 */

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

export interface RetryAttempt {
  attempt: number;
  timestamp: number;
  error: Error;
  delay: number;
  success: boolean;
}

export interface RetryPattern {
  operation: string;
  errorType: string;
  successRate: number;
  averageRetries: number;
  bestDelay: number;
  lastUpdated: number;
  totalAttempts: number;
  totalSuccesses: number;
}

export class AdaptiveRetryManager {
  private patterns = new Map<string, any>();
  private attempts = new Map<string, RetryAttempt[]>();
  private defaultConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  };

  /**
   * Execute operation with adaptive retry
   */
  async execute<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = 1000 * Math.pow(2, attempt - 1);
        logger.warn(`Retry attempt ${attempt} failed`, { operation, delay });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Calculate adaptive delay based on learned patterns
   */
  private calculateAdaptiveDelay(
    operation: string,
    attempt: number,
    error: Error,
    config: typeof this.defaultConfig
  ): number {
    const pattern = this.getPattern(operation, error.constructor.name);
    
    let delay: number;
    
    if (pattern && pattern.totalAttempts > 10) {
      // Use learned optimal delay
      delay = pattern.bestDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    } else {
      // Use standard exponential backoff
      delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    }
    
    // Apply jitter if enabled
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    // Respect max delay
    delay = Math.min(delay, config.maxDelay);
    
    // Consider error type for adjustment
    delay = this.adjustDelayForErrorType(delay, error);
    
    return Math.floor(delay);
  }

  /**
   * Adjust delay based on error type
   */
  private adjustDelayForErrorType(baseDelay: number, error: Error): number {
    const errorType = error.constructor.name.toLowerCase();
    
    // Rate limiting errors need longer delays
    if (errorType.includes('rate') || errorType.includes('limit')) {
      return baseDelay * 2;
    }
    
    // Timeout errors might benefit from shorter delays
    if (errorType.includes('timeout')) {
      return baseDelay * 0.8;
    }
    
    // Network errors benefit from standard delays
    if (errorType.includes('network') || errorType.includes('connection')) {
      return baseDelay;
    }
    
    // Default
    return baseDelay;
  }

  /**
   * Record retry attempt
   */
  private recordAttempt(
    operation: string,
    attempt: number,
    error: Error | null,
    delay: number,
    success: boolean
  ): void {
    const key = `${operation}:${error?.constructor.name || 'success'}`;
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, []);
    }
    
    const attempts = this.attempts.get(key)!;
    attempts.push({
      attempt,
      timestamp: Date.now(),
      error: error || new Error('Success'),
      delay,
      success
    });
    
    // Keep only last 100 attempts per operation
    if (attempts.length > 100) {
      attempts.splice(0, attempts.length - 100);
    }
  }

  /**
   * Update retry pattern based on results
   */
  private updatePattern(operation: string, attempts: number, success: boolean): void {
    const errorType = success ? 'success' : 'error';
    const key = `${operation}:${errorType}`;
    
    let pattern = this.patterns.get(key);
    
    if (!pattern) {
      pattern = {
        operation,
        errorType,
        successRate: 0,
        averageRetries: 0,
        bestDelay: this.defaultConfig.baseDelay,
        lastUpdated: Date.now(),
        totalAttempts: 0,
        totalSuccesses: 0
      };
    }
    
    // Update statistics
    pattern.totalAttempts++;
    if (success) {
      pattern.totalSuccesses++;
    }
    
    pattern.successRate = pattern.totalSuccesses / pattern.totalAttempts;
    pattern.averageRetries = this.calculateAverageRetries(key);
    pattern.lastUpdated = Date.now();
    
    // Update best delay based on successful attempts
    if (success) {
      pattern.bestDelay = this.calculateOptimalDelay(key);
    }
    
    this.patterns.set(key, pattern);
    
    logger.debug('Retry pattern updated', {
      operation,
      errorType,
      successRate: pattern.successRate,
      averageRetries: pattern.averageRetries
    });
  }

  /**
   * Calculate average retries for operation
   */
  private calculateAverageRetries(key: string): number {
    const attempts = this.attempts.get(key);
    if (!attempts || attempts.length === 0) return 0;
    
    const successfulAttempts = attempts.filter(a => a.success);
    if (successfulAttempts.length === 0) return 0;
    
    const totalRetries = successfulAttempts.reduce((sum, a) => sum + a.attempt, 0);
    return totalRetries / successfulAttempts.length;
  }

  /**
   * Calculate optimal delay based on successful attempts
   */
  private calculateOptimalDelay(key: string): number {
    const attempts = this.attempts.get(key);
    if (!attempts || attempts.length === 0) return this.defaultConfig.baseDelay;
    
    const successfulAttempts = attempts
      .filter(a => a.success && a.delay > 0)
      .sort((a, b) => a.delay - b.delay);
    
    if (successfulAttempts.length === 0) return this.defaultConfig.baseDelay;
    
    // Use median delay of successful attempts
    const midIndex = Math.floor(successfulAttempts.length / 2);
    return successfulAttempts[midIndex].delay;
  }

  /**
   * Get pattern for operation and error type
   */
  private getPattern(operation: string, errorType: string): RetryPattern | undefined {
    return this.patterns.get(`${operation}:${errorType}`);
  }

  /**
   * Get retry recommendations for operation
   */
  getRecommendations(operation: string): {
    recommendedMaxRetries: number;
    recommendedBaseDelay: number;
    successRate: number;
    averageRetries: number;
  } {
    const patterns = Array.from(this.patterns.values())
      .filter(p => p.operation === operation);
    
    if (patterns.length === 0) {
      return {
        recommendedMaxRetries: this.defaultConfig.maxRetries,
        recommendedBaseDelay: this.defaultConfig.baseDelay,
        successRate: 0,
        averageRetries: 0
      };
    }
    
    // Calculate weighted averages
    const totalAttempts = patterns.reduce((sum, p) => sum + p.totalAttempts, 0);
    const weightedSuccessRate = patterns.reduce(
      (sum, p) => sum + (p.successRate * p.totalAttempts), 0
    ) / totalAttempts;
    
    const weightedAverageRetries = patterns.reduce(
      (sum, p) => sum + (p.averageRetries * p.totalAttempts), 0
    ) / totalAttempts;
    
    const optimalDelay = patterns.reduce(
      (sum, p) => sum + (p.bestDelay * p.totalAttempts), 0
    ) / totalAttempts;
    
    return {
      recommendedMaxRetries: Math.ceil(weightedAverageRetries * 1.5),
      recommendedBaseDelay: Math.floor(optimalDelay),
      successRate: weightedSuccessRate,
      averageRetries: weightedAverageRetries
    };
  }

  /**
   * Get all retry statistics
   */
  getStats(): {
    totalOperations: number;
    patterns: RetryPattern[];
    topFailingOperations: Array<{ operation: string; failureRate: number }>;
  } {
    const patterns = Array.from(this.patterns.values());
    
    // Group by operation
    const operationStats = new Map<string, { total: number; failures: number }>();
    
    for (const pattern of patterns) {
      if (!operationStats.has(pattern.operation)) {
        operationStats.set(pattern.operation, { total: 0, failures: 0 });
      }
      
      const stats = operationStats.get(pattern.operation)!;
      stats.total += pattern.totalAttempts;
      stats.failures += pattern.totalAttempts - pattern.totalSuccesses;
    }
    
    // Calculate failure rates and sort
    const topFailingOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        failureRate: stats.failures / stats.total
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 10);
    
    return {
      totalOperations: operationStats.size,
      patterns,
      topFailingOperations
    };
  }

  /**
   * Clear old patterns to prevent memory bloat
   */
  cleanup(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.lastUpdated < oneWeekAgo) {
        this.patterns.delete(key);
        this.attempts.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} old retry patterns`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const adaptiveRetry = new AdaptiveRetryManager(); 