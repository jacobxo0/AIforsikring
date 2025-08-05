/**
 * React Error Boundary for graceful error handling
 * TASK 2.1: Implementer React Error Boundaries
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { DashboardError } from '@/types/dashboard'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; errorId: string; onRetry: () => void }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  context?: string
}

// Default fallback component
const DefaultErrorFallback: React.FC<{
  error: Error
  errorId: string
  onRetry: () => void
  context?: string
}> = ({ error, errorId, onRetry, context = 'komponent' }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
    <div className="flex items-center mb-4">
      <div className="flex-shrink-0">
        <span className="text-2xl">⚠️</span>
      </div>
      <div className="ml-4">
        <h3 className="text-lg font-semibold text-red-900">
          Der opstod en fejl i {context}
        </h3>
        <p className="text-red-700 text-sm mt-1">
          Vi arbejder på at løse problemet. Prøv venligst igen.
        </p>
      </div>
    </div>
    
    <div className="bg-red-100 rounded p-3 mb-4">
      <details className="text-sm">
        <summary className="font-medium text-red-800 cursor-pointer">
          Tekniske detaljer (fejl-ID: {errorId})
        </summary>
        <pre className="mt-2 text-xs text-red-700 overflow-auto">
          {error.message}
        </pre>
      </details>
    </div>
    
    <div className="flex gap-3">
      <button
        onClick={onRetry}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
      >
        🔄 Prøv igen
      </button>
      <button
        onClick={() => window.location.reload()}
        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
      >
        🔄 Genindlæs side
      </button>
    </div>
  </div>
)

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Create structured error for potential API reporting
    const dashboardError: DashboardError = {
      type: 'calculation', // Default type, can be customized
      message: error.message,
      code: error.name,
      timestamp: new Date().toISOString(),
      retryable: true
    }
    
    // Update state with error info
    this.setState({
      errorInfo,
      error
    })
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // reportError(dashboardError, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          context={this.props.context}
        />
      )
    }

    return this.props.children
  }
}

// Specialized error boundary for dashboard components
export const DashboardErrorBoundary: React.FC<{
  children: ReactNode
  componentName?: string
}> = ({ children, componentName = 'dashboard' }) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Enhanced logging for dashboard errors
    console.error(`Dashboard Error in ${componentName}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <ErrorBoundary
      onError={handleError}
      context={`${componentName} dashboard`}
    >
      {children}
    </ErrorBoundary>
  )
}

// Hook for error reporting without boundaries
export const useErrorReporting = () => {
  const reportError = (error: Error | string, context?: string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    console.error(`Manual Error Report [${context || 'Unknown'}]:`, errorObj)
    
    // TODO: Send to error tracking service
    // Example: Sentry.captureException(errorObj, { tags: { context } })
  }
  
  return { reportError }
}

export default ErrorBoundary 