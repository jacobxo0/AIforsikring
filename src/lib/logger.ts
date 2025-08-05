/**
 * Central logging system for AI Forsikringsguiden
 * Formål: Struktureret logging med session tracking og GDPR compliance
 * Kilder: Pino logger, danske logning standarder
 */

import pino from 'pino';

// Logger configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isBuild = process.env.NODE_ENV === undefined || process.env.NEXT_PHASE === 'phase-production-build';

// Create logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Base logging configuration
  base: {
    service: 'ai-forsikringsguiden',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Development formatting - skip during build
  ...(isDevelopment && !isBuild && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '[{sessionId}] [{requestId}] {msg}',
        singleLine: false
      }
    }
  }),

  // Production structured logging
  ...(isProduction && {
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'token',
        'apiKey',
        'cpr',
        'socialSecurityNumber',
        'email',
        'phoneNumber',
        'address',
        'personalId'
      ],
      censor: '[REDACTED]'
    }
  })
};

// Create the base logger with safe initialization
let baseLogger: pino.Logger;

try {
  baseLogger = pino(loggerConfig);
} catch (error) {
  // Fallback to console during build or if pino fails
  console.warn('Logger initialization failed, falling back to console:', error);
  baseLogger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    child: () => baseLogger
  } as any;
}


/**
 * Log context interface
 */
export interface LogContext {
  sessionId?: string | null;
  requestId?: string;
  userId?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced logger with additional methods
 */
export const logger = {
  ...baseLogger,
  
  withSession(sessionId: string | null) {
    return baseLogger.child({ sessionId });
  },

  withRequest(requestId: string) {
    return baseLogger.child({ requestId });
  },

  withContext(context: LogContext) {
    return baseLogger.child(context);
  },

  audit(action: string, details?: Record<string, unknown>) {
    baseLogger.info({
      type: 'audit',
      action,
      timestamp: new Date().toISOString(),
      ...details
    }, `Audit: ${action}`);
  },

  performance(operation: string, duration: number, metadata?: Record<string, unknown>) {
    baseLogger.info({
      type: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    }, `Performance: ${operation} completed in ${duration}ms`);
  },

  security(event: string, details?: Record<string, unknown>) {
    baseLogger.warn({
      type: 'security',
      event,
      timestamp: new Date().toISOString(),
      ...details
    }, `Security: ${event}`);
  }
};

/**
 * Common log messages for consistency
 */
export const LogMessages = {
  // API Events
  ApiRequestStarted: (method: string, url: string) => `${method} ${url} - Request started`,
  ApiRequestCompleted: (method: string, url: string, duration: number) => 
    `${method} ${url} - Request completed in ${duration}ms`,
  ApiRequestFailed: (method: string, url: string, error: string) => 
    `${method} ${url} - Request failed: ${error}`,

  // User Events
  UserLogin: (userId: string) => `User logged in: ${userId}`,
  UserLogout: (userId: string) => `User logged out: ${userId}`,
  UserAction: (userId: string, action: string) => `User ${userId} performed: ${action}`,

  // Document Events
  DocumentUploaded: (documentId: string, type: string) => 
    `Document uploaded: ${documentId} (type: ${type})`,
  DocumentProcessed: (documentId: string, duration: number) => 
    `Document processed: ${documentId} in ${duration}ms`,
  DocumentError: (documentId: string, error: string) => 
    `Document processing failed: ${documentId} - ${error}`,

  // AI Events
  AiRequestStarted: (type: string) => `AI request started: ${type}`,
  AiRequestCompleted: (type: string, duration: number) => 
    `AI request completed: ${type} in ${duration}ms`,
  AiRequestFailed: (type: string, error: string) => 
    `AI request failed: ${type} - ${error}`,

  // System Events
  SystemStartup: () => 'AI Forsikringsguiden system starting up',
  SystemShutdown: () => 'AI Forsikringsguiden system shutting down',
  DatabaseConnected: () => 'Database connection established',
  DatabaseError: (error: string) => `Database error: ${error}`,

  // Security Events
  UnauthorizedAccess: (ip: string, resource: string) => 
    `Unauthorized access attempt from ${ip} to ${resource}`,
  RateLimitExceeded: (ip: string) => `Rate limit exceeded for ${ip}`,
  SuspiciousActivity: (details: string) => `Suspicious activity detected: ${details}`
} as const;

// Safe startup logging - only during runtime, not build
if (!isBuild && typeof window === 'undefined') {
  try {
    logger.info(LogMessages.SystemStartup());
  } catch (_) {
    console.log('AI Forsikringsguiden system starting up');
  }
}

export default logger; 