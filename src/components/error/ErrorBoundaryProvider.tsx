/**
 * Error Boundary Provider for AI Forsikringsguiden
 * Formål: Hierarchical error boundary system med intelligent error recovery
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
// Temporary: Commented out missing dependencies  
// import { sessionTracker } from '@/lib/sessionTracking';
// import { realTimeMonitor } from '@/lib/realTimeMonitoring';
// import { performanceMonitor } from '@/lib/performanceMonitor';

export interface ErrorBoundaryConfig {
  level: 'app' | 'page' | 'component' | 'widget';
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  isolateError?: boolean;
  reportToMonitoring?: boolean;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  retry: () => void;
  canRetry: boolean;
  level: string;
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string | null;
}

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  config: ErrorBoundaryConfig;
  sessionId?: string;
  componentName?: string;
}

export class ErrorBoundaryProvider extends Component<
  ErrorBoundaryProviderProps,
  ErrorBoundaryState
> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProviderProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { config, sessionId, componentName } = this.props;
    
    this.setState({ errorInfo });

    // Log error with comprehensive context
    this.logError(error, errorInfo);

    // Track error in session if available
    if (sessionId) {
      // Temporary: sessionTracker disabled until implementation
      // sessionTracker.trackError(sessionId, error, {
      //   level: config.level,
      //   componentName,
      //   componentStack: errorInfo.componentStack,
      //   errorBoundary: true
      // });
    }

    // Report to monitoring system
    if (config.reportToMonitoring !== false) {
      // Temporary: realTimeMonitor disabled until implementation
      // realTimeMonitor.emit('error', {
      //   error: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack,
      //   level: config.level,
      //   componentName,
      //   errorId: this.state.errorId
      // }, 'error', 'error-boundary');
    }

    // Record performance impact
    // Temporary: performanceMonitor disabled until implementation
    // performanceMonitor.recordMetric('error.boundary.triggered', 1, 'count', {
    //   level: config.level,
    //   component: componentName || 'unknown'
    // });

    // Call custom error handler
    if (config.onError) {
      try {
        config.onError(error, errorInfo);
      } catch (handlerError) {
        logger.error('Error in custom error handler', handlerError);
      }
    }

    // Auto-retry if enabled
    if (config.enableRetry && this.state.retryCount < (config.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount(): void {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  /**
   * Log error with comprehensive context
   */
  private logError(error: Error, errorInfo: ErrorInfo): void {
    const { config, componentName } = this.props;
    
    logger.error('React Error Boundary triggered', error, {
      errorId: this.state.errorId,
      level: config.level,
      componentName,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Schedule automatic retry
   */
  private scheduleRetry(): void {
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    const timeout = setTimeout(() => {
      this.handleRetry();
    }, retryDelay);
    
    this.retryTimeouts.push(timeout);
    
    logger.info('Error boundary retry scheduled', {
      errorId: this.state.errorId,
      retryCount: this.state.retryCount + 1,
      delay: retryDelay
    });
  }

  /**
   * Handle retry attempt
   */
  private handleRetry = (): void => {
    const { config } = this.props;
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      errorId: null
    }));

    logger.info('Error boundary retry attempted', {
      retryCount: this.state.retryCount + 1,
      level: config.level
    });

    // Temporary: performanceMonitor disabled until implementation
    // performanceMonitor.recordMetric('error.boundary.retry', 1, 'count', {
    //   level: config.level,
    //   attempt: (this.state.retryCount + 1).toString()
    // });
  };

  /**
   * Manual retry handler
   */
  private handleManualRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: null
    });

    logger.info('Manual error boundary retry', {
      level: this.props.config.level
    });
  };

  render(): ReactNode {
    const { children, config, componentName } = this.props;
    const { hasError, error, errorInfo, retryCount } = this.state;

    if (hasError && error && errorInfo) {
      const canRetry = config.enableRetry !== false && retryCount < (config.maxRetries || 3);
      
      // Use custom fallback component if provided
      if (config.fallbackComponent) {
        const FallbackComponent = config.fallbackComponent;
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            retry={this.handleManualRetry}
            canRetry={canRetry}
            level={config.level}
            componentStack={errorInfo.componentStack || 'No component stack available'}
          />
        );
      }

      // Default fallback UI based on error level
      return this.renderDefaultFallback(error, errorInfo, canRetry);
    }

    return children;
  }

  /**
   * Render default fallback UI
   */
  private renderDefaultFallback(
    error: Error,
    errorInfo: ErrorInfo,
    canRetry: boolean
  ): ReactNode {
    const { config, componentName } = this.props;
    
    switch (config.level) {
      case 'app':
        return <AppLevelErrorFallback 
          error={error} 
          retry={this.handleManualRetry} 
          canRetry={canRetry} 
        />;
      
      case 'page':
        return <PageLevelErrorFallback 
          error={error} 
          retry={this.handleManualRetry} 
          canRetry={canRetry} 
        />;
      
      case 'component':
        return <ComponentLevelErrorFallback 
          error={error} 
          retry={this.handleManualRetry} 
          canRetry={canRetry}
          componentName={componentName}
        />;
      
      case 'widget':
        return <WidgetLevelErrorFallback 
          error={error} 
          retry={this.handleManualRetry} 
          canRetry={canRetry}
          componentName={componentName}
        />;
      
      default:
        return <GenericErrorFallback 
          error={error} 
          retry={this.handleManualRetry} 
          canRetry={canRetry} 
        />;
    }
  }
}

