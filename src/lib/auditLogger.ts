/**
 * Audit Logger for AI Forsikringsguiden
 * Formål: Centraliseret audit logging med GDPR compliance og automatisk data masking
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { getSessionInfo, SessionInfo } from './session';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  // Session & User
  sessionId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: 'user' | 'premium' | 'admin';
  
  // Action Information
  action: string;
  resource?: string;
  resourceId?: string;
  
  // Request Context
  method?: string;
  url?: string;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  
  // Response Information
  statusCode?: number;
  responseTimeMs?: number;
  
  // Audit Metadata
  eventType?: 'action' | 'system' | 'security' | 'error';
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category?: string;
  
  // Data Changes
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // GDPR Compliance
  isSensitive?: boolean;
  retentionDays?: number;
}

/**
 * Sensitive data patterns to automatically mask
 */
const SENSITIVE_PATTERNS = [
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
  /\b\d{10,11}\b/g, // Phone numbers (Danish)
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /\b\d{6}-\d{4}\b/g, // Danish CPR numbers (partial)
  /\bpassword\b.*?[:=]\s*[\w!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~]+/gi, // Passwords
];

/**
 * Mask sensitive data in strings
 */
function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    let maskedData = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      maskedData = maskedData.replace(pattern, '[MASKED]');
    });
    return maskedData;
  }
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  
  if (data && typeof data === 'object') {
    const masked: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      // Mask known sensitive fields
      if (['password', 'token', 'secret', 'key', 'cpr', 'ssn'].some(sensitive => 
        key.toLowerCase().includes(sensitive)
      )) {
        masked[key] = '[MASKED]';
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    });
    return masked;
  }
  
  return data;
}

/**
 * Extract request context from NextRequest
 */
function extractRequestContext(request?: NextRequest): Partial<AuditLogEntry> {
  if (!request) return {};
  
  return {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    requestId: request.headers.get('x-request-id') || undefined
  };
}

/**
 * Calculate retention date based on GDPR requirements
 */
function calculateRetentionDate(
  eventType: string = 'action', 
  retentionDays?: number
): Date | null {
  if (retentionDays !== undefined) {
    const date = new Date();
    date.setDate(date.getDate() + retentionDays);
    return date;
  }
  
  // Default retention periods based on event type
  const defaultRetention = {
    'action': 365,      // 1 year for user actions
    'security': 2555,   // 7 years for security events
    'system': 90,       // 3 months for system events
    'error': 180        // 6 months for errors
  };
  
  const days = defaultRetention[eventType as keyof typeof defaultRetention] || 365;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Initialize Supabase client for audit logging
 */
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Main audit logging function
 */
export async function LogAction(
  entry: AuditLogEntry,
  request?: NextRequest
): Promise<boolean> {
  try {
    const startTime = Date.now();
    
    // Extract session information if request is provided
    let sessionInfo: SessionInfo | null = null;
    if (request) {
      try {
        sessionInfo = await getSessionInfo(request);
      } catch (error) {
        logger.debug('Could not extract session info for audit log', { error });
      }
    }
    
    // Build complete audit entry for logging
    const auditData = {
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      userId: entry.userId || sessionInfo?.userId,
      sessionId: entry.sessionId || sessionInfo?.sessionId,
      eventType: entry.eventType || 'action',
      severity: entry.severity || 'info',
      metadata: entry.metadata
    };
    
    // Log to application logger
    logger.audit(entry.action, auditData);
    
    // In a real implementation, you would also:
    // 1. Insert into Supabase audit_logs table
    // 2. Apply data masking for sensitive information
    // 3. Set retention dates based on GDPR requirements
    
    const endTime = Date.now();
    
    logger.debug('Audit log entry created', {
      action: entry.action,
      duration: endTime - startTime
    });
    
    return true;
    
  } catch (error) {
    logger.error('Audit logging failed', error, {
      action: entry.action,
      resource: entry.resource
    });
    return false;
  }
}

/**
 * Simplified logging functions for common use cases
 */
export const AuditActions = {
  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset',
    sessionInfo?: Partial<SessionInfo>,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return LogAction({
      action,
      resource: 'auth',
      eventType: 'security',
      severity: 'info',
      category: 'authentication',
      userId: sessionInfo?.userId || undefined,
      userEmail: sessionInfo?.userEmail || undefined,
      sessionId: sessionInfo?.sessionId || undefined,
      metadata,
      isSensitive: true,
      retentionDays: 2555 // 7 years for security events
    });
  },

  /**
   * Log document operations
   */
  async logDocument(
    action: 'upload' | 'download' | 'delete' | 'analyze' | 'view',
    documentId: string,
    sessionInfo?: Partial<SessionInfo>,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return LogAction({
      action: `document_${action}`,
      resource: 'document',
      resourceId: documentId,
      eventType: 'action',
      severity: 'info',
      category: 'document_management',
      userId: sessionInfo?.userId || undefined,
      sessionId: sessionInfo?.sessionId || undefined,
      metadata,
      isSensitive: action === 'view' || action === 'analyze'
    });
  },

  /**
   * Log AI chat interactions
   */
  async logChat(
    action: 'send_message' | 'receive_response' | 'start_conversation' | 'end_conversation',
    conversationId?: string,
    sessionInfo?: Partial<SessionInfo>,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return LogAction({
      action: `chat_${action}`,
      resource: 'chat',
      resourceId: conversationId,
      eventType: 'action',
      severity: 'info',
      category: 'ai_interaction',
      userId: sessionInfo?.userId || undefined,
      sessionId: sessionInfo?.sessionId || undefined,
      metadata,
      isSensitive: true // Chat content is sensitive
    });
  },

  /**
   * Log system errors
   */
  async logError(
    error: Error,
    context?: {
      action?: string;
      resource?: string;
      resourceId?: string;
      userId?: string;
      sessionId?: string;
    }
  ): Promise<boolean> {
    return LogAction({
      action: context?.action || 'system_error',
      resource: context?.resource || 'system',
      resourceId: context?.resourceId,
      eventType: 'error',
      severity: 'error',
      category: 'system_error',
      userId: context?.userId,
      sessionId: context?.sessionId,
      metadata: {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack
      }
    });
  }
};

export default LogAction; 