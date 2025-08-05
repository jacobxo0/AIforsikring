/**
 * React Hook for Tryghedsscore API Integration
 * TASK 3.3: Erstatte mock functions med API calls
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { TryghedsData, DashboardError, TryghedsscoreApiResponse } from '@/types/dashboard'

interface UseTryghedsScoreOptions {
  onSuccess?: (data: TryghedsData) => void
  onError?: (error: DashboardError) => void
}

interface UseTryghedsScoreReturn {
  data: TryghedsData | null
  isLoading: boolean
  error: DashboardError | null
  calculateScore: (profile: any, policies?: any[]) => Promise<TryghedsData | null>
  retry: () => Promise<void>
  clearError: () => void
}

/**
 * Hook for calculating and managing tryghedsscore
 */
export const useTryghedsScore = (options: UseTryghedsScoreOptions = {}): UseTryghedsScoreReturn => {
  const [data, setData] = useState<TryghedsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<DashboardError | null>(null)
  const [lastRequest, setLastRequest] = useState<{ profile: any; policies?: any[] } | null>(null)

  const calculateScore = useCallback(async (profile: any, policies: any[] = []): Promise<TryghedsData | null> => {
    setIsLoading(true)
    setError(null)
    setLastRequest({ profile, policies })

    try {
      const response = await fetch('/api/tryghedsscore/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          policies,
          forceRecalculate: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to calculate score')
      }

      const result: TryghedsscoreApiResponse = await response.json()

      if (result.success && result.data) {
        setData(result.data)
        options.onSuccess?.(result.data)
        return result.data
      } else if (result.error) {
        setError(result.error)
        options.onError?.(result.error)
        return null
      } else {
        throw new Error('Invalid API response')
      }

    } catch (err) {
      const dashboardError: DashboardError = {
        type: 'network',
        message: err instanceof Error ? err.message : 'Network error occurred',
        code: 'API_ERROR',
        timestamp: new Date().toISOString(),
        retryable: true
      }

      setError(dashboardError)
      options.onError?.(dashboardError)
      
      console.error('Tryghedsscore calculation failed:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const retry = useCallback(async (): Promise<void> => {
    if (lastRequest) {
      await calculateScore(lastRequest.profile, lastRequest.policies)
    }
  }, [calculateScore, lastRequest])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    data,
    isLoading,
    error,
    calculateScore,
    retry,
    clearError
  }
}

/**
 * Hook for caching and optimistic updates
 */
export const useTryghedsScoreWithCache = (cacheKey: string, options: UseTryghedsScoreOptions = {}) => {
  const baseHook = useTryghedsScore(options)
  
  // Simple localStorage caching
  const getCachedData = useCallback((): TryghedsData | null => {
    try {
      const cached = localStorage.getItem(`tryghedsscore_${cacheKey}`)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }, [cacheKey])

  const setCachedData = useCallback((data: TryghedsData) => {
    try {
      localStorage.setItem(`tryghedsscore_${cacheKey}`, JSON.stringify(data))
    } catch {
      // Ignore localStorage errors
    }
  }, [cacheKey])

  const calculateScoreWithCache = useCallback(async (profile: any, policies: any[] = []): Promise<TryghedsData | null> => {
    // Try cache first
    const cached = getCachedData()
    if (cached && isRecentData(cached.lastUpdated)) {
      return cached
    }

    // Call API and cache result
    const result = await baseHook.calculateScore(profile, policies)
    if (result) {
      setCachedData(result)
    }

    return result
  }, [baseHook.calculateScore, getCachedData, setCachedData])

  return {
    ...baseHook,
    calculateScore: calculateScoreWithCache,
    getCachedData
  }
}

/**
 * Utility hook for real-time score monitoring
 */
export const useTryghedsScoreMonitoring = (profile: any, policies: any[] = [], intervalMs: number = 300000) => {
  const [autoRefresh, setAutoRefresh] = useState(false)
  const hook = useTryghedsScore()

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh || !profile) return

    const interval = setInterval(() => {
      hook.calculateScore(profile, policies)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [autoRefresh, profile, policies, intervalMs, hook.calculateScore])

  return {
    ...hook,
    autoRefresh,
    setAutoRefresh,
    startMonitoring: () => setAutoRefresh(true),
    stopMonitoring: () => setAutoRefresh(false)
  }
}

// Helper functions
function isRecentData(lastUpdated: string, maxAgeMinutes: number = 30): boolean {
  const updated = new Date(lastUpdated)
  const now = new Date()
  const ageMinutes = (now.getTime() - updated.getTime()) / (1000 * 60)
  return ageMinutes < maxAgeMinutes
}

export default useTryghedsScore 