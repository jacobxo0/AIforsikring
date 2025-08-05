/**
 * Runtime Validation Utilities
 * FASE 1: Runtime Safety - Type validation for API responses
 */

import { TryghedsData, ScoreBreakdown, DashboardError } from '@/types/dashboard'

// Runtime type guards for TryghedsData
export function isValidTryghedsData(obj: unknown): obj is TryghedsData {
  if (!obj || typeof obj !== 'object') return false
  
  const data = obj as TryghedsData
  
  // Validate required fields
  if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) return false
  if (!Array.isArray(data.breakdown) || data.breakdown.length === 0) return false
  if (!Array.isArray(data.improvement)) return false
  if (!data.lastUpdated || typeof data.lastUpdated !== 'string') return false
  
  // Validate breakdown array
  for (const breakdown of data.breakdown) {
    if (!isValidScoreBreakdown(breakdown)) return false
  }
  
  // Validate improvement array
  for (const improvement of data.improvement) {
    if (typeof improvement !== 'string') return false
  }
  
  return true
}

export function isValidScoreBreakdown(obj: unknown): obj is ScoreBreakdown {
  if (!obj || typeof obj !== 'object') return false
  
  const breakdown = obj as ScoreBreakdown
  
  if (typeof breakdown.category !== 'string' || breakdown.category.length === 0) return false
  if (typeof breakdown.score !== 'number' || breakdown.score < 0 || breakdown.score > 100) return false
  if (typeof breakdown.weight !== 'number' || breakdown.weight < 0 || breakdown.weight > 100) return false
  if (!Array.isArray(breakdown.issues)) return false
  
  // Validate issues array
  for (const issue of breakdown.issues) {
    if (typeof issue !== 'string') return false
  }
  
  return true
}

// Sanitize and validate API response
export function sanitizeTryghedsData(data: unknown): TryghedsData | null {
  if (!isValidTryghedsData(data)) {
    console.warn('Invalid TryghedsData received from API:', data)
    return null
  }
  
  // Additional sanitization
  const sanitized: TryghedsData = {
    ...data,
    score: Math.max(0, Math.min(100, Math.round(data.score))), // Ensure score is 0-100 integer
    breakdown: data.breakdown.map(breakdown => ({
      ...breakdown,
      score: Math.max(0, Math.min(100, Math.round(breakdown.score))),
      weight: Math.max(0, Math.min(100, Math.round(breakdown.weight))),
      issues: breakdown.issues.filter(issue => issue.trim().length > 0) // Remove empty issues
    })),
    improvement: data.improvement.filter(item => item.trim().length > 0) // Remove empty improvements
  }
  
  return sanitized
}

// Error classification helper
export function classifyError(error: unknown): DashboardError {
  const timestamp = new Date().toISOString()
  
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Netværksfejl - tjek din internetforbindelse',
      code: 'NETWORK_ERROR',
      timestamp,
      retryable: true
    }
  }
  
  // API errors
  if (error instanceof Error && error.message.includes('API')) {
    return {
      type: 'api',
      message: `API fejl: ${error.message}`,
      code: 'API_ERROR',
      timestamp,
      retryable: true
    }
  }
  
  // Validation errors
  if (error instanceof Error && error.message.includes('validation')) {
    return {
      type: 'validation',
      message: 'Data validering fejlede - prøv igen senere',
      code: 'VALIDATION_ERROR',
      timestamp,
      retryable: true
    }
  }
  
  // Generic errors
  const message = error instanceof Error ? error.message : 'Ukendt fejl opstod'
  return {
    type: 'calculation',
    message,
    code: 'UNKNOWN_ERROR',
    timestamp,
    retryable: true
  }
}

// Safe array operations
export function safeArrayReduce<T, R>(
  array: T[] | undefined | null, 
  reducer: (acc: R, current: T) => R, 
  initialValue: R
): R {
  if (!Array.isArray(array) || array.length === 0) {
    return initialValue
  }
  return array.reduce(reducer, initialValue)
}

// Safe number operations
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value
  }
  return fallback
}

// Safe string operations
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  return fallback
}

const validationUtils = {
  isValidTryghedsData,
  isValidScoreBreakdown,
  sanitizeTryghedsData,
  classifyError,
  safeArrayReduce,
  safeNumber,
  safeString
};

export default validationUtils; 