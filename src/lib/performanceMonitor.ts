/**
 * Performance Monitor for AI Forsikringsguiden
 * Formål: Comprehensive performance tracking og alerting
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
}

export interface PerformanceAlert {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private timers: Map<string, number> = new Map();
  private maxMetricsPerKey = 1000;

  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'],
    tags: Record<string, string> = {}
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(metric);

    if (metricsList.length > this.maxMetricsPerKey) {
      metricsList.shift();
    }

    this.checkAlerts(metric);
  }

  startTimer(timerName: string): void {
    this.timers.set(timerName, performance.now());
  }

  endTimer(timerName: string, tags: Record<string, string> = {}): number {
    const startTime = this.timers.get(timerName);
    if (!startTime) {
      logger.warn('Timer not found', { timerName });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(timerName);

    this.recordMetric(timerName, duration, 'ms', tags);
    return duration;
  }

  async timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, 'ms', {
        ...tags,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, 'ms', {
        ...tags,
        status: 'error'
      });
      
      throw error;
    }
  }

  recordMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      
      this.recordMetric('memory.heap.used', memUsage.heapUsed, 'bytes');
      this.recordMetric('memory.heap.total', memUsage.heapTotal, 'bytes');
      this.recordMetric('memory.rss', memUsage.rss, 'bytes');
    }
  }

  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    size?: number
  ): void {
    const tags = {
      method,
      path: this.sanitizePath(path),
      status: statusCode.toString()
    };

    this.recordMetric('http.request.duration', duration, 'ms', tags);
    this.recordMetric('http.request.count', 1, 'count', tags);
    
    if (size !== undefined) {
      this.recordMetric('http.response.size', size, 'bytes', tags);
    }
  }

  getAggregatedMetrics(
    metricName: string,
    timeRange: number = 300000
  ): {
    count: number;
    min: number;
    max: number;
    avg: number;
  } | null {
    const metrics = this.metrics.get(metricName);
    if (!metrics) return null;

    const now = Date.now();
    const recentMetrics = metrics
      .filter(m => now - m.timestamp <= timeRange)
      .map(m => m.value);

    if (recentMetrics.length === 0) return null;

    const count = recentMetrics.length;
    const min = Math.min(...recentMetrics);
    const max = Math.max(...recentMetrics);
    const avg = recentMetrics.reduce((sum, val) => sum + val, 0) / count;

    return { count, min, max, avg };
  }

  addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
  }

  private checkAlerts(metric: PerformanceMetric): void {
    const relevantAlerts = this.alerts.filter(alert => alert.metric === metric.name);
    
    for (const alert of relevantAlerts) {
      let triggered = false;
      
      if (alert.operator === 'gt') {
        triggered = metric.value > alert.threshold;
      } else if (alert.operator === 'lt') {
        triggered = metric.value < alert.threshold;
      }
      
      if (triggered) {
        this.triggerAlert(alert, metric);
      }
    }
  }

  private triggerAlert(alert: PerformanceAlert, metric: PerformanceMetric): void {
    const alertMessage = `Performance Alert: ${alert.message} - ${metric.name} = ${metric.value}${metric.unit}`;
    
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.error(alertMessage, { alert, metric });
    } else if (alert.severity === 'medium') {
      logger.warn(alertMessage, { alert, metric });
    } else {
      logger.info(alertMessage, { alert, metric });
    }
  }

  private sanitizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, '')
      .toLowerCase();
  }
}

export const performanceMonitor = new PerformanceMonitor();

export const PerfUtils = {
  recordDbQuery: (operation: string, duration: number, rowCount?: number) => {
    performanceMonitor.recordMetric('db.query.duration', duration, 'ms', {
      operation,
      rows: rowCount?.toString() || 'unknown'
    });
  },

  recordCacheHit: (key: string, hit: boolean) => {
    performanceMonitor.recordMetric('cache.hit', hit ? 1 : 0, 'count', {
      key: key.substring(0, 50),
      type: hit ? 'hit' : 'miss'
    });
  },

  recordAiProcessing: (operation: string, duration: number, tokens?: number) => {
    performanceMonitor.recordMetric('ai.processing.duration', duration, 'ms', {
      operation,
      tokens: tokens?.toString() || 'unknown'
    });
  },

  recordMemorySnapshot: () => {
    performanceMonitor.recordMemoryUsage();
  }
}; 