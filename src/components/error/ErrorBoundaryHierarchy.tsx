/**
 * Error Boundary Hierarchy for AI Forsikringsguiden
 * Formål: Nested error boundary system med intelligent error isolation
 */

'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundaryProvider, ErrorBoundaryConfig } from './ErrorBoundaryProvider';
import { useSession } from '@/lib/hooks/useSession';
import { logger } from '@/lib/logger';

/**
 * App-level error boundary configuration
 */
const APP_ERROR_CONFIG: ErrorBoundaryConfig = {
  level: 'app',
  enableRetry: true,
  maxRetries: 2,
  isolateError: false,
  reportToMonitoring: true,
  onError: (error, errorInfo) => {
    logger.error('App-level error boundary triggered', error, {
      componentStack: errorInfo.componentStack,
      level: 'app',
      critical: true
    });
  }
};

/**
 * Page-level error boundary configuration
 */
const PAGE_ERROR_CONFIG: ErrorBoundaryConfig = {
  level: 'page',
  enableRetry: true,
  maxRetries: 3,
  isolateError: true,
  reportToMonitoring: true,
  onError: (error, errorInfo) => {
    logger.warn('Page-level error boundary triggered', error, {
      componentStack: errorInfo.componentStack,
      level: 'page'
    });
  }
};

/**
 * Component-level error boundary configuration
 */
const COMPONENT_ERROR_CONFIG: ErrorBoundaryConfig = {
  level: 'component',
  enableRetry: true,
  maxRetries: 5,
  isolateError: true,
  reportToMonitoring: true,
  onError: (error, errorInfo) => {
    logger.info('Component-level error boundary triggered', error, {
      componentStack: errorInfo.componentStack,
      level: 'component'
    });
  }
};

/**
 * Widget-level error boundary configuration
 */
const WIDGET_ERROR_CONFIG: ErrorBoundaryConfig = {
  level: 'widget',
  enableRetry: true,
  maxRetries: 10,
  isolateError: true,
  reportToMonitoring: false, // Less critical, don't spam monitoring
  onError: (error, errorInfo) => {
    logger.debug('Widget-level error boundary triggered', error, {
      componentStack: errorInfo.componentStack,
      level: 'widget'
    });
  }
};

