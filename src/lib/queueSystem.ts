/**
 * Queue System for AI Forsikringsguiden
 * Formål: Håndter background tasks og async operations med retry logic
 */

import { logger } from './logger';

export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<void>;

export class Queue<T = any> {
  private jobs = new Map<string, QueueJob<T>>();
  private handlers = new Map<string, JobHandler<T>>();
  private processing = new Set<string>();
  private isProcessing = false;
  private maxConcurrency = 5;

  constructor() {
    this.startProcessing();
  }

  registerHandler(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  async addJob(type: string, data: T, maxAttempts = 3): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: QueueJob<T> = {
      id,
      type,
      data,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      scheduledFor: new Date()
    };

    this.jobs.set(id, job);
    return id;
  }

  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(job => !job.completedAt && !job.failedAt).length,
      processing: this.processing.size,
      completed: jobs.filter(job => job.completedAt).length,
      failed: jobs.filter(job => job.failedAt).length
    };
  }

  private startProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.processJobs();
  }

  private async processJobs(): Promise<void> {
    while (this.isProcessing) {
      if (this.processing.size >= this.maxConcurrency) {
        await this.sleep(100);
        continue;
      }

      const job = this.getNextJob();
      if (!job) {
        await this.sleep(1000);
        continue;
      }

      this.processing.add(job.id);
      this.processJob(job).finally(() => {
        this.processing.delete(job.id);
      });
    }
  }

  private getNextJob(): QueueJob<T> | null {
    const availableJobs = Array.from(this.jobs.values())
      .filter(job => 
        !job.completedAt &&
        !job.failedAt &&
        !this.processing.has(job.id) &&
        job.scheduledFor <= new Date()
      );

    return availableJobs[0] || null;
  }

  private async processJob(job: QueueJob<T>): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.failedAt = new Date();
      job.error = 'No handler found';
      return;
    }

    job.attempts++;

    try {
      await handler(job);
      job.completedAt = new Date();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.error = errorMessage;

      if (job.attempts >= job.maxAttempts) {
        job.failedAt = new Date();
      } else {
        // Schedule retry with delay
        const retryDelay = 1000 * Math.pow(2, job.attempts - 1);
        job.scheduledFor = new Date(Date.now() + retryDelay);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop(): void {
    this.isProcessing = false;
  }
}

export const TaskQueue = new Queue();

TaskQueue.registerHandler('email', async (job) => {
  logger.info('Processing email job', { data: job.data });
});

TaskQueue.registerHandler('document_analysis', async (job) => {
  logger.info('Processing document analysis job', { data: job.data });
});

TaskQueue.registerHandler('ai_processing', async (job) => {
  logger.info('Processing AI job', { data: job.data });
}); 