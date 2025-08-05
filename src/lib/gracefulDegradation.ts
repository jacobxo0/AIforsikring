/**
 * Graceful Degradation for AI Forsikringsguiden
 * Formål: Fallback strategier når services fejler
 */

import { logger } from './logger';
import { CircuitBreakers } from './circuitBreaker';

export interface FallbackConfig<T> {
  primaryService: () => Promise<T>;
  fallbackService?: () => Promise<T>;
  staticFallback?: T;
  timeout?: number;
  retries?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

export class GracefulDegradationService {
  private cache = new Map<string, { data: any; expires: number }>();
  
  /**
   * Execute with fallback strategy
   */
  async executeWithFallback<T>(config: FallbackConfig<T>): Promise<T> {
    // Try cache first if available
    if (config.cacheKey) {
      const cached = this.getFromCache<T>(config.cacheKey);
      if (cached !== null) {
        logger.debug('Using cached fallback data', { cacheKey: config.cacheKey });
        return cached;
      }
    }

    // Try primary service
    try {
      const result = await this.executeWithTimeout(
        config.primaryService,
        config.timeout || 10000
      );
      
      // Cache successful result
      if (config.cacheKey && config.cacheTTL) {
        this.setCache(config.cacheKey, result, config.cacheTTL);
      }
      
      return result;
    } catch (primaryError) {
      logger.warn('Primary service failed, trying fallback', primaryError);
      
      // Try fallback service
      if (config.fallbackService) {
        try {
          const fallbackResult = await this.executeWithTimeout(
            config.fallbackService,
            (config.timeout || 10000) / 2
          );
          
          logger.info('Fallback service succeeded');
          return fallbackResult;
        } catch (fallbackError) {
          logger.error('Fallback service also failed', fallbackError);
        }
      }
      
      // Use static fallback
      if (config.staticFallback !== undefined) {
        logger.info('Using static fallback data');
        return config.staticFallback;
      }
      
      // No fallback available
      throw primaryError;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }
}

/**
 * Predefined degradation strategies
 */
export const DegradationStrategies = {
  /**
   * AI Chat fallback
   */
  aiChat: async (userMessage: string): Promise<string> => {
    const degradation = new GracefulDegradationService();
    
    return degradation.executeWithFallback({
      primaryService: async () => {
        // Primary AI service
        return await fetch('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({ message: userMessage })
        }).then(r => r.json());
      },
      fallbackService: async () => {
        // Simpler AI or pre-defined responses
        return {
          message: 'Undskyld, AI-systemet er midlertidigt utilgængeligt. Prøv igen senere eller kontakt support.',
          type: 'fallback'
        };
      },
      staticFallback: {
        message: 'Systemet er midlertidigt utilgængeligt. Kontakt venligst support.',
        type: 'static'
      },
      timeout: 15000,
      cacheKey: `ai_fallback_${userMessage.slice(0, 50)}`,
      cacheTTL: 300000 // 5 minutter
    });
  },

  /**
   * Document analysis fallback
   */
  documentAnalysis: async (documentId: string): Promise<any> => {
    const degradation = new GracefulDegradationService();
    
    return degradation.executeWithFallback({
      primaryService: async () => {
        return await fetch(`/api/documents/${documentId}/analyze`).then(r => r.json());
      },
      fallbackService: async () => {
        // Basic document info without AI analysis
        return await fetch(`/api/documents/${documentId}`).then(r => r.json());
      },
      staticFallback: {
        id: documentId,
        status: 'pending',
        message: 'Dokument analyse er midlertidigt utilgængelig',
        analysis: null
      },
      timeout: 30000
    });
  },

  /**
   * Search fallback
   */
  search: async (query: string): Promise<any[]> => {
    const degradation = new GracefulDegradationService();
    
    return degradation.executeWithFallback({
      primaryService: async () => {
        // Advanced search with AI
        return await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=advanced`)
          .then(r => r.json());
      },
      fallbackService: async () => {
        // Basic text search
        return await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=basic`)
          .then(r => r.json());
      },
      staticFallback: [],
      timeout: 5000,
      cacheKey: `search_${query}`,
      cacheTTL: 600000 // 10 minutter
    });
  }
};

/**
 * Global degradation service instance
 */
export const degradationService = new GracefulDegradationService();

/**
 * Higher-order function for wrapping services with degradation
 */
export function withDegradation<T extends any[], R>(
  primaryFn: (...args: T) => Promise<R>,
  fallbackFn?: (...args: T) => Promise<R>,
  staticFallback?: R
) {
  return async (...args: T): Promise<R> => {
    return degradationService.executeWithFallback({
      primaryService: () => primaryFn(...args),
      fallbackService: fallbackFn ? () => fallbackFn(...args) : undefined,
      staticFallback
    });
  };
} 