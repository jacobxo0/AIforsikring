/**
 * Monitoring Dashboard for AI Forsikringsguiden
 * Formål: Real-time system monitoring og analytics dashboard
 */

import { logger } from './logger';
import { sessionTracker } from './sessionTracking';
import { systemMetrics } from './systemMetrics';
import { memoryLeakDetector } from './memoryLeakDetection';

export interface DashboardMetrics {
  timestamp: number;
  system: {
    health: 'healthy' | 'warning' | 'critical';
    cpu: number;
    memory: number;
    uptime: number;
  };
  performance: {
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    successRate: number;
  };
  sessions: {
    activeSessions: number;
    totalSessions: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  errors: {
    totalErrors: number;
    criticalErrors: number;
    errorTrends: Array<{ timestamp: number; count: number }>;
  };
  resources: {
    memoryLeakRisk: 'low' | 'medium' | 'high';
    activeConnections: number;
    cacheHitRate: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: number;
  description: string;
}

export class MonitoringDashboard {
  private metrics: DashboardMetrics[] = [];
  private alerts: AlertRule[] = [];
  private alertHistory: Array<{ rule: AlertRule; timestamp: number; value: number }> = [];
  private updateInterval = 60000; // 1 minut
  private updateTimer?: NodeJS.Timeout;
  private maxMetricsHistory = 1440; // 24 timer ved 1 minut interval

  constructor() {
    this.setupDefaultAlerts();
    this.startMonitoring();
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.collectMetrics();
    }, this.updateInterval);

    // Start system metrics collection
    systemMetrics.startCollection();

    logger.info('Monitoring dashboard started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    systemMetrics.stopCollection();
    logger.info('Monitoring dashboard stopped');
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // System metrics
      const systemHealth = systemMetrics.getSystemHealth();
      const latestSystemMetrics = systemMetrics.getLatestMetrics();
      
      // Performance metrics
      const performanceStats = this.getPerformanceStats();
      
      // Session metrics
      const sessionStats = sessionTracker.getSessionAnalytics();
      
      // Memory metrics
      const memoryStats = memoryLeakDetector.getMemoryStats();
      
      const dashboardMetrics: DashboardMetrics = {
        timestamp,
        system: {
          health: systemHealth,
          cpu: latestSystemMetrics?.cpu.usage || 0,
          memory: latestSystemMetrics?.memory.percentage || 0,
          uptime: latestSystemMetrics?.uptime || 0
        },
        performance: {
          averageResponseTime: performanceStats.averageResponseTime,
          requestsPerMinute: performanceStats.requestsPerMinute,
          errorRate: performanceStats.errorRate,
          successRate: performanceStats.successRate
        },
        sessions: {
          activeSessions: sessionStats.activeSessions,
          totalSessions: sessionStats.totalSessions,
          averageSessionDuration: sessionStats.averageDuration,
          bounceRate: this.calculateBounceRate(sessionStats)
        },
        errors: {
          totalErrors: this.getTotalErrors(),
          criticalErrors: this.getCriticalErrors(),
          errorTrends: this.getErrorTrends()
        },
        resources: {
          memoryLeakRisk: memoryStats.leakRisk,
          activeConnections: 0, // Would need connection pool stats
          cacheHitRate: this.getCacheHitRate()
        }
      };

      this.metrics.push(dashboardMetrics);
      
      // Maintain history size
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift();
      }

      // Check alerts
      this.checkAlerts(dashboardMetrics);

      logger.debug('Dashboard metrics collected', {
        systemHealth,
        activeSessions: sessionStats.activeSessions,
        errorRate: performanceStats.errorRate
      });

    } catch (error) {
      logger.error('Failed to collect dashboard metrics', error);
    }
  }

  /**
   * Get latest dashboard metrics
   */
  getLatestMetrics(): DashboardMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 24): DashboardMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get system status summary
   */
  getSystemStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    components: Array<{ name: string; status: string; message?: string }>;
    uptime: number;
    lastUpdate: number;
  } {
    const latest = this.getLatestMetrics();
    if (!latest) {
      return {
        overall: 'warning',
        components: [{ name: 'monitoring', status: 'warning', message: 'No metrics available' }],
        uptime: 0,
        lastUpdate: 0
      };
    }

    const components = [
      {
        name: 'system',
        status: latest.system.health,
        message: `CPU: ${latest.system.cpu.toFixed(1)}%, Memory: ${latest.system.memory.toFixed(1)}%`
      },
      {
        name: 'performance',
        status: latest.performance.errorRate > 5 ? 'critical' : 
                latest.performance.errorRate > 2 ? 'warning' : 'healthy',
        message: `Response time: ${latest.performance.averageResponseTime.toFixed(0)}ms, Error rate: ${latest.performance.errorRate.toFixed(1)}%`
      },
      {
        name: 'sessions',
        status: latest.sessions.activeSessions > 1000 ? 'warning' : 'healthy',
        message: `Active sessions: ${latest.sessions.activeSessions}`
      },
      {
        name: 'memory',
        status: latest.resources.memoryLeakRisk === 'high' ? 'critical' :
                latest.resources.memoryLeakRisk === 'medium' ? 'warning' : 'healthy',
        message: `Memory leak risk: ${latest.resources.memoryLeakRisk}`
      }
    ];

    // Determine overall status
    const hasCritical = components.some(c => c.status === 'critical');
    const hasWarning = components.some(c => c.status === 'warning');
    
    const overall = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';

    return {
      overall,
      components,
      uptime: latest.system.uptime,
      lastUpdate: latest.timestamp
    };
  }

  /**
   * Add alert rule
   */
  addAlert(rule: Omit<AlertRule, 'id'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const alertRule: AlertRule = { ...rule, id };
    
    this.alerts.push(alertRule);
    
    logger.info('Alert rule added', { id, name: rule.name, metric: rule.metric });
    
    return id;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertRule[] {
    return this.alerts.filter(a => a.enabled);
  }

  /**
   * Get alert history
   */
  getAlertHistory(hours: number = 24): Array<{ rule: AlertRule; timestamp: number; value: number }> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alertHistory.filter(a => a.timestamp > cutoff);
  }

  /**
   * Setup default alerts
   */
  private setupDefaultAlerts(): void {
    const defaultAlerts: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High CPU Usage',
        metric: 'system.cpu',
        threshold: 80,
        operator: 'gt',
        severity: 'high',
        enabled: true,
        description: 'CPU usage is above 80%'
      },
      {
        name: 'High Memory Usage',
        metric: 'system.memory',
        threshold: 85,
        operator: 'gt',
        severity: 'high',
        enabled: true,
        description: 'Memory usage is above 85%'
      },
      {
        name: 'High Error Rate',
        metric: 'performance.errorRate',
        threshold: 5,
        operator: 'gt',
        severity: 'critical',
        enabled: true,
        description: 'Error rate is above 5%'
      },
      {
        name: 'Slow Response Time',
        metric: 'performance.averageResponseTime',
        threshold: 2000,
        operator: 'gt',
        severity: 'medium',
        enabled: true,
        description: 'Average response time is above 2 seconds'
      }
    ];

    for (const alert of defaultAlerts) {
      this.addAlert(alert);
    }
  }

  /**
   * Check alerts against current metrics
   */
  private checkAlerts(metrics: DashboardMetrics): void {
    for (const rule of this.alerts) {
      if (!rule.enabled) continue;

      const value = this.getMetricValue(metrics, rule.metric);
      if (value === null) continue;

      let triggered = false;
      
      switch (rule.operator) {
        case 'gt':
          triggered = value > rule.threshold;
          break;
        case 'lt':
          triggered = value < rule.threshold;
          break;
        case 'eq':
          triggered = value === rule.threshold;
          break;
      }

      if (triggered) {
        this.triggerAlert(rule, value);
      }
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, value: number): void {
    const now = Date.now();
    
    // Prevent spam - only trigger once per 5 minutes
    if (rule.lastTriggered && now - rule.lastTriggered < 300000) {
      return;
    }

    rule.lastTriggered = now;
    
    this.alertHistory.push({ rule, timestamp: now, value });
    
    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }

    const message = `Alert: ${rule.name} - ${rule.description} (Current: ${value}, Threshold: ${rule.threshold})`;
    
    switch (rule.severity) {
      case 'critical':
        logger.error(message, { alertId: rule.id, value, threshold: rule.threshold });
        break;
      case 'high':
        logger.error(message, { alertId: rule.id, value, threshold: rule.threshold });
        break;
      case 'medium':
        logger.warn(message, { alertId: rule.id, value, threshold: rule.threshold });
        break;
      case 'low':
        logger.info(message, { alertId: rule.id, value, threshold: rule.threshold });
        break;
    }
  }

  /**
   * Get metric value from dashboard metrics
   */
  private getMetricValue(metrics: DashboardMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  /**
   * Get performance statistics
   */
  private getPerformanceStats(): {
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    successRate: number;
  } {
    // This would integrate with actual performance monitoring
    // For now, return mock data
    return {
      averageResponseTime: 150,
      requestsPerMinute: 45,
      errorRate: 1.2,
      successRate: 98.8
    };
  }

  /**
   * Calculate bounce rate
   */
  private calculateBounceRate(sessionStats: any): number {
    // Bounce rate = sessions with only 1 page view / total sessions
    return sessionStats.totalSessions > 0 ? 
      ((sessionStats.totalSessions - sessionStats.activeSessions) / sessionStats.totalSessions) * 100 : 0;
  }

  /**
   * Get total errors
   */
  private getTotalErrors(): number {
    // This would integrate with error tracking
    return 0;
  }

  /**
   * Get critical errors
   */
  private getCriticalErrors(): number {
    // This would integrate with error tracking
    return 0;
  }

  /**
   * Get error trends
   */
  private getErrorTrends(): Array<{ timestamp: number; count: number }> {
    // This would integrate with error tracking
    return [];
  }

  /**
   * Get cache hit rate
   */
  private getCacheHitRate(): number {
    // This would integrate with cache monitoring
    return 85.5;
  }
}

export const monitoringDashboard = new MonitoringDashboard(); 