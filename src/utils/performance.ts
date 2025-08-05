/**
 * Performance Utilities
 * FASE 1: Performance Optimization - Memoized expensive operations
 */

// Memoized date formatter for Danish locale
class DateFormatterCache {
  private static instance: DateFormatterCache
  private formatters: Map<string, Intl.DateTimeFormat> = new Map()
  private cache: Map<string, string> = new Map()
  private readonly maxCacheSize = 100

  public static getInstance(): DateFormatterCache {
    if (!DateFormatterCache.instance) {
      DateFormatterCache.instance = new DateFormatterCache()
    }
    return DateFormatterCache.instance
  }

  private getFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = JSON.stringify(options)
    if (!this.formatters.has(key)) {
      this.formatters.set(key, new Intl.DateTimeFormat('da-DK', options))
    }
    return this.formatters.get(key)!
  }

  public formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Validate date
    if (isNaN(dateObj.getTime())) {
      return 'Ugyldig dato'
    }

    const cacheKey = `${dateObj.getTime()}_${JSON.stringify(options)}`
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    const formatter = this.getFormatter(options)
    const formatted = formatter.format(dateObj)

    // Manage cache size
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(cacheKey, formatted)
    return formatted
  }

  public clearCache(): void {
    this.cache.clear()
  }
}

// Optimized date formatting functions
export const formatTimestamp = (date: Date | string): string => {
  return DateFormatterCache.getInstance().formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export const formatDate = (date: Date | string): string => {
  return DateFormatterCache.getInstance().formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatTime = (date: Date | string): string => {
  return DateFormatterCache.getInstance().formatDate(date, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Memoized calculation helpers
const calculationCache = new Map<string, unknown>()

export function memoizeCalculation<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    
    if (calculationCache.has(key)) {
      return calculationCache.get(key)
    }

    const result = fn(...args)
    
    // Limit cache size
    if (calculationCache.size >= 50) {
      const firstKey = calculationCache.keys().next().value
      if (firstKey) {
        calculationCache.delete(firstKey)
      }
    }
    
    calculationCache.set(key, result)
    return result
  }) as T
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map()

  public static measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now()
    
    return fn().finally(() => {
      const duration = performance.now() - start
      this.recordMeasurement(name, duration)
    })
  }

  public static measure<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      return fn()
    } finally {
      const duration = performance.now() - start
      this.recordMeasurement(name, duration)
    }
  }

  private static recordMeasurement(name: string, duration: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    
    const measurements = this.measurements.get(name)!
    measurements.push(duration)
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift()
    }
  }

  public static getStats(name: string): {
    count: number
    average: number
    min: number
    max: number
    p95: number
  } | null {
    const measurements = this.measurements.get(name)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const count = measurements.length
    const sum = measurements.reduce((a, b) => a + b, 0)
    const average = sum / count
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95Index = Math.floor(count * 0.95)
    const p95 = sorted[p95Index]

    return { count, average, min, max, p95 }
  }

  public static clearStats(name?: string): void {
    if (name) {
      this.measurements.delete(name)
    } else {
      this.measurements.clear()
    }
  }
}

// Throttle utility for performance-critical operations
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}

// Memory-safe array operations
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Cleanup utilities
export function clearAllCaches(): void {
  DateFormatterCache.getInstance().clearCache()
  calculationCache.clear()
  PerformanceMonitor.clearStats()
}

const performanceUtils = {
  formatTimestamp,
  formatDate,
  formatTime,
  memoizeCalculation,
  PerformanceMonitor,
  throttle,
  chunkArray,
  clearAllCaches
};

export default performanceUtils; 