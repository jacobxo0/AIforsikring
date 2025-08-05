/**
 * Live Error Stream for AI Forsikringsguiden
 * Formål: Real-time error streaming via Server-Sent Events
 */

import { logger } from '@/lib/logger';
import { ApiError, ApiErrorSeverity } from './apiErrorHandler';
import { realTimeMonitor } from '@/lib/realTimeMonitoring';
import { performanceMonitor } from '@/lib/performanceMonitor';

/**
 * Error stream event types
 */
export enum ErrorStreamEventType {
  ERROR_OCCURRED = 'error_occurred',
  ERROR_RESOLVED = 'error_resolved',
  SERVICE_STATUS_CHANGED = 'service_status_changed',
  CONNECTION_STATUS_CHANGED = 'connection_status_changed',
  BULK_ERRORS = 'bulk_errors',
  HEARTBEAT = 'heartbeat'
}

/**
 * Error stream event interface
 */
export interface ErrorStreamEvent {
  type: ErrorStreamEventType;
  timestamp: string;
  data: any;
  id?: string;
  retry?: number;
}

/**
 * Error stream client interface for server-side connections
 */
export interface ErrorStreamConnection {
  id: string;
  sessionId?: string;
  userId?: string;
  subscriptions: Set<ErrorStreamEventType>;
  lastSeen: Date;
  connection: Response | null;
  controller: ReadableStreamDefaultController<any> | null;
}

/**
 * Live Error Stream Manager
 */
export class LiveErrorStreamManager {
  private clients: Map<string, ErrorStreamConnection> = new Map();
  private errorBuffer: Map<string, ApiError[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Create SSE connection for client
   */
  createConnection(
    sessionId?: string,
    userId?: string,
    subscriptions: ErrorStreamEventType[] = Object.values(ErrorStreamEventType)
  ): ReadableStream<Uint8Array> {
    const clientId = this.generateClientId();
    
    const stream = new ReadableStream({
      start: (controller) => {
        const client: ErrorStreamConnection = {
          id: clientId,
          sessionId,
          userId,
          subscriptions: new Set(subscriptions),
          lastSeen: new Date(),
          connection: null,
          controller
        };
        
        this.clients.set(clientId, client);
        
        // Send initial connection event
        this.sendToClient(client, {
          type: ErrorStreamEventType.HEARTBEAT,
          timestamp: new Date().toISOString(),
          data: {
            message: 'Connected to error stream',
            clientId,
            subscriptions: Array.from(client.subscriptions)
          }
        });
        
        // Send buffered errors for this session
        if (sessionId && this.errorBuffer.has(sessionId)) {
          const bufferedErrors = this.errorBuffer.get(sessionId) || [];
          if (bufferedErrors.length > 0) {
            this.sendToClient(client, {
              type: ErrorStreamEventType.BULK_ERRORS,
              timestamp: new Date().toISOString(),
              data: {
                errors: bufferedErrors,
                count: bufferedErrors.length
              }
            });
          }
        }
        
        logger.info('SSE client connected', {
          clientId,
          sessionId,
          userId,
          subscriptions: Array.from(client.subscriptions)
        });
        
        performanceMonitor.recordMetric('sse.client.connected', 1, 'count');
      },
      
      cancel: () => {
        this.disconnectClient(clientId);
      }
    });
    
    return stream;
  }

  /**
   * Broadcast error to all subscribed clients
   */
  broadcastError(error: ApiError, sessionId?: string): void {
    const event: ErrorStreamEvent = {
      type: ErrorStreamEventType.ERROR_OCCURRED,
      timestamp: new Date().toISOString(),
      data: {
        error: this.serializeError(error),
        sessionId,
        severity: error.severity,
        endpoint: error.endpoint,
        retryable: error.retryable
      },
      id: error.requestId
    };
    
    // Buffer error for session
    if (sessionId) {
      this.bufferError(sessionId, error);
    }
    
    // Send to all subscribed clients
    this.broadcast(event, (client) => {
      return client.subscriptions.has(ErrorStreamEventType.ERROR_OCCURRED) &&
             (!sessionId || client.sessionId === sessionId);
    });
    
    logger.debug('Error broadcasted via SSE', {
      errorId: error.requestId,
      sessionId,
      clientCount: this.clients.size
    });
  }

  /**
   * Broadcast error resolution
   */
  broadcastErrorResolved(errorId: string, sessionId?: string): void {
    const event: ErrorStreamEvent = {
      type: ErrorStreamEventType.ERROR_RESOLVED,
      timestamp: new Date().toISOString(),
      data: {
        errorId,
        sessionId,
        message: 'Fejl løst'
      },
      id: errorId
    };
    
    this.broadcast(event, (client) => {
      return client.subscriptions.has(ErrorStreamEventType.ERROR_RESOLVED) &&
             (!sessionId || client.sessionId === sessionId);
    });
  }

  /**
   * Broadcast service status change
   */
  broadcastServiceStatusChange(serviceName: string, status: string, details?: any): void {
    const event: ErrorStreamEvent = {
      type: ErrorStreamEventType.SERVICE_STATUS_CHANGED,
      timestamp: new Date().toISOString(),
      data: {
        serviceName,
        status,
        details,
        message: `${serviceName} status ændret til ${status}`
      }
    };
    
    this.broadcast(event, (client) => {
      return client.subscriptions.has(ErrorStreamEventType.SERVICE_STATUS_CHANGED);
    });
  }

  /**
   * Broadcast connection status change
   */
  broadcastConnectionStatusChange(status: 'online' | 'offline' | 'slow'): void {
    const event: ErrorStreamEvent = {
      type: ErrorStreamEventType.CONNECTION_STATUS_CHANGED,
      timestamp: new Date().toISOString(),
      data: {
        status,
        message: `Forbindelsesstatus: ${status}`
      }
    };
    
    this.broadcast(event, (client) => {
      return client.subscriptions.has(ErrorStreamEventType.CONNECTION_STATUS_CHANGED);
    });
  }

  /**
   * Send event to specific client
   */
  private sendToClient(client: ErrorStreamConnection, event: ErrorStreamEvent): void {
    if (!client.controller) return;
    
    try {
      const sseData = this.formatSSEData(event);
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(sseData));
      client.lastSeen = new Date();
    } catch (error) {
      logger.error('Failed to send SSE event to client', error, {
        clientId: client.id,
        eventType: event.type
      });
      this.disconnectClient(client.id);
    }
  }

