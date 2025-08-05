/**
 * API Status Indicator for AI Forsikringsguiden
 * Formål: Visual real-time API status feedback component
 */

'use client';

import React, { useState } from 'react';
import { useApiStatus, ApiStatus, ServiceStatus } from '@/lib/api/apiStatusContext';
import { ApiErrorSeverity } from '@/lib/api/apiErrorHandler';

/**
 * Connection status indicator
 */
export const ConnectionStatusIndicator: React.FC<{
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ showLabel = true, size = 'md' }) => {
  const { state } = useApiStatus();
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  const getStatusColor = () => {
    switch (state.connectionStatus) {
      case 'online':
        return 'bg-green-400';
      case 'slow':
        return 'bg-yellow-400';
      case 'offline':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };
  
  const getStatusText = () => {
    switch (state.connectionStatus) {
      case 'online':
        return 'Online';
      case 'slow':
        return 'Langsom forbindelse';
      case 'offline':
        return 'Offline';
      default:
        return 'Ukendt';
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizeClasses[size]} ${getStatusColor()} rounded-full animate-pulse`}></div>
      {showLabel && (
        <span className="text-xs text-gray-600">
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

/**
 * Service status indicator
 */
export const ServiceStatusIndicator: React.FC<{
  serviceName?: string;
  showDetails?: boolean;
}> = ({ serviceName, showDetails = false }) => {
  const { state, getServiceStatus } = useApiStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const service = serviceName ? getServiceStatus(serviceName) : null;
  const status = service?.status || state.globalStatus;
  
  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return 'text-green-600 bg-green-100';
      case ServiceStatus.DEGRADED:
        return 'text-yellow-600 bg-yellow-100';
      case ServiceStatus.PARTIAL_OUTAGE:
        return 'text-orange-600 bg-orange-100';
      case ServiceStatus.MAJOR_OUTAGE:
        return 'text-red-600 bg-red-100';
      case ServiceStatus.MAINTENANCE:
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getStatusText = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return 'Operationel';
      case ServiceStatus.DEGRADED:
        return 'Nedsat ydeevne';
      case ServiceStatus.PARTIAL_OUTAGE:
        return 'Delvis nedbrud';
      case ServiceStatus.MAJOR_OUTAGE:
        return 'Større nedbrud';
      case ServiceStatus.MAINTENANCE:
        return 'Vedligeholdelse';
      default:
        return 'Ukendt status';
    }
  };
  
  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case ServiceStatus.DEGRADED:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case ServiceStatus.PARTIAL_OUTAGE:
      case ServiceStatus.MAJOR_OUTAGE:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case ServiceStatus.MAINTENANCE:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  return (
    <div className="inline-flex items-center">
      <div 
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)} cursor-pointer`}
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
      >
        {getStatusIcon(status)}
        <span className="ml-1">
          {serviceName ? `${serviceName}: ${getStatusText(status)}` : getStatusText(status)}
        </span>
      </div>
      
      {showDetails && isExpanded && service && (
        <div className="absolute z-10 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 p-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Svartid:</span>
              <span className="font-medium">{service.responseTime || 'N/A'}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fejlrate:</span>
              <span className="font-medium">{(service.errorRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Oppetid:</span>
              <span className="font-medium">{(service.uptime * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sidste tjek:</span>
              <span className="font-medium">{service.lastChecked.toLocaleTimeString('da-DK')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Active API calls indicator
 */
export const ActiveCallsIndicator: React.FC<{
  showCount?: boolean;
  maxVisible?: number;
}> = ({ showCount = true, maxVisible = 3 }) => {
  const { state } = useApiStatus();
  const activeCalls = Array.from(state.activeCalls.values())
    .filter(call => call.status === ApiStatus.LOADING || call.status === ApiStatus.RETRYING);
  
  if (activeCalls.length === 0) {
    return null;
  }
  
  const visibleCalls = activeCalls.slice(0, maxVisible);
  const remainingCount = activeCalls.length - maxVisible;
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        {showCount && (
          <span className="text-xs text-gray-600">
            {activeCalls.length} aktive kald
          </span>
        )}
      </div>
      
      <div className="flex flex-col space-y-1">
        {visibleCalls.map(call => (
          <div key={call.id} className="text-xs text-gray-500 flex items-center space-x-1">
            <span>{call.method}</span>
            <span>{call.endpoint}</span>
            {call.status === ApiStatus.RETRYING && (
              <span className="text-yellow-600">({call.retryCount}/{call.maxRetries})</span>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-gray-400">
            +{remainingCount} flere...
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Error summary indicator
 */
export const ErrorSummaryIndicator: React.FC<{
  timeWindow?: number; // minutes
  showDetails?: boolean;
}> = ({ timeWindow = 60, showDetails = false }) => {
  const { state } = useApiStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
  const recentErrors = state.recentErrors.filter(error => error.timestamp > cutoffTime);
  
  const errorCounts = recentErrors.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {} as Record<ApiErrorSeverity, number>);
  
  const totalErrors = recentErrors.length;
  
  if (totalErrors === 0) {
    return null;
  }
  
  const criticalErrors = errorCounts[ApiErrorSeverity.CRITICAL] || 0;
  const highErrors = errorCounts[ApiErrorSeverity.HIGH] || 0;
  
  const getIndicatorColor = () => {
    if (criticalErrors > 0) return 'bg-red-500';
    if (highErrors > 0) return 'bg-orange-500';
    return 'bg-yellow-500';
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getIndicatorColor()}`}
      >
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {totalErrors} fejl
      </button>
      
      {showDetails && isExpanded && (
        <div className="absolute z-10 mt-2 w-72 bg-white rounded-md shadow-lg border border-gray-200 p-3">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">
                Fejl i de sidste {timeWindow} minutter
              </h4>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Luk fejl detaljer"
                title="Luk fejl detaljer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              {Object.entries(errorCounts).map(([severity, count]) => (
                <div key={severity} className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">{severity.toLowerCase()}:</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-2">
              <div className="text-xs text-gray-500 space-y-1">
                {recentErrors.slice(0, 3).map((error, index) => (
                  <div key={index} className="truncate">
                    {error.endpoint} - {error.userMessage}
                  </div>
                ))}
                {recentErrors.length > 3 && (
                  <div className="text-gray-400">
                    +{recentErrors.length - 3} flere fejl...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Comprehensive API status bar
 */
export const ApiStatusBar: React.FC<{
  position?: 'top' | 'bottom';
  showConnectionStatus?: boolean;
  showServiceStatus?: boolean;
  showActiveCalls?: boolean;
  showErrors?: boolean;
}> = ({
  position = 'bottom',
  showConnectionStatus = true,
  showServiceStatus = true,
  showActiveCalls = true,
  showErrors = true
}) => {
  const positionClasses = position === 'top' 
    ? 'top-0 border-b' 
    : 'bottom-0 border-t';
  
  return (
    <div className={`fixed left-0 right-0 ${positionClasses} bg-white border-gray-200 px-4 py-2 z-40`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showConnectionStatus && <ConnectionStatusIndicator />}
          {showServiceStatus && <ServiceStatusIndicator showDetails />}
        </div>
        
        <div className="flex items-center space-x-4">
          {showActiveCalls && <ActiveCallsIndicator />}
          {showErrors && <ErrorSummaryIndicator showDetails />}
        </div>
      </div>
    </div>
  );
};

/**
 * Floating API status widget
 */
export const FloatingApiStatus: React.FC<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}> = ({ position = 'bottom-right' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { state } = useApiStatus();
  
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };
  
  const hasIssues = state.connectionStatus !== 'online' || 
                   state.globalStatus !== ServiceStatus.OPERATIONAL ||
                   state.recentErrors.length > 0;
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-3 flex items-center space-x-2 ${hasIssues ? 'bg-red-50' : 'bg-green-50'}`}
        >
          <ConnectionStatusIndicator showLabel={false} size="sm" />
          <span className="text-xs font-medium">
            {hasIssues ? 'Problemer' : 'Alt OK'}
          </span>
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="p-3 border-t border-gray-200 space-y-3 min-w-64">
            <ServiceStatusIndicator />
            <ActiveCallsIndicator showCount />
            <ErrorSummaryIndicator timeWindow={30} />
          </div>
        )}
      </div>
    </div>
  );
};