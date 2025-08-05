/**
 * Dead Letter Queue for AI Forsikringsguiden
 * Formål: Håndter fejlede tasks og giv insight i system problemer
 */

import { logger } from './logger';
import { QueueJob } from './queueSystem';

export interface DeadLetterEntry<T = any> {
  id: string;
  originalJob: QueueJob<T>;
  failureReason: string;
  failureTime: Date;
  originalQueue: string;
  retryAttempts: number;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: {
    errorType: string;
    userImpact: 'low' | 'medium' | 'high' | 'critical';
    category: string;
  };
}

export class DeadLetterQueue<T = any> {
  private entries = new Map<string, DeadLetterEntry<T>>();
  private maxRetries = 3;

  addFailedJob(
    job: QueueJob<T>,
    failureReason: string,
    queueName: string,
    errorType: string = 'unknown',
    userImpact: DeadLetterEntry['metadata']['userImpact'] = 'medium'
  ): string {
    const id = this.generateId();
    
    const entry: DeadLetterEntry<T> = {
      id,
      originalJob: { ...job },
      failureReason,
      failureTime: new Date(),
      originalQueue: queueName,
      retryAttempts: 0,
      resolved: false,
      metadata: {
        errorType,
        userImpact,
        category: this.categorizeError(errorType)
      }
    };

    this.entries.set(id, entry);
    
    logger.error('Job moved to dead letter queue', {
      jobId: job.id,
      dlqId: id,
      failureReason,
      errorType,
      userImpact
    });

    return id;
  }

  getUnresolvedEntries(): DeadLetterEntry<T>[] {
    return Array.from(this.entries.values()).filter(entry => !entry.resolved);
  }

  async retryJob(
    entryId: string,
    retryHandler: (job: QueueJob<T>) => Promise<void>
  ): Promise<boolean> {
    const entry = this.entries.get(entryId);
    if (!entry || entry.resolved || entry.retryAttempts >= this.maxRetries) {
      return false;
    }

    entry.retryAttempts++;

    try {
      await retryHandler(entry.originalJob);
      entry.resolved = true;
      entry.resolvedAt = new Date();
      return true;
    } catch (error) {
      logger.error('Dead letter retry failed', error, { entryId });
      return false;
    }
  }

  getStatistics() {
    const entries = Array.from(this.entries.values());
    const unresolved = entries.filter(e => !e.resolved);
    
    const byCategory: Record<string, number> = {};
    const byImpact: Record<string, number> = {};
    
    entries.forEach(entry => {
      byCategory[entry.metadata.category] = (byCategory[entry.metadata.category] || 0) + 1;
      byImpact[entry.metadata.userImpact] = (byImpact[entry.metadata.userImpact] || 0) + 1;
    });

    return {
      total: entries.length,
      unresolved: unresolved.length,
      resolved: entries.length - unresolved.length,
      byCategory,
      byImpact
    };
  }

  private categorizeError(errorType: string): string {
    const categoryMap: Record<string, string> = {
      'timeout': 'network',
      'connection_error': 'network',
      'rate_limit': 'api',
      'auth_error': 'auth',
      'validation_error': 'data',
      'unknown': 'system'
    };

    return categoryMap[errorType] || 'system';
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const GlobalDeadLetterQueue = new DeadLetterQueue(); 