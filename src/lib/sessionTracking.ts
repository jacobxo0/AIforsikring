/**
 * Advanced Session Tracking for AI Forsikringsguiden
 * Formål: Comprehensive session management med user journey tracking
 */

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

export interface SessionData {
  sessionId: string;
  userId?: string;
  correlationId: string;
  userAgent: string;
  ipAddress: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  actions: SessionAction[];
  metadata: Record<string, unknown>;
  isActive: boolean;
}

export interface SessionAction {
  actionId: string;
  type: 'page_view' | 'click' | 'form_submit' | 'api_call' | 'error';
  timestamp: number;
  data: Record<string, unknown>;
  success: boolean;
}

export interface UserJourney {
  userId: string;
  sessions: string[];
  totalSessions: number;
  firstVisit: number;
  lastVisit: number;
  totalPageViews: number;
  totalActions: number;
  conversionEvents: string[];
  segments: string[];
}

export class SessionTracker {
  private sessions = new Map<string, SessionData>();
  private userJourneys = new Map<string, UserJourney>();
  private correlationMap = new Map<string, string>();
  private cleanupInterval = 300000; // 5 minutter
  private sessionTimeout = 1800000; // 30 minutter
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanup();
  }

  /**
   * Create new session
   */
  createSession(
    userAgent: string,
    ipAddress: string,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): SessionData {
    const sessionId = this.generateSessionId();
    const correlationId = this.generateCorrelationId();
    
    const session: SessionData = {
      sessionId,
      userId,
      correlationId,
      userAgent,
      ipAddress: this.maskIpAddress(ipAddress),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      actions: [],
      metadata: this.sanitizeMetadata(metadata),
      isActive: true
    };

    this.sessions.set(sessionId, session);
    this.correlationMap.set(correlationId, sessionId);

    // Update user journey if userId provided
    if (userId) {
      this.updateUserJourney(userId, sessionId);
    }

    logger.info('New session created', {
      sessionId,
      correlationId,
      userId
    });

    performanceMonitor.recordMetric('session.created', 1, 'count');

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      this.endSession(sessionId, 'timeout');
      return null;
    }

    return session;
  }

  /**
   * Get session by correlation ID
   */
  getSessionByCorrelation(correlationId: string): SessionData | null {
    const sessionId = this.correlationMap.get(correlationId);
    return sessionId ? this.getSession(sessionId) : null;
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string, metadata?: Record<string, unknown>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return false;

    session.lastActivity = Date.now();
    
    if (metadata) {
      session.metadata = {
        ...session.metadata,
        ...this.sanitizeMetadata(metadata)
      };
    }

    return true;
  }

  /**
   * Track session action
   */
  trackAction(
    sessionId: string,
    type: SessionAction['type'],
    data: Record<string, unknown> = {}
  ): string | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return null;

    const actionId = this.generateActionId();
    const action: SessionAction = {
      actionId,
      type,
      timestamp: Date.now(),
      data: this.sanitizeMetadata(data),
      success: true
    };

    session.actions.push(action);
    session.lastActivity = Date.now();

    if (type === 'page_view') {
      session.pageViews++;
    }

    if (session.actions.length > 100) {
      session.actions.shift();
    }

    logger.debug('Session action tracked', {
      sessionId,
      actionId,
      type,
      userId: session.userId
    });

    return actionId;
  }

  /**
   * Track error in session
   */
  trackError(
    sessionId: string,
    error: Error,
    context: Record<string, unknown> = {}
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const errorAction: SessionAction = {
      actionId: this.generateActionId(),
      type: 'error',
      timestamp: Date.now(),
      data: {
        errorName: error.name,
        errorMessage: error.message,
        context: this.sanitizeMetadata(context)
      },
      success: false
    };

    session.actions.push(errorAction);
    session.lastActivity = Date.now();

    logger.error('Session error tracked', error, {
      sessionId,
      userId: session.userId
    });
  }

  /**
   * End session
   */
  endSession(sessionId: string, reason: 'logout' | 'timeout' | 'manual' = 'manual'): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    const sessionDuration = Date.now() - session.startTime;

    logger.info('Session ended', {
      sessionId,
      userId: session.userId,
      reason,
      duration: sessionDuration,
      pageViews: session.pageViews,
      actions: session.actions.length
    });

    performanceMonitor.recordMetric('session.duration', sessionDuration, 'ms');

    // Update user journey
    if (session.userId) {
      this.finalizeUserJourneySession(session.userId, sessionId);
    }

    return true;
  }

  /**
   * Get user journey
   */
  getUserJourney(userId: string): UserJourney | null {
    return this.userJourneys.get(userId) || null;
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(timeRange: number = 3600000): {
    totalSessions: number;
    activeSessions: number;
    averageDuration: number;
    averagePageViews: number;
    topActions: Array<{ type: string; count: number }>;
    errorRate: number;
  } {
    const cutoff = Date.now() - timeRange;
    const recentSessions = Array.from(this.sessions.values())
      .filter(s => s.startTime > cutoff);

    const activeSessions = recentSessions.filter(s => s.isActive).length;
    
    const totalDuration = recentSessions
      .filter(s => !s.isActive)
      .reduce((sum, s) => sum + (s.lastActivity - s.startTime), 0);
    
    const completedSessions = recentSessions.filter(s => !s.isActive).length;
    const averageDuration = completedSessions > 0 ? totalDuration / completedSessions : 0;
    
    const totalPageViews = recentSessions.reduce((sum, s) => sum + s.pageViews, 0);
    const averagePageViews = recentSessions.length > 0 ? totalPageViews / recentSessions.length : 0;

    // Count action types
    const actionCounts = new Map<string, number>();
    let totalActions = 0;
    let errorActions = 0;

    for (const session of recentSessions) {
      for (const action of session.actions) {
        totalActions++;
        if (action.type === 'error') errorActions++;
        
        const count = actionCounts.get(action.type) || 0;
        actionCounts.set(action.type, count + 1);
      }
    }

    const topActions = Array.from(actionCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorRate = totalActions > 0 ? (errorActions / totalActions) * 100 : 0;

    return {
      totalSessions: recentSessions.length,
      activeSessions,
      averageDuration,
      averagePageViews,
      topActions,
      errorRate
    };
  }

  /**
   * Update user journey
   */
  private updateUserJourney(userId: string, sessionId: string): void {
    let journey = this.userJourneys.get(userId);
    
    if (!journey) {
      journey = {
        userId,
        sessions: [],
        totalSessions: 0,
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalPageViews: 0,
        totalActions: 0,
        conversionEvents: [],
        segments: []
      };
    }

    journey.sessions.push(sessionId);
    journey.totalSessions++;
    journey.lastVisit = Date.now();

    this.userJourneys.set(userId, journey);
  }

  /**
   * Finalize user journey session
   */
  private finalizeUserJourneySession(userId: string, sessionId: string): void {
    const journey = this.userJourneys.get(userId);
    const session = this.sessions.get(sessionId);
    
    if (!journey || !session) return;

    journey.totalPageViews += session.pageViews;
    journey.totalActions += session.actions.length;

    // Check for conversion events
    const conversionActions = session.actions.filter(a => 
      a.type === 'form_submit' && a.data.formType === 'contact'
    );
    
    for (const action of conversionActions) {
      journey.conversionEvents.push(action.actionId);
    }

    this.userJourneys.set(userId, journey);
  }

  /**
   * Sanitize metadata for GDPR compliance
   */
  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'ssn', 'cpr', 'email', 'phone'];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Mask IP address for privacy
   */
  private maskIpAddress(ip: string): string {
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::xxxx';
    } else {
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.xxx';
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Generate action ID
   */
  private generateActionId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Cleanup expired sessions
   */
  private performCleanup(): void {
    const now = Date.now();
    let cleanedSessions = 0;
    let cleanedJourneys = 0;

    // Clean expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        if (session.isActive) {
          this.endSession(sessionId, 'timeout');
        }
        
        this.sessions.delete(sessionId);
        this.correlationMap.delete(session.correlationId);
        cleanedSessions++;
      }
    }

    // Clean old user journeys (older than 30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    for (const [userId, journey] of this.userJourneys.entries()) {
      if (journey.lastVisit < thirtyDaysAgo) {
        this.userJourneys.delete(userId);
        cleanedJourneys++;
      }
    }

    if (cleanedSessions > 0 || cleanedJourneys > 0) {
      logger.info('Session cleanup completed', {
        cleanedSessions,
        cleanedJourneys,
        activeSessions: this.sessions.size,
        activeJourneys: this.userJourneys.size
      });
    }
  }

  /**
   * Stop session tracking
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export const sessionTracker = new SessionTracker(); 