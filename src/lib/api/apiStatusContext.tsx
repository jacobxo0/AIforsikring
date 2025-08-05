/**
 * API Status Context for AI Forsikringsguiden
 * Formål: Real-time API status tracking og user feedback system
 */

'use client';

import * as React from 'react';
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ApiError, ApiErrorType, ApiErrorSeverity } from './errors';
import { realTimeMonitor } from './realTimeMonitor';
import { executeApiCall as executeApiCallHelper, executeApiCallWithRetry as executeApiCallWithRetryHelper, ApiCallExecutor } from './apiHelpers';

/**
 * API Status types
 */
export enum ApiStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  RETRYING = 'RETRYING'
}

/**
 * Service status
 */
export enum ServiceStatus {
  OPERATIONAL = 'OPERATIONAL',
  DEGRADED = 'DEGRADED',
  PARTIAL_OUTAGE = 'PARTIAL_OUTAGE',
  MAJOR_OUTAGE = 'MAJOR_OUTAGE',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * API call information
 */
export interface ApiCallInfo {
  id: string;
  endpoint: string;
  method: string;
  status: ApiStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: ApiError;
  retryCount: number;
  maxRetries: number;
}

/**
 * Service health information
 */
export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  lastChecked: Date;
  responseTime?: number;
  errorRate: number;
  uptime: number;
  incidents: number;
}

/**
 * API Status State
 */
interface ApiStatusState {
  globalStatus: ServiceStatus;
  activeCalls: Map<string, ApiCallInfo>;
  recentErrors: ApiError[];
  services: Map<string, ServiceHealth>;
  connectionStatus: 'online' | 'offline' | 'slow';
  lastUpdate: Date;
  notifications: ApiNotification[];
}

/**
 * API Notification
 */
interface ApiNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
  autoHide?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * API Status Actions
 */
