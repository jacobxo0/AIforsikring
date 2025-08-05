/**
 * Loading State Components and Skeletons
 * TASK 2.2: Tilføj loading states til alle async operationer
 */

'use client'

import React from 'react'

// Generic loading spinner
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'white' | 'gray'
  text?: string
}> = ({ size = 'md', color = 'blue', text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  }

  return (
    <div className="flex items-center justify-center gap-2" data-testid="loading-spinner">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}
        role="status"
        aria-label="Loading"
      >
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
      {text && (
        <span className={`text-sm ${colorClasses[color]} font-medium`}>
          {text}
        </span>
      )}
    </div>
  )
}

// Skeleton for score ring
export const ScoreRingSkeleton: React.FC = () => (
  <div className="flex items-center justify-center">
    <div className="relative w-48 h-48 animate-pulse">
      <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
      <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
        <div className="w-12 h-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
)

// Skeleton for metric cards
export const MetricCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>
      <div className="ml-4 flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
)

// Skeleton for breakdown categories
export const CategoryBreakdownSkeleton: React.FC = () => (
  <div className="border rounded-lg p-4 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-5 bg-gray-200 rounded w-32"></div>
      <div className="h-5 bg-gray-200 rounded w-12"></div>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
    <div className="h-3 bg-gray-200 rounded w-20"></div>
  </div>
)

// Complete dashboard skeleton
export const TryghedsDashboardSkeleton: React.FC = () => (
  <div className="space-y-6" data-testid="dashboard-skeleton">
    {/* Header skeleton */}
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      
      {/* Score ring skeleton */}
      <ScoreRingSkeleton />
      
      {/* Quick insights skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
      
      {/* Toggle button skeleton */}
      <div className="h-8 bg-gray-200 rounded w-40 mx-auto mt-6 animate-pulse"></div>
    </div>
  </div>
)

// Inline loading button state
export const LoadingButton: React.FC<{
  loading: boolean
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  className?: string
}> = ({ 
  loading, 
  children, 
  onClick, 
  disabled = false, 
  variant = 'primary',
  className = ''
}) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300"
  }
  
  const isDisabled = loading || disabled

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading && <LoadingSpinner size="sm" color="white" />}
      {loading ? 'Indlæser...' : children}
    </button>
  )
}

// Progress with text
export const ProgressWithText: React.FC<{
  progress: number
  total: number
  text: string
  showPercentage?: boolean
}> = ({ progress, total, text, showPercentage = true }) => {
  const percentage = Math.min((progress / total) * 100, 100)
  // Round to nearest 5 to match CSS classes
  const roundedPercentage = Math.round(percentage / 5) * 5
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{text}</span>
        {showPercentage && (
          <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 progress-bar"
          data-width={roundedPercentage}
        />
      </div>
    </div>
  )
}

// Delayed loading state (shows after delay to prevent flicker)
export const DelayedLoading: React.FC<{
  delay?: number
  children: React.ReactNode
}> = ({ delay = 300, children }) => {
  const [showLoading, setShowLoading] = React.useState(false)
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(true)
    }, delay)
    
    return () => clearTimeout(timer)
  }, [delay])
  
  if (!showLoading) return null
  
  return <>{children}</>
}

// Fallback components for various states
export const EmptyState: React.FC<{
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}> = ({ 
  icon = '📊', 
  title, 
  description, 
  action 
}) => (
  <div className="text-center py-12">
    <div className="text-4xl mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    {description && (
      <p className="text-gray-600 mb-4">{description}</p>
    )}
    {action}
  </div>
)

export default {
  LoadingSpinner,
  ScoreRingSkeleton,
  MetricCardSkeleton,
  CategoryBreakdownSkeleton,
  TryghedsDashboardSkeleton,
  LoadingButton,
  ProgressWithText,
  DelayedLoading,
  EmptyState
} 