/**
 * Database Connection Pooling for AI Forsikringsguiden
 * Formål: Intelligent database connection management med resource cleanup
 */

import { logger } from './logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  healthCheckInterval: number;
}

export interface PoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  totalCreated: number;
  totalDestroyed: number;
  errors: number;
}

interface PooledConnection {
  client: SupabaseClient;
  id: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
  queryCount: number;
}

export class DatabasePool {
  private config: PoolConfig;
  private connections: Map<string, PooledConnection> = new Map();
  private waitingQueue: Array<{
    resolve: (client: SupabaseClient) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private stats: PoolStats = {
    total: 0,
    active: 0,
    idle: 0,
    waiting: 0,
    totalCreated: 0,
    totalDestroyed: 0,
    errors: 0
  };
  private healthCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      maxConnections: 20,
      minConnections: 2,
      idleTimeout: 300000, // 5 minutter
      connectionTimeout: 10000,
      retryAttempts: 3,
      healthCheckInterval: 60000, // 1 minut
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize pool with minimum connections
   */
  private async initialize(): Promise<void> {
    logger.info('Initializing database connection pool', {
      maxConnections: this.config.maxConnections,
      minConnections: this.config.minConnections
    });

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        await this.createConnection();
      } catch (error) {
        logger.error('Failed to create initial connection', error);
      }
    }

    // Start background tasks
    this.startHealthCheck();
    this.startCleanup();
  }

  /**
   * Get connection from pool
   */
  async getConnection(): Promise<SupabaseClient> {
    const startTime = Date.now();

    // Try to get idle connection
    const idleConnection = this.getIdleConnection();
    if (idleConnection) {
      this.activateConnection(idleConnection);
      return idleConnection.client;
    }

    // Create new connection if under limit
    if (this.connections.size < this.config.maxConnections) {
      try {
        const newConnection = await this.createConnection();
        this.activateConnection(newConnection);
        return newConnection.client;
      } catch (error) {
        logger.error('Failed to create new connection', error);
        this.stats.errors++;
      }
    }

    // Wait in queue
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeFromQueue(resolve);
        reject(new Error('Database connection timeout'));
      }, this.config.connectionTimeout);

      this.waitingQueue.push({
        resolve: (client) => {
          clearTimeout(timeout);
          resolve(client);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: startTime
      });

      this.stats.waiting = this.waitingQueue.length;
    });
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(client: SupabaseClient): void {
    const connection = this.findConnectionByClient(client);
    if (!connection) {
      logger.warn('Attempted to release unknown connection');
      return;
    }

    connection.isActive = false;
    connection.lastUsed = Date.now();
    connection.queryCount++;

    this.updateStats();

    // Process waiting queue
    this.processWaitingQueue();

    logger.debug('Connection released', {
      connectionId: connection.id,
      queryCount: connection.queryCount
    });
  }

  /**
   * Execute query with automatic connection management
   */
  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getConnection();
    
    try {
      const result = await queryFn(client);
      return result;
    } finally {
      this.releaseConnection(client);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Create new connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const id = this.generateConnectionId();
    
    try {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { persistSession: false },
          db: { schema: 'public' }
        }
      );

      // Test connection
      const { error } = await client.from('audit_logs').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found, which is ok for test
        throw error;
      }

      const connection: PooledConnection = {
        client,
        id,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: false,
        queryCount: 0
      };

      this.connections.set(id, connection);
      this.stats.totalCreated++;
      
      logger.debug('Database connection created', { connectionId: id });
      return connection;

    } catch (error) {
      logger.error('Failed to create database connection', error);
      throw error;
    }
  }

  /**
   * Get idle connection
   */
  private getIdleConnection(): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.isActive) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Activate connection
   */
  private activateConnection(connection: PooledConnection): void {
    connection.isActive = true;
    connection.lastUsed = Date.now();
  }

  /**
   * Find connection by client
   */
  private findConnectionByClient(client: SupabaseClient): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (connection.client === client) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Process waiting queue
   */
  private processWaitingQueue(): void {
    if (this.waitingQueue.length === 0) return;

    const idleConnection = this.getIdleConnection();
    if (idleConnection) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        this.activateConnection(idleConnection);
        waiter.resolve(idleConnection.client);
        this.stats.waiting = this.waitingQueue.length;
      }
    }
  }

  /**
   * Remove from queue
   */
  private removeFromQueue(resolve: (client: SupabaseClient) => void): void {
    const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
      this.stats.waiting = this.waitingQueue.length;
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    let active = 0;
    let idle = 0;

    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        active++;
      } else {
        idle++;
      }
    }

    this.stats.total = this.connections.size;
    this.stats.active = active;
    this.stats.idle = idle;
  }

  /**
   * Start health check
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    
    for (const [id, connection] of this.connections.entries()) {
      if (!connection.isActive) {
        try {
          // Simple health check
          const { error } = await connection.client
            .from('audit_logs')
            .select('id')
            .limit(1);
          
          if (error && error.code !== 'PGRST116') {
            logger.warn('Unhealthy connection detected, removing', { connectionId: id });
            await this.destroyConnection(id);
          }
        } catch (error) {
          logger.error('Health check failed for connection', error, { connectionId: id });
          await this.destroyConnection(id);
        }
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform cleanup of idle connections
   */
  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const connectionsToDestroy: string[] = [];

    for (const [id, connection] of this.connections.entries()) {
      const isIdle = !connection.isActive;
      const isExpired = now - connection.lastUsed > this.config.idleTimeout;
      const isOverMinimum = this.connections.size > this.config.minConnections;

      if (isIdle && isExpired && isOverMinimum) {
        connectionsToDestroy.push(id);
      }
    }

    for (const id of connectionsToDestroy) {
      await this.destroyConnection(id);
    }

    if (connectionsToDestroy.length > 0) {
      logger.debug(`Cleaned up ${connectionsToDestroy.length} idle connections`);
    }
  }

  /**
   * Destroy connection
   */
  private async destroyConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.delete(id);
      this.stats.totalDestroyed++;
      
      logger.debug('Connection destroyed', { connectionId: id });
    }
  }

  /**
   * Generate connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown pool
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database pool');

    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Reject waiting requests
    for (const waiter of this.waitingQueue) {
      waiter.reject(new Error('Database pool is shutting down'));
    }

    // Destroy all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const id of connectionIds) {
      await this.destroyConnection(id);
    }

    logger.info('Database pool shutdown complete');
  }
}

/**
 * Global database pool instance
 */
export const databasePool = new DatabasePool({
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '2'),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000')
});

/**
 * Utility function for executing queries
 */
export async function executeQuery<T>(
  queryFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  return databasePool.executeQuery(queryFn);
}

/**
 * Utility for transactions
 */
export async function executeTransaction<T>(
  transactionFn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  return databasePool.executeQuery(async (client) => {
    // Supabase handles transactions internally
    return await transactionFn(client);
  });
} 