/**
 * App-level error fallback
 */
const AppLevelErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, retry, canRetry }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Der opstod en uventet fejl
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Vi beklager ulejligheden. Vores team er blevet informeret om problemet.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">
                Tekniske detaljer
              </summary>
              <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}
          <div className="mt-6 space-y-3">
            {canRetry && (
              <button
                onClick={retry}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Prøv igen
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Genindlæs siden
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Page-level error fallback
 */
const PageLevelErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, retry, canRetry }) => (
  <div className="bg-white min-h-96 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
    <div className="max-w-max mx-auto">
      <main className="sm:flex">
        <div className="sm:ml-6">
          <div className="sm:border-l sm:border-gray-200 sm:pl-6">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
              Siden kunne ikke indlæses
            </h1>
            <p className="mt-1 text-base text-gray-500">
              Der opstod en fejl under indlæsning af denne side.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Fejldetaljer
                </summary>
                <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
            {canRetry && (
              <button
                onClick={retry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Prøv igen
              </button>
            )}
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Gå tilbage
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
);

/**
 * Component-level error fallback
 */
const ComponentLevelErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  canRetry: boolean;
  componentName?: string;
}> = ({ error, retry, canRetry, componentName }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">
          Komponent fejl{componentName && `: ${componentName}`}
        </h3>
        <p className="mt-1 text-sm text-red-700">
          Denne komponent kunne ikke indlæses korrekt.
        </p>
        {canRetry && (
          <div className="mt-3">
            <button
              onClick={retry}
              className="text-sm bg-red-100 text-red-800 rounded-md px-2 py-1 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Prøv igen
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

/**
 * Widget-level error fallback
 */
const WidgetLevelErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  canRetry: boolean;
  componentName?: string;
}> = ({ error, retry, canRetry, componentName }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
    <div className="flex items-center">
      <svg className="h-4 w-4 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="text-sm text-yellow-800">
        Widget ikke tilgængelig
      </span>
      {canRetry && (
        <button
          onClick={retry}
          className="ml-2 text-xs text-yellow-700 underline hover:text-yellow-900"
        >
          Genindlæs
        </button>
      )}
    </div>
  </div>
);

/**
 * Generic error fallback
 */
const GenericErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, retry, canRetry }) => (
  <div className="bg-gray-50 border border-gray-200 rounded p-4">
    <div className="text-center">
      <p className="text-sm text-gray-600">Der opstod en fejl</p>
      {canRetry && (
        <button
          onClick={retry}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Prøv igen
        </button>
      )}
    </div>
  </div>
);

/**
 * Higher-order component for easy error boundary wrapping
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  config: ErrorBoundaryConfig
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryProvider config={config}>
      <Component {...props} />
    </ErrorBoundaryProvider>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}