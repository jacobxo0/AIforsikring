/**
 * System Metrics Monitoring for AI Forsikringsguiden
 * Formål: Real-time system health monitoring og alerting
 */

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';
import * as os from 'os';

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  timestamp: number;
}

export class SystemMetricsCollector {
  private metricsHistory: SystemMetrics[] = [];
  private timer?: NodeJS.Timeout;

  startCollection(): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    logger.info('System metrics collection started');
  }

  stopCollection(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics();
      
      this.metricsHistory.push(metrics);
      
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      performanceMonitor.recordMetric('system.cpu.usage', metrics.cpu.usage, 'percent');
      performanceMonitor.recordMetric('system.memory.usage', metrics.memory.percentage, 'percent');

      this.checkAlerts(metrics);

    } catch (error) {
      logger.error('Failed to collect system metrics', error);
    }
  }

  private async gatherSystemMetrics(): Promise<SystemMetrics> {
    
    const loadAverage = os.loadavg();
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;

    return {
      cpu: {
        usage: this.calculateCpuUsage(),
        loadAverage
      },
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: memPercentage
      },
      uptime: os.uptime(),
      timestamp: Date.now()
    };
  }

  private calculateCpuUsage(): number {
    const cpus = os.cpus();
    
    let totalIdle = 0;
    let totalTick = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    return 100 - (100 * idle / total);
  }

  private checkAlerts(metrics: SystemMetrics): void {
    if (metrics.cpu.usage > 80) {
      logger.warn('High CPU usage detected', { usage: metrics.cpu.usage });
    }

    if (metrics.memory.percentage > 85) {
      logger.warn('High memory usage detected', { usage: metrics.memory.percentage });
    }
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  getSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const latest = this.getLatestMetrics();
    if (!latest) return 'warning';

    if (latest.cpu.usage > 90 || latest.memory.percentage > 95) {
      return 'critical';
    }

    if (latest.cpu.usage > 70 || latest.memory.percentage > 80) {
      return 'warning';
    }

    return 'healthy';
  }
}

export const systemMetrics = new SystemMetricsCollector(); 