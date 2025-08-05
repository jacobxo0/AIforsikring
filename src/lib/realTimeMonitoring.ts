/**
 * Real-Time Monitoring for AI Forsikringsguiden
 * Formål: Live monitoring med WebSocket support og real-time dashboards
 */

import { logger } from './logger';
import { systemMetrics } from './systemMetrics';

export interface MonitoringEvent {
  id: string;
  type: 'metric' | 'alert' | 'error' | 'system';
  timestamp: number;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
}

export interface LiveMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  activeUsers: number;
  errorRate: number;
  responseTime: number;
}

export class RealTimeMonitor {
  private subscribers = new Set<(event: MonitoringEvent) => void>();
  private metricsSubscribers = new Set<(metrics: LiveMetrics) => void>();
  private eventHistory: MonitoringEvent[] = [];
  private updateTimer?: NodeJS.Timeout;
  private isRunning = false;

  /**
   * Start real-time monitoring
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateTimer = setInterval(() => {
      this.collectAndBroadcastMetrics();
    }, 5000);

    logger.info('Real-time monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    logger.info('Real-time monitoring stopped');
  }

  /**
   * Subscribe to monitoring events
   */
  subscribe(callback: (event: MonitoringEvent) => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Subscribe to live metrics
   */
  subscribeToMetrics(callback: (metrics: LiveMetrics) => void): () => void {
    this.metricsSubscribers.add(callback);
    
    return () => {
      this.metricsSubscribers.delete(callback);
    };
  }

  /**
   * Emit monitoring event
   */
  emit(
    type: MonitoringEvent['type'],
    data: any,
    severity: MonitoringEvent['severity'] = 'info',
    source: string = 'system'
  ): void {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      data,
      severity,
      source
    };

    this.eventHistory.push(event);
    
    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    // Broadcast to subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error in monitoring event subscriber', error);
      }
    });

    logger.debug('Monitoring event emitted', {
      id: event.id,
      type,
      severity,
      source
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 100): MonitoringEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Collect and broadcast current metrics
   */
  private collectAndBroadcastMetrics(): void {
    try {
      const systemStatus = systemMetrics.getLatestMetrics();
      
      const liveMetrics: LiveMetrics = {
        timestamp: Date.now(),
        cpu: systemStatus?.cpu.usage || 0,
        memory: systemStatus?.memory.percentage || 0,
        activeUsers: 0,
        errorRate: 0,
        responseTime: 150
      };

      // Broadcast to metrics subscribers
      this.metricsSubscribers.forEach(callback => {
        try {
          callback(liveMetrics);
        } catch (error) {
          logger.error('Error in metrics subscriber', error);
        }
      });

      // Check for threshold breaches and emit alerts
      this.checkThresholds(liveMetrics);

    } catch (error) {
      logger.error('Error collecting live metrics', error);
    }
  }

  /**
   * Check metric thresholds and emit alerts
   */
  private checkThresholds(metrics: LiveMetrics): void {
    if (metrics.cpu > 90) {
      this.emit('alert', {
        metric: 'cpu',
        value: metrics.cpu,
        message: `Critical CPU usage: ${metrics.cpu.toFixed(1)}%`
      }, 'critical', 'system');
    }

    if (metrics.memory > 95) {
      this.emit('alert', {
        metric: 'memory',
        value: metrics.memory,
        message: `Critical memory usage: ${metrics.memory.toFixed(1)}%`
      }, 'critical', 'system');
    }
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    totalEvents: number;
    subscriberCount: number;
  } {
    return {
      totalEvents: this.eventHistory.length,
      subscriberCount: this.subscribers.size
    };
  }
}

export const realTimeMonitor = new RealTimeMonitor();

/**
 * WebSocket handler for real-time monitoring
 */
export class MonitoringWebSocketHandler {
  private connections = new Set<any>();

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: any): void {
    this.connections.add(ws);

    // Subscribe to monitoring events
    const unsubscribeEvents = realTimeMonitor.subscribe((event) => {
      this.broadcast('event', event);
    });

    // Subscribe to live metrics
    const unsubscribeMetrics = realTimeMonitor.subscribeToMetrics((metrics) => {
      this.broadcast('metrics', metrics);
    });

    // Handle connection close
    ws.on('close', () => {
      this.connections.delete(ws);
      unsubscribeEvents();
      unsubscribeMetrics();
    });

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        recentEvents: realTimeMonitor.getRecentEvents(10),
        stats: realTimeMonitor.getStats()
      }
    }));

    logger.info('WebSocket monitoring connection established', {
      totalConnections: this.connections.size
    });
  }

  /**
   * Broadcast message to all connections
   */
  private broadcast(type: string, data: any): void {
    const message = JSON.stringify({ type, data });
    
    this.connections.forEach(ws => {
      try {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      } catch (error) {
        logger.error('Error broadcasting to WebSocket', error);
        this.connections.delete(ws);
      }
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

export const monitoringWebSocketHandler = new MonitoringWebSocketHandler(); 