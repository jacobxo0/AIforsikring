/**
 * Error Boundary Integration Components for AI Forsikringsguiden
 * Formål: Pre-configured error boundary wrappers for common use cases
 */

'use client';

import React, { ReactNode, Suspense } from 'react';
import { 
  ComponentErrorBoundary, 
  WidgetErrorBoundary, 
  FormErrorBoundary,
  AsyncErrorBoundary,
  CriticalErrorBoundary,
  ThirdPartyErrorBoundary,
  DataVizErrorBoundary
} from './ErrorBoundaryHierarchy';
import { FallbackComponents } from './FallbackComponents';
import { LoadingBoundary } from '@/components/LoadingBoundary';

/**
 * Safe component wrapper with error boundary and loading state
 */
export const SafeComponent: React.FC<{
  children: ReactNode;
  componentName: string;
  enableRetry?: boolean;
  maxRetries?: number;
  fallbackComponent?: React.ComponentType<any>;
  showLoading?: boolean;
}> = ({ 
  children, 
  componentName, 
  enableRetry = true, 
  maxRetries = 5,
  fallbackComponent,
  showLoading = true
}) => {
  const loadingFallback = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-sm text-gray-600">Indlæser...</span>
    </div>
  );

  const content = showLoading ? (
    <Suspense fallback={loadingFallback}>
      {children}
    </Suspense>
  ) : children;

  return (
    <ComponentErrorBoundary
      componentName={componentName}
      enableRetry={enableRetry}
      maxRetries={maxRetries}
    >
      {content}
    </ComponentErrorBoundary>
  );
};

/**
 * Safe widget wrapper for dashboard components
 */
export const SafeWidget: React.FC<{
  children: ReactNode;
  widgetName: string;
  widgetTitle?: string;
  enableRetry?: boolean;
}> = ({ children, widgetName, widgetTitle, enableRetry = true }) => {
  const WidgetFallback = (props: any) => (
    <FallbackComponents.dashboardWidget {...props} widgetTitle={widgetTitle} />
  );

  return (
    <WidgetErrorBoundary
      widgetName={widgetName}
      enableRetry={enableRetry}
    >
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded"></div>}>
        {children}
      </Suspense>
    </WidgetErrorBoundary>
  );
};

/**
 * Safe form wrapper with specialized error handling
 */
export const SafeForm: React.FC<{
  children: ReactNode;
  formName: string;
  onFormError?: (error: Error) => void;
}> = ({ children, formName, onFormError }) => {
  return (
    <FormErrorBoundary
      formName={formName}
      onFormError={onFormError}
    >
      {children}
    </FormErrorBoundary>
  );
};

/**
 * Safe async component wrapper
 */
export const SafeAsyncComponent: React.FC<{
  children: ReactNode;
  componentName: string;
  onAsyncError?: (error: Error) => void;
  loadingComponent?: ReactNode;
}> = ({ children, componentName, onAsyncError, loadingComponent }) => {
  const defaultLoading = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-sm text-gray-600">Indlæser...</span>
    </div>
  );

  return (
    <AsyncErrorBoundary
      componentName={componentName}
      onAsyncError={onAsyncError}
    >
      <Suspense fallback={loadingComponent || defaultLoading}>
        {children}
      </Suspense>
    </AsyncErrorBoundary>
  );
};

/**
 * Critical component wrapper - for mission-critical features
 */
export const SafeCriticalComponent: React.FC<{
  children: ReactNode;
  componentName: string;
}> = ({ children, componentName }) => {
  return (
    <CriticalErrorBoundary componentName={componentName}>
      {children}
    </CriticalErrorBoundary>
  );
};

/**
 * Third-party integration wrapper
 */
export const SafeThirdPartyComponent: React.FC<{
  children: ReactNode;
  integrationName: string;
  fallbackMessage?: string;
}> = ({ children, integrationName, fallbackMessage }) => {
  const ThirdPartyFallback = () => (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-600">
        {fallbackMessage || `${integrationName} er midlertidigt utilgængelig`}
      </p>
    </div>
  );

  return (
    <ThirdPartyErrorBoundary
      integrationName={integrationName}
      fallbackComponent={ThirdPartyFallback}
    >
      {children}
    </ThirdPartyErrorBoundary>
  );
};

/**
 * Data visualization wrapper
 */
export const SafeDataViz: React.FC<{
  children: ReactNode;
  chartName: string;
  chartType?: string;
}> = ({ children, chartName, chartType = 'diagram' }) => {
  const ChartFallback = (props: any) => (
    <FallbackComponents.chart {...props} chartType={chartType} />
  );

  return (
    <DataVizErrorBoundary chartName={chartName}>
      <Suspense fallback={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      }>
        {children}
      </Suspense>
    </DataVizErrorBoundary>
  );
};

