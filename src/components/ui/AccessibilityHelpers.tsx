/**
 * Accessibility Helper Components
 * Sprint 2: Accessibility compliance improvements
 */

'use client'

import React, { useEffect, useRef } from 'react'

// Screen reader only text component
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">
    {children}
  </span>
)

// Skip to main content link
export const SkipToMain: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50"
  >
    Spring til hovedindhold
  </a>
)

// Accessible button with proper states
export const AccessibleButton: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary'
  ariaLabel?: string
  ariaDescribedBy?: string
  className?: string
}> = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false, 
  variant = 'primary',
  ariaLabel,
  ariaDescribedBy,
  className = ''
}) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100"
  }

  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading && <ScreenReaderOnly>Indlæser, vent venligst</ScreenReaderOnly>}
      {children}
    </button>
  )
}

// Progress indicator with accessibility
export const AccessibleProgress: React.FC<{
  value: number
  max?: number
  label: string
  showValue?: boolean
  className?: string
}> = ({ value, max = 100, label, showValue = true, className = '' }) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={`progress-${label}`} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        {showValue && (
          <span className="text-sm text-gray-500" aria-live="polite">
            {value}/{max}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${label}: ${value} ud af ${max}`}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Live region for announcements
export const LiveRegion: React.FC<{
  message?: string
  politeness?: 'polite' | 'assertive'
  className?: string
}> = ({ message, politeness = 'polite', className = '' }) => (
  <div
    aria-live={politeness}
    aria-atomic="true"
    className={`sr-only ${className}`}
  >
    {message}
  </div>
)

// Focus management hook
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }

  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }

  const focusElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
    }
  }

  return { saveFocus, restoreFocus, focusElement }
}

// Keyboard navigation hook
export const useKeyboardNavigation = (
  items: string[], 
  onSelect: (index: number) => void,
  isEnabled: boolean = true
) => {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  React.useEffect(() => {
    if (!isEnabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1))
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          if (focusedIndex >= 0) {
            onSelect(focusedIndex)
          }
          break
        case 'Escape':
          event.preventDefault()
          setFocusedIndex(-1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items.length, focusedIndex, onSelect, isEnabled])

  return { focusedIndex, setFocusedIndex }
}

// Accessible modal wrapper
export const AccessibleModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}> = ({ isOpen, onClose, title, children, className = '' }) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const { saveFocus, restoreFocus } = useFocusManagement()

  useEffect(() => {
    if (isOpen) {
      saveFocus()
      // Focus modal content
      setTimeout(() => {
        modalRef.current?.focus()
      }, 100)
    } else {
      restoreFocus()
    }
  }, [isOpen, saveFocus, restoreFocus])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"
          onClick={onClose}
        />
        
        <div
          ref={modalRef}
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${className}`}
          tabIndex={-1}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h2 id="modal-title" className="text-lg font-medium text-gray-900 mb-4">
              {title}
            </h2>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default {
  ScreenReaderOnly,
  SkipToMain,
  AccessibleButton,
  AccessibleProgress,
  LiveRegion,
  useFocusManagement,
  useKeyboardNavigation,
  AccessibleModal
} 