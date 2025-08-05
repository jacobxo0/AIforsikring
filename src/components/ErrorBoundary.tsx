'use client'

/**
 * Global Error Boundary for AI Forsikringsguiden
 * Formål: Fang og håndter uventede fejl med brugervenlig fallback UI
 * Kilder: React Error Boundary, logging system
 */

import React, { ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
}

/**
 * Global Error Boundary Component
 * Fanger JavaScript fejl hvor som helst i komponent-træet
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorId } = this.state
    
    // Log error with full context
    logger.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      errorId,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    }, 'React Error Boundary caught an error')

    // Call custom error handler if provided
    if (this.props.onError && errorId) {
      this.props.onError(error, errorInfo, errorId)
    }

    // Update state with error info
    this.setState({
      errorInfo
    })
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    logger.info({
      errorId: this.state.errorId,
      action: 'retry_attempt'
    }, 'User attempting to retry after error')

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleReload = () => {
    logger.info({
      errorId: this.state.errorId,
      action: 'page_reload'
    }, 'User reloading page after error')

    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId, this.handleRetry)
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg 
                  className="h-6 w-6 text-red-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>

              {/* Error Message */}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Der opstod en uventet fejl
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Vi beklager ulejligheden. Noget gik galt med siden. 
                Du kan prøve at genindlæse siden eller kontakte support.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-left bg-gray-50 p-4 rounded mb-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Tekniske detaljer (kun udvikling)
                  </summary>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div>
                      <strong>Fejl:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>ID:</strong> {this.state.errorId}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Error ID for Support */}
              <div className="bg-gray-50 p-3 rounded mb-6">
                <p className="text-xs text-gray-500">
                  Fejl ID til support: 
                  <span className="font-mono font-medium ml-1">{this.state.errorId}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  ↻ Prøv igen
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  ⟲ Genindlæs siden
                </button>
              </div>

              {/* Support Link */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Har du brug for hjælp? {' '}
                  <a 
                    href="mailto:support@forsikringsguiden.dk?subject=Fejl%20på%20siden%20-%20ID:%20${this.state.errorId}"
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    Kontakt support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook to manually trigger error boundary (for testing or error handling)
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Chat-specific error fallback component
 */
export const ChatErrorFallback = (error: Error, errorId: string, retry: () => void) => (
  <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg p-6">
    <div className="text-center max-w-sm">
      <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-red-100 mb-3">
        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        Chat fejl
      </h3>
      
      <p className="text-xs text-gray-500 mb-4">
        Der opstod en fejl i chatten. Prøv at genstart samtalen.
      </p>
      
      <button
        onClick={retry}
        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        ↻ Prøv igen
      </button>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 text-xs text-gray-400">
          ID: {errorId}
        </div>
      )}
    </div>
  </div>
);

export default ErrorBoundary