/**
 * Insurance-specific component wrapper
 */
export const SafeInsuranceComponent: React.FC<{
  children: ReactNode;
  componentName: string;
  insuranceType?: string;
}> = ({ children, componentName, insuranceType }) => {
  return (
    <ComponentErrorBoundary
      componentName={`${componentName}${insuranceType ? `-${insuranceType}` : ''}`}
      enableRetry={true}
      maxRetries={3}
    >
      <Suspense fallback={
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-blue-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-blue-300 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-blue-300 rounded w-1/4"></div>
          </div>
        </div>
      }>
        {children}
      </Suspense>
    </ComponentErrorBoundary>
  );
};

/**
 * Chat component wrapper
 */
export const SafeChatComponent: React.FC<{
  children: ReactNode;
  componentName: string;
}> = ({ children, componentName }) => {
  const ChatFallback = (props: any) => <FallbackComponents.chat {...props} />;

  return (
    <ComponentErrorBoundary
      componentName={componentName}
      enableRetry={true}
      maxRetries={2}
    >
      {children}
    </ComponentErrorBoundary>
  );
};

/**
 * Document upload wrapper
 */
export const SafeDocumentUpload: React.FC<{
  children: ReactNode;
  componentName: string;
}> = ({ children, componentName }) => {
  const UploadFallback = (props: any) => <FallbackComponents.documentUpload {...props} />;

  return (
    <ComponentErrorBoundary
      componentName={componentName}
      enableRetry={true}
      maxRetries={2}
    >
      {children}
    </ComponentErrorBoundary>
  );
};

/**
 * Data table wrapper
 */
export const SafeDataTable: React.FC<{
  children: ReactNode;
  tableName: string;
}> = ({ children, tableName }) => {
  const TableFallback = (props: any) => <FallbackComponents.dataTable {...props} />;

  return (
    <ComponentErrorBoundary
      componentName={tableName}
      enableRetry={true}
      maxRetries={3}
    >
      <Suspense fallback={
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      }>
        {children}
      </Suspense>
    </ComponentErrorBoundary>
  );
};

/**
 * API-dependent component wrapper
 */
export const SafeApiComponent: React.FC<{
  children: ReactNode;
  componentName: string;
  apiName?: string;
}> = ({ children, componentName, apiName }) => {
  const ApiErrorFallback = (props: any) => <FallbackComponents.apiConnection {...props} />;

  return (
    <ComponentErrorBoundary
      componentName={`${componentName}${apiName ? `-${apiName}` : ''}`}
      enableRetry={true}
      maxRetries={3}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Henter data...</span>
        </div>
      }>
        {children}
      </Suspense>
    </ComponentErrorBoundary>
  );
};

/**
 * Utility function to wrap any component with error boundary
 */
export const withSafeWrapper = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    componentName: string;
    type?: 'component' | 'widget' | 'form' | 'async' | 'critical' | 'thirdParty' | 'dataViz';
    enableRetry?: boolean;
    maxRetries?: number;
    fallbackComponent?: React.ComponentType<any>;
  }
) => {
  const SafeWrappedComponent = (props: P) => {
    const { type = 'component', ...wrapperOptions } = options;
    
    switch (type) {
      case 'widget':
        return (
          <SafeWidget widgetName={options.componentName} enableRetry={options.enableRetry}>
            <Component {...props} />
          </SafeWidget>
        );
      
      case 'form':
        return (
          <SafeForm formName={options.componentName}>
            <Component {...props} />
          </SafeForm>
        );
      
      case 'async':
        return (
          <SafeAsyncComponent componentName={options.componentName}>
            <Component {...props} />
          </SafeAsyncComponent>
        );
      
      case 'critical':
        return (
          <SafeCriticalComponent componentName={options.componentName}>
            <Component {...props} />
          </SafeCriticalComponent>
        );
      
      case 'thirdParty':
        return (
          <SafeThirdPartyComponent integrationName={options.componentName}>
            <Component {...props} />
          </SafeThirdPartyComponent>
        );
      
      case 'dataViz':
        return (
          <SafeDataViz chartName={options.componentName}>
            <Component {...props} />
          </SafeDataViz>
        );
      
      default:
        return (
          <SafeComponent 
            componentName={options.componentName}
            enableRetry={options.enableRetry}
            maxRetries={options.maxRetries}
            fallbackComponent={options.fallbackComponent}
          >
            <Component {...props} />
          </SafeComponent>
        );
    }
  };

  SafeWrappedComponent.displayName = `Safe(${Component.displayName || Component.name})`;
  
  return SafeWrappedComponent;
};