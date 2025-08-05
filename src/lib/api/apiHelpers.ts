import { ApiError } from './errors';

export interface ApiCallExecutor {
  startApiCall: (endpoint: string, method: string) => string;
  completeApiCall: (id: string, success: boolean, error?: ApiError) => void;
  retryApiCall: (id: string) => void;
}

/**
 * Execute an API call with automatic status tracking
 */
export const executeApiCall = async <T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  method: string = 'GET',
  executor: ApiCallExecutor
): Promise<T> => {
  const callId = executor.startApiCall(endpoint, method);
  
  try {
    const result = await apiCall();
    executor.completeApiCall(callId, true);
    return result;
  } catch (error) {
    const apiError = error as ApiError;
    executor.completeApiCall(callId, false, apiError);
    throw error;
  }
};

/**
 * Execute an API call with retry logic and automatic status tracking
 */
export const executeApiCallWithRetry = async <T>(
  apiCall: () => Promise<T>,
  endpoint: string,
  method: string = 'GET',
  maxRetries: number = 3,
  executor: ApiCallExecutor
): Promise<T> => {
  const callId = executor.startApiCall(endpoint, method);
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        executor.retryApiCall(callId);
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      
      const result = await apiCall();
      executor.completeApiCall(callId, true);
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        const apiError = error as ApiError;
        executor.completeApiCall(callId, false, apiError);
        throw error;
      }
    }
  }
  
  throw lastError;
}; 