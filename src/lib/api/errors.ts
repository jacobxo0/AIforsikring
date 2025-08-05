/**
 * API Error Types and Classes for AI Forsikringsguiden
 * Formål: Centralized error handling og type definitions
 */

export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ApiErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ApiError extends Error {
  name: string;
  message: string;
  type: ApiErrorType;
  severity: ApiErrorSeverity;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  requestId?: string;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
  correlationId?: string;
  stack?: string;
  details?: Record<string, any>;
}

export class ApiErrorClass extends Error implements ApiError {
  public readonly type: ApiErrorType;
  public readonly severity: ApiErrorSeverity;
  public readonly statusCode?: number;
  public readonly endpoint?: string;
  public readonly method?: string;
  public readonly requestId?: string;
  public readonly timestamp: Date;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly correlationId?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    type: ApiErrorType = ApiErrorType.UNKNOWN_ERROR,
    severity: ApiErrorSeverity = ApiErrorSeverity.MEDIUM,
    options: Partial<ApiError> = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.severity = severity;
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.requestId = options.requestId;
    this.timestamp = options.timestamp || new Date();
    this.retryable = options.retryable ?? this.isRetryableByDefault(type);
    this.userMessage = options.userMessage || this.getDefaultUserMessage(type);
    this.correlationId = options.correlationId;
    this.details = options.details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorClass);
    }
  }

  private isRetryableByDefault(type: ApiErrorType): boolean {
    switch (type) {
      case ApiErrorType.NETWORK_ERROR:
      case ApiErrorType.TIMEOUT_ERROR:
      case ApiErrorType.RATE_LIMIT_ERROR:
      case ApiErrorType.SERVER_ERROR:
      case ApiErrorType.EXTERNAL_SERVICE_ERROR:
        return true;
      case ApiErrorType.AUTHENTICATION_ERROR:
      case ApiErrorType.AUTHORIZATION_ERROR:
      case ApiErrorType.VALIDATION_ERROR:
      case ApiErrorType.NOT_FOUND_ERROR:
        return false;
      default:
        return false;
    }
  }

  private getDefaultUserMessage(type: ApiErrorType): string {
    switch (type) {
      case ApiErrorType.NETWORK_ERROR:
        return 'Netværksfejl - tjek din internetforbindelse';
      case ApiErrorType.TIMEOUT_ERROR:
        return 'Anmodningen tog for lang tid - prøv igen';
      case ApiErrorType.AUTHENTICATION_ERROR:
        return 'Du skal logge ind for at fortsætte';
      case ApiErrorType.AUTHORIZATION_ERROR:
        return 'Du har ikke tilladelse til denne handling';
      case ApiErrorType.VALIDATION_ERROR:
        return 'Indtastede data er ikke gyldige';
      case ApiErrorType.NOT_FOUND_ERROR:
        return 'Den ønskede ressource blev ikke fundet';
      case ApiErrorType.RATE_LIMIT_ERROR:
        return 'For mange anmodninger - vent et øjeblik';
      case ApiErrorType.SERVER_ERROR:
        return 'Serverfejl - prøv igen senere';
      case ApiErrorType.DATABASE_ERROR:
        return 'Databasefejl - prøv igen senere';
      case ApiErrorType.EXTERNAL_SERVICE_ERROR:
        return 'Ekstern tjeneste utilgængelig - prøv igen senere';
      default:
        return 'Der opstod en uventet fejl';
    }
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      method: this.method,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      userMessage: this.userMessage,
      correlationId: this.correlationId,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Factory function to create API errors from HTTP responses
 */
export const createApiErrorFromResponse = (
  response: Response,
  endpoint: string,
  method: string,
  requestId?: string
): ApiError => {
  let type: ApiErrorType;
  let severity: ApiErrorSeverity;

  switch (response.status) {
    case 400:
      type = ApiErrorType.VALIDATION_ERROR;
      severity = ApiErrorSeverity.LOW;
      break;
    case 401:
      type = ApiErrorType.AUTHENTICATION_ERROR;
      severity = ApiErrorSeverity.MEDIUM;
      break;
    case 403:
      type = ApiErrorType.AUTHORIZATION_ERROR;
      severity = ApiErrorSeverity.MEDIUM;
      break;
    case 404:
      type = ApiErrorType.NOT_FOUND_ERROR;
      severity = ApiErrorSeverity.LOW;
      break;
    case 429:
      type = ApiErrorType.RATE_LIMIT_ERROR;
      severity = ApiErrorSeverity.MEDIUM;
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      type = ApiErrorType.SERVER_ERROR;
      severity = ApiErrorSeverity.HIGH;
      break;
    default:
      type = ApiErrorType.UNKNOWN_ERROR;
      severity = ApiErrorSeverity.MEDIUM;
  }

  return new ApiErrorClass(
    `HTTP ${response.status}: ${response.statusText}`,
    type,
    severity,
    {
      statusCode: response.status,
      endpoint,
      method,
      requestId,
      timestamp: new Date()
    }
  );
};

/**
 * Factory function to create API errors from network errors
 */
export const createNetworkError = (
  error: Error,
  endpoint: string,
  method: string,
  requestId?: string
): ApiError => {
  let type: ApiErrorType;
  
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    type = ApiErrorType.TIMEOUT_ERROR;
  } else {
    type = ApiErrorType.NETWORK_ERROR;
  }

  return new ApiErrorClass(
    error.message,
    type,
    ApiErrorSeverity.HIGH,
    {
      endpoint,
      method,
      requestId,
      timestamp: new Date(),
      details: {
        originalError: error.name,
        originalMessage: error.message
      }
    }
  );
}; 