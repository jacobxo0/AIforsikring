/**
 * Fallback Components for AI Forsikringsguiden
 * Formål: Specialized fallback UI components for different error contexts
 */

'use client';

import React from 'react';
import { ErrorFallbackProps } from './ErrorBoundaryProvider';
import { logger } from '@/lib/logger';

/**
 * Insurance-specific error fallback
 */
export const InsuranceFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry,
  level,
  componentStack
}) => {
  const handleContactSupport = () => {
    logger.info('User requested support contact from error fallback', {
      error: error.message,
      level,
      timestamp: new Date().toISOString()
    });
    
    // Could open support chat, email, etc.
    window.open('mailto:support@aiforsikringsguiden.dk?subject=Teknisk fejl&body=' + 
      encodeURIComponent(`Der opstod en fejl i systemet:\n\n${error.message}\n\nTidspunkt: ${new Date().toLocaleString('da-DK')}`));
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-lg font-medium text-blue-900">
            Forsikringsdata ikke tilgængelig
          </h3>
        </div>
      </div>
      
      <p className="text-blue-700 mb-4">
        Vi kan desværre ikke vise dine forsikringsoplysninger lige nu. 
        Dette påvirker ikke dine aktuelle forsikringer.
      </p>
      
      <div className="space-y-3">
        {canRetry && (
          <button
            onClick={retry}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Prøv igen
          </button>
        )}
        
        <button
          onClick={handleContactSupport}
          className="w-full bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Kontakt support
        </button>
      </div>
      
      <div className="mt-4 text-xs text-blue-600">
        <p>Fejl-ID: {Date.now().toString(36)}</p>
      </div>
    </div>
  );
};

/**
 * Chat-specific error fallback
 */
export const ChatFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry
}) => {
  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 max-w-sm">
      <div className="flex items-center mb-3">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.471L3 21l2.471-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
          </svg>
        </div>
        <div className="ml-2">
          <h4 className="text-sm font-medium text-gray-900">
            Chat ikke tilgængelig
          </h4>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">
        AI-assistenten er midlertidigt utilgængelig.
      </p>
      
      {canRetry && (
        <button
          onClick={retry}
          className="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Genstart chat
        </button>
      )}
    </div>
  );
};

/**
 * Document upload error fallback
 */
export const DocumentUploadFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry
}) => {
  return (
    <div className="bg-red-50 border-2 border-dashed border-red-300 rounded-lg p-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-red-900 mb-2">
        Upload fejlede
      </h3>
      
      <p className="text-red-700 mb-4">
        Dokumentet kunne ikke uploades. Kontrollér din internetforbindelse og prøv igen.
      </p>
      
      {canRetry && (
        <button
          onClick={retry}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Prøv upload igen
        </button>
      )}
    </div>
  );
};

/**
 * Dashboard widget error fallback
 */
export const DashboardWidgetFallback: React.FC<ErrorFallbackProps & { 
  widgetTitle?: string;
}> = ({ error, retry, canRetry, widgetTitle = 'Widget' }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">{widgetTitle}</h4>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 mb-3">
          Data kunne ikke indlæses
        </p>
        
        {canRetry && (
          <button
            onClick={retry}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Genindlæs
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Form field error fallback
 */
export const FormFieldFallback: React.FC<ErrorFallbackProps & {
  fieldName?: string;
}> = ({ error, retry, canRetry, fieldName = 'felt' }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-800">
            {fieldName} kunne ikke indlæses korrekt.
          </p>
          {canRetry && (
            <button
              onClick={retry}
              className="mt-2 text-xs text-yellow-700 underline hover:text-yellow-900"
            >
              Prøv igen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Data table error fallback
 */
export const DataTableFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Data ikke tilgængelig
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Tabellen kunne ikke indlæses på grund af en teknisk fejl.
          </p>
          {canRetry && (
            <div className="mt-6">
              <button
                onClick={retry}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Genindlæs data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Chart/visualization error fallback
 */
export const ChartFallback: React.FC<ErrorFallbackProps & {
  chartType?: string;
}> = ({ error, retry, canRetry, chartType = 'diagram' }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {chartType} ikke tilgængeligt
      </h3>
      
      <p className="text-gray-600 mb-4">
        Visualiseringen kunne ikke genereres på grund af en datafejl.
      </p>
      
      {canRetry && (
        <button
          onClick={retry}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Genindlæs {chartType}
        </button>
      )}
    </div>
  );
};

/**
 * API connection error fallback
 */
export const ApiConnectionFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry
}) => {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-orange-800">
            Forbindelsesfejl
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p>
              Kan ikke oprette forbindelse til serveren. Kontrollér din internetforbindelse.
            </p>
          </div>
          {canRetry && (
            <div className="mt-4">
              <button
                onClick={retry}
                className="bg-orange-100 px-3 py-2 rounded-md text-sm font-medium text-orange-800 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Prøv forbindelse igen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Permission denied error fallback
 */
export const PermissionDeniedFallback: React.FC<ErrorFallbackProps> = ({
  error,
  retry,
  canRetry
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-red-900 mb-2">
        Adgang nægtet
      </h3>
      
      <p className="text-red-700 mb-4">
        Du har ikke tilladelse til at se dette indhold. Kontakt din administrator.
      </p>
      
      <div className="space-y-2">
        {canRetry && (
          <button
            onClick={retry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Prøv igen
          </button>
        )}
        
        <div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Gå tilbage
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Fallback component registry
 */
export const FallbackComponents = {
  insurance: InsuranceFallback,
  chat: ChatFallback,
  documentUpload: DocumentUploadFallback,
  dashboardWidget: DashboardWidgetFallback,
  formField: FormFieldFallback,
  dataTable: DataTableFallback,
  chart: ChartFallback,
  apiConnection: ApiConnectionFallback,
  permissionDenied: PermissionDeniedFallback
} as const;

/**
 * Get appropriate fallback component based on error type
 */
export const getFallbackComponent = (errorType: string, error: Error): React.ComponentType<ErrorFallbackProps> => {
  // Analyze error message to determine appropriate fallback
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    return FallbackComponents.permissionDenied;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return FallbackComponents.apiConnection;
  }
  
  if (errorMessage.includes('upload') || errorMessage.includes('file')) {
    return FallbackComponents.documentUpload;
  }
  
  if (errorMessage.includes('chart') || errorMessage.includes('visualization')) {
    return FallbackComponents.chart;
  }
  
  // Default to specific fallback based on errorType
  return FallbackComponents[errorType as keyof typeof FallbackComponents] || FallbackComponents.insurance;
};