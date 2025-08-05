/**
 * Debounce Hook for Performance Optimization
 * FASE 1: Performance - Prevent excessive API calls and optimize user interactions
 */

import { useCallback, useRef, useEffect, useState } from 'react'

// Generic debounce hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    }) as T,
    [delay]
  )

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return [debouncedCallback, cancel]
}

// Specialized debounce for async functions with loading states
export function useAsyncDebounce<T extends (...args: any[]) => Promise<any>>(
  asyncCallback: T,
  delay: number = 500
): [T, boolean, () => void] {
  const [isLoading, setIsLoading] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const wrappedCallback = useCallback(
    async (...args: Parameters<T>) => {
      if (isLoading) return // Prevent concurrent calls

      setIsLoading(true)
      try {
        const result = await asyncCallback(...args)
        if (isMountedRef.current) {
          setIsLoading(false)
        }
        return result
      } catch (error) {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
        throw error
      }
    },
    [asyncCallback, isLoading]
  )

  const [debouncedCallback, cancel] = useDebounce(wrappedCallback, delay)

  const cancelWithLoading = useCallback(() => {
    cancel()
    if (isMountedRef.current) {
      setIsLoading(false)
    }
  }, [cancel])

  return [debouncedCallback as T, isLoading, cancelWithLoading]
}

// Hook for debouncing state updates
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [immediateValue, setImmediateValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  const [updateDebouncedValue] = useDebounce(setDebouncedValue, delay)

  const setValue = useCallback(
    (value: T) => {
      setImmediateValue(value)
      updateDebouncedValue(value)
    },
    [updateDebouncedValue]
  )

  return [immediateValue, debouncedValue, setValue]
}

export default { useDebounce, useAsyncDebounce, useDebouncedState } 