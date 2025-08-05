/**
 * Rate Limiter for AI Forsikringsguiden
 * Formål: Beskyt systemet mod overbelastning med intelligent rate limiting
 */


export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private windows = new Map<string, number[]>();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: 100,
      windowMs: 60000, // 1 minut
      message: 'For mange anmodninger. Prøv igen senere.',
      ...config
    };
  }

  checkLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    const window = this.getWindow(identifier, now);
    
    // Remove old entries
    const cutoff = now - this.config.windowMs;
    const validRequests = window.filter(timestamp => timestamp > cutoff);
    this.windows.set(identifier, validRequests);
    
    if (validRequests.length < this.config.maxRequests) {
      validRequests.push(now);
      this.windows.set(identifier, validRequests);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - validRequests.length,
        resetTime: now + this.config.windowMs
      };
    }

    const oldestRequest = Math.min(...validRequests);
    const resetTime = oldestRequest + this.config.windowMs;
    
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000)
    };
  }

  private getWindow(key: string, _: number): number[] {
    return this.windows.get(key) || [];
  }
}

export class RateLimitError extends Error {
  public readonly retryAfter?: number;
  
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export const RateLimiters = {
  api: new RateLimiter({
    maxRequests: 100,
    windowMs: 60000,
    message: 'For mange API kald. Prøv igen om et minut.'
  }),

  ai: new RateLimiter({
    maxRequests: 20,
    windowMs: 60000,
    message: 'For mange AI anmodninger. Vent venligst.'
  }),

  upload: new RateLimiter({
    maxRequests: 10,
    windowMs: 300000,
    message: 'For mange uploads. Prøv igen om 5 minutter.'
  }),

  auth: new RateLimiter({
    maxRequests: 5,
    windowMs: 900000,
    message: 'For mange login forsøg. Vent 15 minutter.'
  })
};

/**
 * Get rate limiter stats for monitoring
 */
export function getRateLimiterStats(): Record<string, any> {
  return {
    api: { algorithm: 'SLIDING_WINDOW', maxRequests: 100, windowMs: 60000 },
    ai: { algorithm: 'TOKEN_BUCKET', maxRequests: 20, windowMs: 60000 },
    upload: { algorithm: 'FIXED_WINDOW', maxRequests: 10, windowMs: 300000 },
    auth: { algorithm: 'SLIDING_WINDOW', maxRequests: 5, windowMs: 900000 },
    chat: { algorithm: 'TOKEN_BUCKET', maxRequests: 30, windowMs: 60000 }
  };
}

/**
 * Utility function for easy rate limiting
 */
export async function withRateLimit<T>(
  rateLimiter: RateLimiter,
  identifier: string,
  fn: () => Promise<T>
): Promise<T> {
  const result = rateLimiter.checkLimit(identifier);
  
  if (!result.allowed) {
    throw new RateLimitError(
      'Rate limit overskredet',
      result.retryAfter
    );
  }
  
  return await fn();
} 