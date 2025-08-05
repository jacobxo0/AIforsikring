/**
 * Bulk Operations with Retry for AI Forsikringsguiden
 * Formål: Håndter bulk operations med intelligent batch processing og retry
 */

import { logger } from './logger';
import { wrapAsync } from './asyncHandler';

export interface BulkOperationConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  failureThreshold: number; // Percentage of failures before stopping
  parallelBatches: number;
  onProgress?: (completed: number, total: number, failed: number) => void;
  onBatchComplete?: (batch: any[], results: any[], errors: any[]) => void;
  onFailure?: (item: any, error: any, attempt: number) => void;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: Array<{ item: any; error: any; attempts: number }>;
  totalProcessed: number;
  totalFailed: number;
  duration: number;
  batches: number;
}

export class BulkOperationProcessor<TInput, TOutput> {
  private config: BulkOperationConfig;
  
  constructor(config: Partial<BulkOperationConfig> = {}) {
    this.config = {
      batchSize: 50,
      maxRetries: 3,
      retryDelay: 1000,
      failureThreshold: 20, // Stop if >20% fail
      parallelBatches: 3,
      ...config
    };
  }

  /**
   * Process items in bulk with retry logic
   */
  async process(
    items: TInput[],
    processor: (item: TInput) => Promise<TOutput>
  ): Promise<BulkOperationResult<TOutput>> {
    const startTime = Date.now();
    const successful: TOutput[] = [];
    const failed: Array<{ item: TInput; error: any; attempts: number }> = [];
    
    logger.info('Starting bulk operation', {
      totalItems: items.length,
      batchSize: this.config.batchSize,
      parallelBatches: this.config.parallelBatches
    });

    // Split into batches
    const batches = this.createBatches(items);
    let completedItems = 0;
    
    // Process batches in parallel
    for (let i = 0; i < batches.length; i += this.config.parallelBatches) {
      const batchGroup = batches.slice(i, i + this.config.parallelBatches);
      
      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        return this.processBatch(
          batch,
          processor,
          i + batchIndex,
          (batchSuccessful, batchFailed) => {
            successful.push(...batchSuccessful);
            failed.push(...batchFailed);
            completedItems += batch.length;
            
            this.config.onProgress?.(completedItems, items.length, failed.length);
            
            // Check failure threshold
            const failureRate = (failed.length / completedItems) * 100;
            if (failureRate > this.config.failureThreshold) {
              throw new Error(`Failure threshold exceeded: ${failureRate.toFixed(1)}%`);
            }
          }
        );
      });
      
      try {
        await Promise.all(batchPromises);
      } catch (error) {
        logger.error('Bulk operation failed due to threshold exceeded', error);
        break;
      }
    }

    const duration = Date.now() - startTime;
    
    const result: BulkOperationResult<TOutput> = {
      successful,
      failed,
      totalProcessed: successful.length + failed.length,
      totalFailed: failed.length,
      duration,
      batches: batches.length
    };

    logger.info('Bulk operation completed', {
      totalItems: items.length,
      successful: successful.length,
      failed: failed.length,
      duration,
      batches: batches.length,
      failureRate: ((failed.length / items.length) * 100).toFixed(1) + '%'
    });

    return result;
  }

  /**
   * Process a single batch with retry
   */
  private async processBatch(
    batch: TInput[],
    processor: (item: TInput) => Promise<TOutput>,
    batchIndex: number,
    onComplete: (successful: TOutput[], failed: Array<{ item: TInput; error: any; attempts: number }>) => void
  ): Promise<void> {
    const successful: TOutput[] = [];
    const failed: Array<{ item: TInput; error: any; attempts: number }> = [];
    
    logger.debug(`Processing batch ${batchIndex + 1}`, {
      batchSize: batch.length,
      batchIndex
    });

    // Process each item in the batch
    const itemPromises = batch.map(async (item) => {
      let lastError: any;
      
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        try {
          const result = await processor(item);
          successful.push(result);
          return;
        } catch (error) {
          lastError = error;
          
          this.config.onFailure?.(item, error, attempt);
          
          if (attempt < this.config.maxRetries) {
            // Wait before retry with exponential backoff
            const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }
      
      // All retries failed
      failed.push({
        item,
        error: lastError,
        attempts: this.config.maxRetries
      });
    });

    await Promise.all(itemPromises);
    
    this.config.onBatchComplete?.(batch, successful, failed);
    onComplete(successful, failed);
  }

  /**
   * Create batches from items
   */
  private createBatches(items: TInput[]): TInput[][] {
    const batches: TInput[][] = [];
    
    for (let i = 0; i < items.length; i += this.config.batchSize) {
      batches.push(items.slice(i, i + this.config.batchSize));
    }
    
    return batches;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Specialized bulk processors for common use cases
 */
export const BulkProcessors = {
  /**
   * Bulk document processing
   */
  documents: new BulkOperationProcessor({
    batchSize: 10,
    maxRetries: 2,
    retryDelay: 2000,
    failureThreshold: 15,
    parallelBatches: 2
  }),

  /**
   * Bulk email sending
   */
  emails: new BulkOperationProcessor({
    batchSize: 25,
    maxRetries: 3,
    retryDelay: 1000,
    failureThreshold: 10,
    parallelBatches: 3
  }),

  /**
   * Bulk data import
   */
  dataImport: new BulkOperationProcessor({
    batchSize: 100,
    maxRetries: 2,
    retryDelay: 500,
    failureThreshold: 5,
    parallelBatches: 5
  }),

  /**
   * Bulk AI processing
   */
  aiProcessing: new BulkOperationProcessor({
    batchSize: 5,
    maxRetries: 3,
    retryDelay: 3000,
    failureThreshold: 25,
    parallelBatches: 2
  })
};

/**
 * Utility function for simple bulk operations
 */
export async function processBulk<TInput, TOutput>(
  items: TInput[],
  processor: (item: TInput) => Promise<TOutput>,
  config?: Partial<BulkOperationConfig>
): Promise<BulkOperationResult<TOutput>> {
  const bulkProcessor = new BulkOperationProcessor<TInput, TOutput>(config);
  return await bulkProcessor.process(items, processor);
}

/**
 * Progress tracking utility
 */
export class ProgressTracker {
  private total: number;
  private completed: number = 0;
  private failed: number = 0;
  private startTime: number;
  private onUpdate?: (progress: ProgressInfo) => void;

  constructor(total: number, onUpdate?: (progress: ProgressInfo) => void) {
    this.total = total;
    this.startTime = Date.now();
    this.onUpdate = onUpdate;
  }

  update(completed: number, failed: number): void {
    this.completed = completed;
    this.failed = failed;
    
    const progress = this.getProgress();
    this.onUpdate?.(progress);
  }

  getProgress(): ProgressInfo {
    const elapsed = Date.now() - this.startTime;
    const rate = this.completed / (elapsed / 1000); // items per second
    const remaining = this.total - this.completed;
    const eta = rate > 0 ? (remaining / rate) * 1000 : 0; // milliseconds
    
    return {
      total: this.total,
      completed: this.completed,
      failed: this.failed,
      remaining,
      percentage: (this.completed / this.total) * 100,
      rate,
      eta,
      elapsed
    };
  }
}

export interface ProgressInfo {
  total: number;
  completed: number;
  failed: number;
  remaining: number;
  percentage: number;
  rate: number; // items per second
  eta: number; // estimated time to completion (ms)
  elapsed: number; // time elapsed (ms)
} 