/**
 * Analytics Engine for AI Forsikringsguiden
 * Formål: Advanced analytics for user behavior og system performance
 */

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

export interface AnalyticsEvent {
  eventId: string;
  sessionId: string;
  userId?: string;
  eventType: 'page_view' | 'click' | 'form_submit' | 'conversion' | 'error';
  timestamp: number;
  properties: Record<string, any>;
  metadata: {
    userAgent: string;
    path: string;
  };
}

export interface AnalyticsReport {
  reportId: string;
  name: string;
  timeRange: { start: number; end: number };
  metrics: {
    totalEvents: number;
    uniqueUsers: number;
    pageViews: number;
    conversions: number;
  };
  topPages: Array<{ path: string; views: number }>;
}

export class AnalyticsEngine {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 10000;

  track(
    sessionId: string,
    eventType: AnalyticsEvent['eventType'],
    properties: Record<string, any> = {},
    metadata: Partial<AnalyticsEvent['metadata']> = {}
  ): string {
    const eventId = this.generateEventId();
    
    const event: AnalyticsEvent = {
      eventId,
      sessionId,
      userId: properties.userId,
      eventType,
      timestamp: Date.now(),
      properties: this.sanitizeProperties(properties),
      metadata: {
        userAgent: metadata.userAgent || 'unknown',
        path: metadata.path || '/'
      }
    };

    this.events.push(event);
    
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    logger.debug('Analytics event tracked', {
      eventId,
      sessionId,
      eventType
    });

    performanceMonitor.recordMetric(`analytics.event.${eventType}`, 1, 'count');

    return eventId;
  }

  trackPageView(
    sessionId: string,
    path: string,
    title?: string,
    userId?: string
  ): string {
    return this.track(sessionId, 'page_view', {
      title,
      userId
    }, {
      path,
      userAgent: 'web'
    });
  }

  trackConversion(
    sessionId: string,
    conversionType: string,
    value?: number,
    userId?: string
  ): string {
    return this.track(sessionId, 'conversion', {
      conversionType,
      value,
      userId
    });
  }

  generateReport(
    timeRange: { start: number; end: number },
    reportName: string = 'Standard Report'
  ): AnalyticsReport {
    const filteredEvents = this.events.filter(
      e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );

    const reportId = this.generateReportId();
    
    const totalEvents = filteredEvents.length;
    const uniqueUsers = new Set(filteredEvents.map(e => e.userId).filter(Boolean)).size;
    const pageViews = filteredEvents.filter(e => e.eventType === 'page_view').length;
    const conversions = filteredEvents.filter(e => e.eventType === 'conversion').length;
    
    const pageViewCounts = new Map<string, number>();
    filteredEvents
      .filter(e => e.eventType === 'page_view')
      .forEach(e => {
        const path = e.metadata.path;
        pageViewCounts.set(path, (pageViewCounts.get(path) || 0) + 1);
      });

    const topPages = Array.from(pageViewCounts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      reportId,
      name: reportName,
      timeRange,
      metrics: {
        totalEvents,
        uniqueUsers,
        pageViews,
        conversions
      },
      topPages
    };
  }

  getRealTimeAnalytics(): {
    activeUsers: number;
    eventsLastHour: number;
    conversionRate: number;
  } {
    const oneHourAgo = Date.now() - 3600000;
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);
    
    const activeUsers = new Set(recentEvents.map(e => e.sessionId)).size;
    const eventsLastHour = recentEvents.length;
    
    const conversions = recentEvents.filter(e => e.eventType === 'conversion').length;
    const conversionRate = activeUsers > 0 ? (conversions / activeUsers) * 100 : 0;

    return {
      activeUsers,
      eventsLastHour,
      conversionRate
    };
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'ssn', 'cpr', 'email', 'phone'];

    for (const [key, value] of Object.entries(properties)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

export const analyticsEngine = new AnalyticsEngine(); 