  /**
   * Broadcast event to all matching clients
   */
  private broadcast(event: ErrorStreamEvent, filter?: (client: ErrorStreamConnection) => boolean): void {
    const targetClients = Array.from(this.clients.values()).filter(filter || (() => true));
    
    targetClients.forEach(client => {
      this.sendToClient(client, event);
    });
    
    performanceMonitor.recordMetric('sse.event.broadcast', 1, 'count', {
      eventType: event.type,
      clientCount: targetClients.length.toString()
    });
  }

  /**
   * Format event as SSE data
   */
  private formatSSEData(event: ErrorStreamEvent): string {
    let sseData = '';
    
    if (event.id) {
      sseData += `id: ${event.id}\n`;
    }
    
    sseData += `event: ${event.type}\n`;
    sseData += `data: ${JSON.stringify({
      timestamp: event.timestamp,
      ...event.data
    })}\n`;
    
    if (event.retry) {
      sseData += `retry: ${event.retry}\n`;
    }
    
    sseData += '\n';
    
    return sseData;
  }

  /**
   * Serialize error for transmission
   */
  private serializeError(error: ApiError): any {
    return {
      name: error.name,
      message: error.message,
      type: error.type,
      severity: error.severity,
      statusCode: error.statusCode,
      endpoint: error.endpoint,
      method: error.method,
      requestId: error.requestId,
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
      userMessage: error.userMessage,
      correlationId: error.correlationId
    };
  }

  /**
   * Buffer error for session
   */
  private bufferError(sessionId: string, error: ApiError): void {
    if (!this.errorBuffer.has(sessionId)) {
      this.errorBuffer.set(sessionId, []);
    }
    
    const errors = this.errorBuffer.get(sessionId)!;
    errors.push(error);
    
    // Keep only last 50 errors per session
    if (errors.length > 50) {
      errors.splice(0, errors.length - 50);
    }
  }