/**
 * App-level error boundary wrapper
 */
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sessionId } = useSession();
  
  return (
    <ErrorBoundaryProvider 
      config={APP_ERROR_CONFIG}
      sessionId={sessionId || undefined}
      componentName="App"
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Page-level error boundary wrapper
 */
export const PageErrorBoundary: React.FC<{ 
  children: ReactNode;
  pageName?: string;
}> = ({ children, pageName }) => {
  const { sessionId } = useSession();
  
  return (
    <ErrorBoundaryProvider 
      config={PAGE_ERROR_CONFIG}
      sessionId={sessionId || undefined}
      componentName={pageName || 'Page'}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Component-level error boundary wrapper
 */
export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName: string;
  enableRetry?: boolean;
  maxRetries?: number;
}> = ({ children, componentName, enableRetry = true, maxRetries = 5 }) => {
  const { sessionId } = useSession();
  
  const config: ErrorBoundaryConfig = {
    ...COMPONENT_ERROR_CONFIG,
    enableRetry,
    maxRetries
  };
  
  return (
    <ErrorBoundaryProvider 
      config={config}
      sessionId={sessionId || undefined}
      componentName={componentName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Widget-level error boundary wrapper
 */
export const WidgetErrorBoundary: React.FC<{ 
  children: ReactNode;
  widgetName: string;
  enableRetry?: boolean;
}> = ({ children, widgetName, enableRetry = true }) => {
  const { sessionId } = useSession();
  
  const config: ErrorBoundaryConfig = {
    ...WIDGET_ERROR_CONFIG,
    enableRetry
  };
  
  return (
    <ErrorBoundaryProvider 
      config={config}
      sessionId={sessionId || undefined}
      componentName={widgetName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Critical section error boundary - for mission-critical components
 */
export const CriticalErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName: string;
}> = ({ children, componentName }) => {
  const { sessionId } = useSession();
  
  const criticalConfig: ErrorBoundaryConfig = {
    level: 'component',
    enableRetry: false, // Don't auto-retry critical failures
    maxRetries: 0,
    isolateError: false, // Let critical errors bubble up
    reportToMonitoring: true,
    onError: (error, errorInfo) => {
      logger.error('CRITICAL: Error boundary triggered in critical section', error, {
        componentStack: errorInfo.componentStack,
        componentName,
        level: 'critical',
        urgent: true
      });
      
      // Could trigger alerts, notifications, etc.
      if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
        navigator.sendBeacon('/api/critical-error', JSON.stringify({
          error: error.message,
          component: componentName,
          timestamp: new Date().toISOString()
        }));
      }
    }
  };
  
  return (
    <ErrorBoundaryProvider 
      config={criticalConfig}
      sessionId={sessionId || undefined}
      componentName={componentName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Async component error boundary - for components with async operations
 */
export const AsyncErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName: string;
  onAsyncError?: (error: Error) => void;
}> = ({ children, componentName, onAsyncError }) => {
  const { sessionId } = useSession();
  
  const asyncConfig: ErrorBoundaryConfig = {
    level: 'component',
    enableRetry: true,
    maxRetries: 3,
    isolateError: true,
    reportToMonitoring: true,
    onError: (error, errorInfo) => {
      logger.warn('Async component error boundary triggered', error, {
        componentStack: errorInfo.componentStack,
        componentName,
        level: 'async'
      });
      
      if (onAsyncError) {
        try {
          onAsyncError(error);
        } catch (handlerError) {
          logger.error('Error in async error handler', handlerError);
        }
      }
    }
  };
  
  return (
    <ErrorBoundaryProvider 
      config={asyncConfig}
      sessionId={sessionId || undefined}
      componentName={componentName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Form error boundary - specialized for form components
 */
export const FormErrorBoundary: React.FC<{ 
  children: ReactNode;
  formName: string;
  onFormError?: (error: Error) => void;
}> = ({ children, formName, onFormError }) => {
  const { sessionId } = useSession();
  
  const formConfig: ErrorBoundaryConfig = {
    level: 'component',
    enableRetry: true,
    maxRetries: 2,
    isolateError: true,
    reportToMonitoring: true,
    onError: (error, errorInfo) => {
      logger.warn('Form error boundary triggered', error, {
        componentStack: errorInfo.componentStack,
        formName,
        level: 'form'
      });
      
      if (onFormError) {
        try {
          onFormError(error);
        } catch (handlerError) {
          logger.error('Error in form error handler', handlerError);
        }
      }
    }
  };
  
  return (
    <ErrorBoundaryProvider 
      config={formConfig}
      sessionId={sessionId || undefined}
      componentName={formName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Data visualization error boundary - for charts, graphs, etc.
 */
export const DataVizErrorBoundary: React.FC<{ 
  children: ReactNode;
  chartName: string;
}> = ({ children, chartName }) => {
  const { sessionId } = useSession();
  
  const dataVizConfig: ErrorBoundaryConfig = {
    level: 'widget',
    enableRetry: true,
    maxRetries: 5,
    isolateError: true,
    reportToMonitoring: false, // Data viz errors are usually not critical
    onError: (error, errorInfo) => {
      logger.debug('Data visualization error boundary triggered', error, {
        componentStack: errorInfo.componentStack,
        chartName,
        level: 'dataviz'
      });
    }
  };
  
  return (
    <ErrorBoundaryProvider 
      config={dataVizConfig}
      sessionId={sessionId || undefined}
      componentName={chartName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Third-party integration error boundary
 */
export const ThirdPartyErrorBoundary: React.FC<{ 
  children: ReactNode;
  integrationName: string;
  fallbackComponent?: React.ComponentType<any>;
}> = ({ children, integrationName, fallbackComponent }) => {
  const { sessionId } = useSession();
  
  const thirdPartyConfig: ErrorBoundaryConfig = {
    level: 'component',
    enableRetry: false, // Don't retry third-party failures
    maxRetries: 0,
    isolateError: true,
    reportToMonitoring: true,
    fallbackComponent,
    onError: (error, errorInfo) => {
      logger.warn('Third-party integration error boundary triggered', error, {
        componentStack: errorInfo.componentStack,
        integrationName,
        level: 'third-party'
      });
    }
  };
  
  return (
    <ErrorBoundaryProvider 
      config={thirdPartyConfig}
      sessionId={sessionId || undefined}
      componentName={integrationName}
    >
      {children}
    </ErrorBoundaryProvider>
  );
};

/**
 * Complete hierarchical error boundary wrapper
 * Use this to wrap your entire app with nested error boundaries
 */
export const HierarchicalErrorBoundary: React.FC<{
  children: ReactNode;
  appName?: string;
}> = ({ children, appName = 'AI Forsikringsguiden' }) => {
  return (
    <AppErrorBoundary>
      <PageErrorBoundary pageName={appName}>
        {children}
      </PageErrorBoundary>
    </AppErrorBoundary>
  );
};

/**
 * Error boundary configuration presets
 */
export const ErrorBoundaryPresets = {
  APP: APP_ERROR_CONFIG,
  PAGE: PAGE_ERROR_CONFIG,
  COMPONENT: COMPONENT_ERROR_CONFIG,
  WIDGET: WIDGET_ERROR_CONFIG,
  
  // Custom presets
  CRITICAL: {
    level: 'component' as const,
    enableRetry: false,
    maxRetries: 0,
    isolateError: false,
    reportToMonitoring: true
  },
  
  ASYNC: {
    level: 'component' as const,
    enableRetry: true,
    maxRetries: 3,
    isolateError: true,
    reportToMonitoring: true
  },
  
  FORM: {
    level: 'component' as const,
    enableRetry: true,
    maxRetries: 2,
    isolateError: true,
    reportToMonitoring: true
  },
  
  THIRD_PARTY: {
    level: 'component' as const,
    enableRetry: false,
    maxRetries: 0,
    isolateError: true,
    reportToMonitoring: true
  }
} as const;