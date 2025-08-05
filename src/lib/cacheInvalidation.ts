/**
 * Cache Invalidation System for AI Forsikringsguiden
 * Formål: Intelligent cache management med dependency tracking
 */

import { logger } from './logger';

export interface CacheEntry<T> {
  key: string;
  data: T;
  ttl: number;
  createdAt: number;
  lastAccessed: number;
  dependencies: Set<string>;
  tags: Set<string>;
}

export class CacheInvalidationManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private dependencies = new Map<string, Set<string>>();
  private tags = new Map<string, Set<string>>();
  private defaultTTL = 300000; // 5 minutter
  private maxSize = 1000;

  constructor(options: { defaultTTL?: number; maxSize?: number } = {}) {
    this.defaultTTL = options.defaultTTL || 300000;
    this.maxSize = options.maxSize || 1000;
  }

  set(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      dependencies?: string[];
      tags?: string[];
    } = {}
  ): void {
    const entry: CacheEntry<T> = {
      key,
      data,
      ttl: options.ttl || this.defaultTTL,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      dependencies: new Set(options.dependencies || []),
      tags: new Set(options.tags || [])
    };

    // Remove existing entry
    this.delete(key);

    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);

    // Update dependency tracking
    for (const dep of entry.dependencies) {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(key);
    }

    // Update tag tracking
    for (const tag of entry.tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);

    // Remove from dependency tracking
    for (const dep of entry.dependencies) {
      const depSet = this.dependencies.get(dep);
      if (depSet) {
        depSet.delete(key);
        if (depSet.size === 0) {
          this.dependencies.delete(dep);
        }
      }
    }

    // Remove from tag tracking
    for (const tag of entry.tags) {
      const tagSet = this.tags.get(tag);
      if (tagSet) {
        tagSet.delete(key);
        if (tagSet.size === 0) {
          this.tags.delete(tag);
        }
      }
    }

    return true;
  }

  invalidateByDependency(dependency: string): number {
    const dependentKeys = this.dependencies.get(dependency);
    if (!dependentKeys) return 0;

    const keysToInvalidate = Array.from(dependentKeys);
    let invalidatedCount = 0;

    for (const key of keysToInvalidate) {
      if (this.delete(key)) {
        invalidatedCount++;
      }
    }

    logger.info('Cache invalidated by dependency', {
      dependency,
      invalidatedCount
    });

    return invalidatedCount;
  }

  invalidateByTag(tag: string): number {
    const taggedKeys = this.tags.get(tag);
    if (!taggedKeys) return 0;

    const keysToInvalidate = Array.from(taggedKeys);
    let invalidatedCount = 0;

    for (const key of keysToInvalidate) {
      if (this.delete(key)) {
        invalidatedCount++;
      }
    }

    logger.info('Cache invalidated by tag', { tag, invalidatedCount });
    return invalidatedCount;
  }

  clear(): void {
    this.cache.clear();
    this.dependencies.clear();
    this.tags.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      dependencies: this.dependencies.size,
      tags: this.tags.size
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}

export const CacheManagers = {
  userData: new CacheInvalidationManager({ defaultTTL: 600000 }),
  apiResponses: new CacheInvalidationManager({ defaultTTL: 300000 }),
  documentAnalysis: new CacheInvalidationManager({ defaultTTL: 3600000 }),
  sessions: new CacheInvalidationManager({ defaultTTL: 1800000 })
};

export const InvalidationStrategies = {
  userDataChanged: (userId: string) => {
    CacheManagers.userData.invalidateByTag(`user:${userId}`);
    CacheManagers.sessions.invalidateByTag(`user:${userId}`);
  },

  documentUpdated: (documentId: string) => {
    CacheManagers.documentAnalysis.invalidateByDependency(`document:${documentId}`);
  },

  policyUpdated: (policyId: string) => {
    CacheManagers.apiResponses.invalidateByTag(`policy:${policyId}`);
  }
};

export async function cached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    manager?: CacheInvalidationManager<T>;
    ttl?: number;
    dependencies?: string[];
    tags?: string[];
  } = {}
): Promise<T> {
  const manager = options.manager || CacheManagers.apiResponses;
  
  const cached = manager.get(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  manager.set(key, data, options);
  
  return data;
} 