  /**
   * Disconnect client
   */
  private disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        if (client.controller) {
          client.controller.close();
        }
      } catch (error) {
        logger.debug('Error closing SSE controller', error);
      }
      
      this.clients.delete(clientId);
      
      logger.info('SSE client disconnected', {
        clientId,
        sessionId: client.sessionId,
        userId: client.userId
      });
      
      performanceMonitor.recordMetric('sse.client.disconnected', 1, 'count');
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent: ErrorStreamEvent = {
        type: ErrorStreamEventType.HEARTBEAT,
        timestamp: new Date().toISOString(),
        data: {
          message: 'heartbeat',
          clientCount: this.clients.size,
          uptime: process.uptime()
        }
      };
      
      this.broadcast(heartbeatEvent, (client) => {
        return client.subscriptions.has(ErrorStreamEventType.HEARTBEAT);
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Start cleanup of stale connections
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
      const staleClients: string[] = [];
      
      for (const [clientId, client] of this.clients.entries()) {
        if (client.lastSeen < staleThreshold) {
          staleClients.push(clientId);
        }
      }
      
      staleClients.forEach(clientId => {
        this.disconnectClient(clientId);
      });
      
      // Clean up old error buffers
      const oldBufferThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      for (const [sessionId, errors] of this.errorBuffer.entries()) {
        const recentErrors = errors.filter(error => error.timestamp > oldBufferThreshold);
        if (recentErrors.length === 0) {
          this.errorBuffer.delete(sessionId);
        } else {
          this.errorBuffer.set(sessionId, recentErrors);
        }
      }
      
      if (staleClients.length > 0) {
        logger.info('Cleaned up stale SSE clients', {
          count: staleClients.length,
          activeClients: this.clients.size
        });
      }
    }, 60000); // Every minute
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getStatistics(): {
    activeClients: number;
    bufferedSessions: number;
    totalBufferedErrors: number;
    uptime: number;
  } {
    const totalBufferedErrors = Array.from(this.errorBuffer.values())
      .reduce((total, errors) => total + errors.length, 0);
    
    return {
      activeClients: this.clients.size,
      bufferedSessions: this.errorBuffer.size,
      totalBufferedErrors,
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown the stream manager
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Disconnect all clients
    for (const clientId of this.clients.keys()) {
      this.disconnectClient(clientId);
    }
    
    this.errorBuffer.clear();
    this.isRunning = false;
    
    logger.info('Live error stream manager shutdown');
  }
}

/**
 * Global live error stream manager instance
 */
export const liveErrorStream = new LiveErrorStreamManager();

/**
 * Client-side SSE connection helper
 */
export class ErrorStreamClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<ErrorStreamEventType, Set<(data: any) => void>> = new Map();

  constructor(
    private endpoint: string = '/api/errors/stream',
    private sessionId?: string,
    private subscriptions: ErrorStreamEventType[] = Object.values(ErrorStreamEventType)
  ) {
    this.initializeListeners();
  }

  /**
   * Connect to error stream
   */
  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }
    
    const url = new URL(this.endpoint, window.location.origin);
    if (this.sessionId) {
      url.searchParams.set('sessionId', this.sessionId);
    }
    url.searchParams.set('subscriptions', this.subscriptions.join(','));
    
    this.eventSource = new EventSource(url.toString());
    
    this.eventSource.onopen = () => {
      logger.info('Connected to error stream');
      this.reconnectAttempts = 0;
    };
    
    this.eventSource.onerror = (event) => {
      logger.error('Error stream connection error', event);
      this.handleReconnect();
    };
    
    // Set up event listeners
    for (const eventType of this.subscriptions) {
      this.eventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          this.emit(eventType, data);
        } catch (error) {
          logger.error('Failed to parse SSE event data', error);
        }
      });
    }
  }

  /**
   * Disconnect from error stream
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Add event listener
   */
  on(eventType: ErrorStreamEventType, listener: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: ErrorStreamEventType, listener: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(eventType: ErrorStreamEventType, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error('Error in SSE event listener', error);
        }
      });
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached for error stream');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      logger.info(`Attempting to reconnect to error stream (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  /**
   * Initialize default listeners
   */
  private initializeListeners(): void {
    // Initialize listener sets for all event types
    for (const eventType of Object.values(ErrorStreamEventType)) {
      this.listeners.set(eventType, new Set());
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}