type ApiStatusAction =
  | { type: 'START_CALL'; payload: { id: string; endpoint: string; method: string } }
  | { type: 'COMPLETE_CALL'; payload: { id: string; success: boolean; error?: ApiError } }
  | { type: 'RETRY_CALL'; payload: { id: string } }
  | { type: 'ADD_ERROR'; payload: ApiError }
  | { type: 'UPDATE_SERVICE'; payload: ServiceHealth }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'online' | 'offline' | 'slow' }
  | { type: 'ADD_NOTIFICATION'; payload: ApiNotification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_OLD_DATA' };

/**
 * Initial state
 */
const initialState: ApiStatusState = {
  globalStatus: ServiceStatus.OPERATIONAL,
  activeCalls: new Map(),
  recentErrors: [],
  services: new Map(),
  connectionStatus: 'online',
  lastUpdate: new Date(),
  notifications: []
};

/**
 * API Status reducer
 */
function apiStatusReducer(state: ApiStatusState, action: ApiStatusAction): ApiStatusState {
  switch (action.type) {
    case 'START_CALL': {
      const { id, endpoint, method } = action.payload;
      const newCall: ApiCallInfo = {
        id,
        endpoint,
        method,
        status: ApiStatus.LOADING,
        startTime: new Date(),
        retryCount: 0,
        maxRetries: 3
      };
      
      const newActiveCalls = new Map(state.activeCalls);
      newActiveCalls.set(id, newCall);
      
      return {
        ...state,
        activeCalls: newActiveCalls,
        lastUpdate: new Date()
      };
    }

    case 'COMPLETE_CALL': {
      const { id, success, error } = action.payload;
      const call = state.activeCalls.get(id);
      
      if (!call) return state;
      
      const endTime = new Date();
      const duration = endTime.getTime() - call.startTime.getTime();
      
      const updatedCall: ApiCallInfo = {
        ...call,
        status: success ? ApiStatus.SUCCESS : ApiStatus.ERROR,
        endTime,
        duration,
        error
      };
      
      const newActiveCalls = new Map(state.activeCalls);
      newActiveCalls.set(id, updatedCall);
      
      // Remove completed calls after a delay
      setTimeout(() => {
        newActiveCalls.delete(id);
      }, 5000);
      
      let newRecentErrors = state.recentErrors;
      if (error) {
        newRecentErrors = [error, ...state.recentErrors].slice(0, 50);
      }
      
      return {
        ...state,
        activeCalls: newActiveCalls,
        recentErrors: newRecentErrors,
        lastUpdate: new Date()
      };
    }

    case 'RETRY_CALL': {
      const { id } = action.payload;
      const call = state.activeCalls.get(id);
      
      if (!call) return state;
      
      const updatedCall: ApiCallInfo = {
        ...call,
        status: ApiStatus.RETRYING,
        retryCount: call.retryCount + 1
      };
      
      const newActiveCalls = new Map(state.activeCalls);
      newActiveCalls.set(id, updatedCall);
      
      return {
        ...state,
        activeCalls: newActiveCalls,
        lastUpdate: new Date()
      };
    }

    case 'ADD_ERROR': {
      const error = action.payload;
      const newRecentErrors = [error, ...state.recentErrors].slice(0, 50);
      
      return {
        ...state,
        recentErrors: newRecentErrors,
        lastUpdate: new Date()
      };
    }

    case 'UPDATE_SERVICE': {
      const service = action.payload;
      const newServices = new Map(state.services);
      newServices.set(service.name, service);
      
      // Update global status based on service statuses
      let globalStatus = ServiceStatus.OPERATIONAL;
      const serviceHealthArray = Array.from(newServices.values());
      
      // Priority order: MAJOR_OUTAGE > PARTIAL_OUTAGE > DEGRADED > OPERATIONAL
      for (const serviceHealth of serviceHealthArray) {
        switch (serviceHealth.status) {
          case ServiceStatus.MAJOR_OUTAGE:
            globalStatus = ServiceStatus.MAJOR_OUTAGE;
            break;
          case ServiceStatus.PARTIAL_OUTAGE:
            if (globalStatus === ServiceStatus.OPERATIONAL || globalStatus === ServiceStatus.DEGRADED) {
              globalStatus = ServiceStatus.PARTIAL_OUTAGE;
            }
            break;
          case ServiceStatus.DEGRADED:
            if (globalStatus === ServiceStatus.OPERATIONAL) {
              globalStatus = ServiceStatus.DEGRADED;
            }
            break;
          default:
            // Keep current status
            break;
        }
        
        // Early exit if we reach the highest priority
        if (globalStatus === ServiceStatus.MAJOR_OUTAGE) {
          break;
        }
      }
      
      return {
        ...state,
        services: newServices,
        globalStatus,
        lastUpdate: new Date()
      };
    }

    case 'SET_CONNECTION_STATUS': {
      return {
        ...state,
        connectionStatus: action.payload,
        lastUpdate: new Date()
      };
    }

    case 'ADD_NOTIFICATION': {
      const notification = action.payload;
      const newNotifications = [notification, ...state.notifications];
      
      // Auto-remove notification if specified
      if (notification.autoHide) {
        setTimeout(() => {
          // This would need to be handled differently in a real implementation
          // to avoid stale closures
        }, notification.autoHide);
      }
      
      return {
        ...state,
        notifications: newNotifications,
        lastUpdate: new Date()
      };
    }

    case 'REMOVE_NOTIFICATION': {
      const notificationId = action.payload;
      const newNotifications = state.notifications.filter(n => n.id !== notificationId);
      
      return {
        ...state,
        notifications: newNotifications,
        lastUpdate: new Date()
      };
    }

    case 'CLEAR_OLD_DATA': {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const newRecentErrors = state.recentErrors.filter(error => error.timestamp > oneHourAgo);
      
      return {
        ...state,
        recentErrors: newRecentErrors,
        lastUpdate: new Date()
      };
    }

    default:
      return state;
  }
}

/**
 * API Status Context
 */
const ApiStatusContext = createContext<{
  state: ApiStatusState;
  dispatch: React.Dispatch<ApiStatusAction>;
  startApiCall: (endpoint: string, method: string) => string;
  completeApiCall: (id: string, success: boolean, error?: ApiError) => void;
  retryApiCall: (id: string) => void;
  addNotification: (notification: Omit<ApiNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  getServiceStatus: (serviceName: string) => ServiceHealth | undefined;
  isOnline: () => boolean;
} | null>(null);

/**
 * API Status Provider
 */
export const ApiStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(apiStatusReducer, initialState);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      const status = navigator.onLine ? 'online' : 'offline';
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Check connection speed
    const checkConnectionSpeed = async () => {
      try {
        const startTime = Date.now();
        await fetch('/api/health', { method: 'HEAD' });
        const duration = Date.now() - startTime;
        
        if (duration > 3000) {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'slow' });
        } else if (navigator.onLine) {
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'online' });
        }
      } catch (error) {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline' });
      }
    };

    // Check connection speed every 30 seconds
    const speedCheckInterval = setInterval(checkConnectionSpeed, 30000);
    checkConnectionSpeed(); // Initial check

    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
      clearInterval(speedCheckInterval);
    };
  }, []);

  // Listen to real-time API errors
  useEffect(() => {
    const handleApiError = (data: any) => {
      const apiError: ApiError = {
        name: 'ApiError',
        message: data.error || 'Unknown API error',
        type: data.type || ApiErrorType.UNKNOWN_ERROR,
        severity: data.severity || ApiErrorSeverity.MEDIUM,
        statusCode: data.statusCode,
        endpoint: data.endpoint,
        method: data.method,
        requestId: data.errorId,
        timestamp: new Date(data.timestamp),
        retryable: data.retryable || false,
        userMessage: data.userMessage || 'Der opstod en fejl',
        correlationId: data.sessionId
      };

      dispatch({ type: 'ADD_ERROR', payload: apiError });

      // Add user notification for high/critical errors
      if (apiError.severity === ApiErrorSeverity.HIGH || apiError.severity === ApiErrorSeverity.CRITICAL) {
        const notification: Omit<ApiNotification, 'id' | 'timestamp'> = {
          type: 'error',
          title: 'API Fejl',
          message: apiError.userMessage,
          dismissible: true,
          autoHide: 10000
        };
        
        addNotification(notification);
      }
    };

    realTimeMonitor.on('api-error', handleApiError);

    return () => {
      realTimeMonitor.off('api-error', handleApiError);
    };
  }, []);

  // Clean up old data periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      dispatch({ type: 'CLEAR_OLD_DATA' });
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Helper functions
  const startApiCall = (endpoint: string, method: string): string => {
    const id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'START_CALL', payload: { id, endpoint, method } });
    return id;
  };

  const completeApiCall = (id: string, success: boolean, error?: ApiError): void => {
    dispatch({ type: 'COMPLETE_CALL', payload: { id, success, error } });
  };

  const retryApiCall = (id: string): void => {
    dispatch({ type: 'RETRY_CALL', payload: { id } });
  };

  const addNotification = (notification: Omit<ApiNotification, 'id' | 'timestamp'>): void => {
    const fullNotification: ApiNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  };

  const removeNotification = (id: string): void => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const getServiceStatus = (serviceName: string): ServiceHealth | undefined => {
    return state.services.get(serviceName);
  };

  const isOnline = (): boolean => {
    return state.connectionStatus === 'online';
  };

  const contextValue = {
    state,
    dispatch,
    startApiCall,
    completeApiCall,
    retryApiCall,
    addNotification,
    removeNotification,
    getServiceStatus,
    isOnline
  };

  return (
    <ApiStatusContext.Provider value={contextValue}>
      {children}
    </ApiStatusContext.Provider>
  );
};

/**
 * Hook to use API Status
 */
export const useApiStatus = () => {
  const context = useContext(ApiStatusContext);
  if (!context) {
    throw new Error('useApiStatus must be used within an ApiStatusProvider');
  }
  return context;
};

/**
 * Hook for API calls with automatic status tracking
 */
export const useApiCall = () => {
  const { startApiCall, completeApiCall, retryApiCall } = useApiStatus();

  const executor: ApiCallExecutor = {
    startApiCall,
    completeApiCall,
    retryApiCall
  };

  // Simple wrapper functions without generics to avoid TSX parsing issues
  const executeApiCall = (apiCall: () => Promise<any>, endpoint: string, method: string = 'GET'): Promise<any> => {
    return executeApiCallHelper(apiCall, endpoint, method, executor);
  };

  const executeApiCallWithRetry = (
    apiCall: () => Promise<any>, 
    endpoint: string, 
    method: string = 'GET', 
    maxRetries: number = 3
  ): Promise<any> => {
    return executeApiCallWithRetryHelper(apiCall, endpoint, method, maxRetries, executor);
  };

  return {
    executeApiCall,
    executeApiCallWithRetry
  };
};