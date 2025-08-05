/**
 * Memory Leak Detection for AI Forsikringsguiden
 * Formål: Detect og prevent memory leaks med automatic cleanup
 */

import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

export class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private objectCounts = new Map<string, number>();
  private timers = new Set<NodeJS.Timeout>();
  private intervals = new Set<NodeJS.Timeout>();
  private isMonitoring = false;
  private snapshotInterval = 30000; // 30 sekunder
  private growthThreshold = 50 * 1024 * 1024; // 50MB
  private maxHeapSize = 500 * 1024 * 1024; // 500MB

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    this.monitoringTimer = setInterval(() => {
      this.takeSnapshot();
      this.analyzeMemoryUsage();
    }, this.snapshotInterval);

    logger.info('Memory leak detection started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    logger.info('Memory leak detection stopped');
  }

  takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss
    };

    this.snapshots.push(snapshot);
    
    if (this.snapshots.length > 20) {
      this.snapshots.shift();
    }

    performanceMonitor.recordMetric('memory.heap.used', memUsage.heapUsed, 'bytes');
    performanceMonitor.recordMetric('memory.heap.total', memUsage.heapTotal, 'bytes');
    performanceMonitor.recordMetric('memory.rss', memUsage.rss, 'bytes');

    return snapshot;
  }

  analyzeMemoryUsage(): void {
    if (this.snapshots.length < 2) return;

    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    
    
    this.checkMemoryLeak();
    this.checkCriticalMemoryUsage(current);
  }

  private checkMemoryLeak(): void {
    if (this.snapshots.length < 4) return;

    const recent = this.snapshots.slice(-4);
    let consecutiveGrowths = 0;

    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].heapUsed - recent[i - 1].heapUsed;
      
      if (growth > this.growthThreshold) {
        consecutiveGrowths++;
      } else {
        consecutiveGrowths = 0;
      }
    }

    if (consecutiveGrowths >= 3) {
      this.handleMemoryLeak(recent);
    }
  }

  private checkCriticalMemoryUsage(snapshot: MemorySnapshot): void {
    const usagePercent = (snapshot.heapUsed / this.maxHeapSize) * 100;
    
    if (usagePercent > 80) {
      logger.error('Critical memory usage detected', {
        heapUsed: snapshot.heapUsed,
        usagePercent: usagePercent.toFixed(1)
      });

      this.forceGarbageCollection();
    }
  }

  private handleMemoryLeak(snapshots: MemorySnapshot[]): void {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const totalGrowth = last.heapUsed - first.heapUsed;
    const timeSpan = last.timestamp - first.timestamp;

    logger.error('Potential memory leak detected', {
      totalGrowth,
      timeSpan,
      growthRate: totalGrowth / (timeSpan / 1000),
      currentHeap: last.heapUsed
    });

    this.performEmergencyCleanup();
  }

  performEmergencyCleanup(): void {
    let cleanedItems = 0;

    if (this.snapshots.length > 10) {
      this.snapshots.splice(0, this.snapshots.length - 10);
      cleanedItems++;
    }

    this.objectCounts.clear();
    cleanedItems++;

    this.forceGarbageCollection();

    logger.info('Emergency cleanup performed', { cleanedItems });
  }

  private forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection');
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)');
    }
  }

  trackObject(objectType: string): void {
    const current = this.objectCounts.get(objectType) || 0;
    this.objectCounts.set(objectType, current + 1);
  }

  untrackObject(objectType: string): void {
    const current = this.objectCounts.get(objectType) || 0;
    if (current > 0) {
      this.objectCounts.set(objectType, current - 1);
    }
  }

  registerTimer(timer: NodeJS.Timeout): void {
    this.timers.add(timer);
  }

  unregisterTimer(timer: NodeJS.Timeout): void {
    this.timers.delete(timer);
  }

  registerInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval);
  }

  unregisterInterval(interval: NodeJS.Timeout): void {
    this.intervals.delete(interval);
  }

  getMemoryStats(): {
    currentUsage: MemorySnapshot | null;
    totalSnapshots: number;
    objectCounts: Record<string, number>;
    leakRisk: 'low' | 'medium' | 'high';
  } {
    const current = this.snapshots[this.snapshots.length - 1] || null;
    const leakRisk = this.assessLeakRisk();

    return {
      currentUsage: current,
      totalSnapshots: this.snapshots.length,
      objectCounts: Object.fromEntries(this.objectCounts),
      leakRisk
    };
  }

  private assessLeakRisk(): 'low' | 'medium' | 'high' {
    if (!this.snapshots.length) return 'low';

    const current = this.snapshots[this.snapshots.length - 1];
    const usagePercent = (current.heapUsed / this.maxHeapSize) * 100;

    if (usagePercent > 70) return 'high';
    if (usagePercent > 50) return 'medium';
    return 'low';
  }
}

export const memoryLeakDetector = new MemoryLeakDetector();

export const MemoryUtils = {
  trackObject: (type: string) => memoryLeakDetector.trackObject(type),
  untrackObject: (type: string) => memoryLeakDetector.untrackObject(type),

  setTimeout: (callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      memoryLeakDetector.unregisterTimer(timer);
      callback();
    }, delay);
    
    memoryLeakDetector.registerTimer(timer);
    return timer;
  },

  setInterval: (callback: () => void, interval: number): NodeJS.Timeout => {
    const timer = setInterval(callback, interval);
    memoryLeakDetector.registerInterval(timer);
    return timer;
  },

  clearTimeout: (timer: NodeJS.Timeout): void => {
    memoryLeakDetector.unregisterTimer(timer);
    clearTimeout(timer);
  },

  clearInterval: (timer: NodeJS.Timeout): void => {
    memoryLeakDetector.unregisterInterval(timer);
    clearInterval(timer);
  }
}; 