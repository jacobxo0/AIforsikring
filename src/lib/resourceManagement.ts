/**
 * Resource Management for AI Forsikringsguiden
 * Formål: Comprehensive resource lifecycle management med automatic cleanup
 */

import { logger } from './logger';
import { memoryLeakDetector } from './memoryLeakDetection';
import { promises as fs } from 'fs';

export interface ManagedResource {
  id: string;
  type: 'file' | 'connection' | 'stream' | 'timer';
  resource: unknown;
  createdAt: number;
  lastUsed: number;
  metadata: Record<string, unknown>;
  cleanup?: () => Promise<void> | void;
}

export class ResourceManager {
  private resources = new Map<string, ManagedResource>();
  private cleanupTimer?: NodeJS.Timeout;
  private isShuttingDown = false;
  private maxFileHandles = 100;
  private maxConnections = 50;
  private cleanupInterval = 60000; // 1 minut
  private resourceTimeout = 300000; // 5 minutter

  constructor() {
    this.startCleanup();
    this.setupGracefulShutdown();
  }

  register<T>(
    type: ManagedResource['type'],
    resource: T,
    metadata: Record<string, unknown> = {},
    cleanup?: () => Promise<void> | void
  ): string {
    const id = this.generateResourceId();
    
    const managedResource: ManagedResource = {
      id,
      type,
      resource,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      metadata,
      cleanup
    };

    this.resources.set(id, managedResource);
    memoryLeakDetector.trackObject(`resource:${type}`);

    logger.debug('Resource registered', {
      id,
      type,
      totalResources: this.resources.size
    });

    return id;
  }

  async unregister(id: string): Promise<boolean> {
    const resource = this.resources.get(id);
    if (!resource) return false;

    try {
      if (resource.cleanup) {
        await resource.cleanup();
      }

      await this.performDefaultCleanup(resource);
      this.resources.delete(id);
      memoryLeakDetector.untrackObject(`resource:${resource.type}`);

      logger.debug('Resource unregistered', {
        id,
        type: resource.type,
        lifetime: Date.now() - resource.createdAt
      });

      return true;
    } catch (error) {
      logger.error('Error during resource cleanup', error, { resourceId: id });
      return false;
    }
  }

  access<T>(id: string): T | null {
    const resource = this.resources.get(id);
    if (!resource) return null;

    resource.lastUsed = Date.now();
    return resource.resource as T;
  }

  getStats(): {
    total: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};

    for (const resource of this.resources.values()) {
      byType[resource.type] = (byType[resource.type] || 0) + 1;
    }

    return {
      total: this.resources.size,
      byType
    };
  }

  async cleanupType(type: ManagedResource['type']): Promise<number> {
    const resourcesOfType = Array.from(this.resources.entries())
      .filter(([, resource]) => resource.type === type);

    let cleanedCount = 0;
    
    for (const [id] of resourcesOfType) {
      if (await this.unregister(id)) {
        cleanedCount++;
      }
    }

    logger.info(`Cleaned up ${cleanedCount} resources of type: ${type}`);
    return cleanedCount;
  }

  private async performDefaultCleanup(resource: ManagedResource): Promise<void> {
    try {
      switch (resource.type) {
        case 'file':
          if (resource.resource && typeof resource.resource === 'object' && resource.resource !== null && 'close' in resource.resource && typeof (resource.resource as { close: unknown }).close === 'function') {
            await (resource.resource as { close: () => Promise<void> }).close();
          }
          break;

        case 'connection':
          if (resource.resource && typeof resource.resource === 'object' && resource.resource !== null && 'close' in resource.resource && typeof (resource.resource as { close: unknown }).close === 'function') {
            await (resource.resource as { close: () => Promise<void> }).close();
          } else if (resource.resource && typeof resource.resource === 'object' && resource.resource !== null && 'end' in resource.resource && typeof (resource.resource as { end: unknown }).end === 'function') {
            (resource.resource as { end: () => void }).end();
          }
          break;

        case 'stream':
          if (resource.resource && typeof resource.resource === 'object' && resource.resource !== null && 'destroy' in resource.resource && typeof (resource.resource as { destroy: unknown }).destroy === 'function') {
            (resource.resource as { destroy: () => void }).destroy();
          }
          break;

        case 'timer':
          if (resource.resource && typeof resource.resource === 'number') {
            clearTimeout(resource.resource);
          }
          break;
      }
    } catch (error) {
      logger.warn('Error in default cleanup', error, { resourceType: resource.type });
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performAutomaticCleanup();
      }
    }, this.cleanupInterval);
  }

  private async performAutomaticCleanup(): Promise<void> {
    const now = Date.now();
    const expiredResources: string[] = [];

    for (const [id, resource] of this.resources.entries()) {
      const age = now - resource.lastUsed;
      if (age > this.resourceTimeout) {
        expiredResources.push(id);
      }
    }

    let cleanedCount = 0;
    for (const id of expiredResources) {
      if (await this.unregister(id)) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Automatic cleanup completed: ${cleanedCount} resources cleaned`);
    }

    await this.enforceResourceLimits();
  }

  private async enforceResourceLimits(): Promise<void> {
    const stats = this.getStats();

    if (stats.byType.file > this.maxFileHandles) {
      const excess = stats.byType.file - this.maxFileHandles;
      await this.cleanupOldestResources('file', excess);
    }

    if (stats.byType.connection > this.maxConnections) {
      const excess = stats.byType.connection - this.maxConnections;
      await this.cleanupOldestResources('connection', excess);
    }
  }

  private async cleanupOldestResources(
    type: ManagedResource['type'], 
    count: number
  ): Promise<void> {
    const resourcesOfType = Array.from(this.resources.entries())
      .filter(([, resource]) => resource.type === type)
      .sort(([, a], [, b]) => a.createdAt - b.createdAt)
      .slice(0, count);

    for (const [id] of resourcesOfType) {
      await this.unregister(id);
    }

    logger.info(`Cleaned up ${resourcesOfType.length} oldest ${type} resources`);
  }

  private setupGracefulShutdown(): void {
    const shutdown = async () => {
      logger.info('Starting graceful resource shutdown');
      this.isShuttingDown = true;
      
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }

      await this.shutdownAll();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  async shutdownAll(): Promise<void> {
    const resourceIds = Array.from(this.resources.keys());
    let cleanedCount = 0;

    for (const id of resourceIds) {
      if (await this.unregister(id)) {
        cleanedCount++;
      }
    }

    logger.info(`Resource manager shutdown complete: ${cleanedCount} resources cleaned`);
  }

  private generateResourceId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const resourceManager = new ResourceManager();

export const ResourceUtils = {
  async openFile(path: string, options?: { flags?: string }): Promise<{ id: string; handle: unknown }> {
    
    try {
      const handle = await fs.open(path, options?.flags || 'r');
      const id = resourceManager.register('file', handle, { path }, () => handle.close());
      
      return { id, handle };
    } catch (error) {
      logger.error('Failed to open file', error, { path });
      throw error;
    }
  },

  setTimeout(callback: () => void, delay: number): string {
    const timer = setTimeout(() => {
      resourceManager.unregister(id);
      callback();
    }, delay);
    
    const id = resourceManager.register('timer', timer, { delay });
    return id;
  },

  setInterval(callback: () => void, interval: number): string {
    const timer = setInterval(callback, interval);
    const id = resourceManager.register('timer', timer, { interval }, () => {
      clearInterval(timer);
    });
    
    return id;
  },

  close: (id: string) => resourceManager.unregister(id),
  get: <T>(id: string) => resourceManager.access<T>(id)
}; 