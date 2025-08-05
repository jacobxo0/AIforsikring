/**
 * Distributed Tracing for AI Forsikringsguiden
 * Formål: Track requests på tværs af services med session correlation
 */

import { logger } from './logger';
import { NextRequest } from 'next/server';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  status: 'ok' | 'error' | 'timeout';
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

class TraceStorage {
  private traces = new Map<string, TraceSpan[]>();
  private activeSpans = new Map<string, TraceSpan>();

  addSpan(span: TraceSpan): void {
    const spans = this.traces.get(span.traceId) || [];
    spans.push(span);
    this.traces.set(span.traceId, spans);
    this.activeSpans.set(span.spanId, span);
  }

  finishSpan(spanId: string, endTime: number, status: TraceSpan['status']): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.endTime = endTime;
      span.duration = endTime - span.startTime;
      span.status = status;
      this.activeSpans.delete(spanId);
    }
  }

  getTrace(traceId: string): TraceSpan[] {
    return this.traces.get(traceId) || [];
  }
}

const traceStorage = new TraceStorage();

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSpanId(): string {
  return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function extractTraceContext(request: NextRequest): TraceContext | null {
  const traceId = request.headers.get('x-trace-id');
  const spanId = request.headers.get('x-span-id');
  const parentSpanId = request.headers.get('x-parent-span-id');
  
  if (traceId && spanId) {
    return { traceId, spanId, parentSpanId: parentSpanId || undefined };
  }
  
  return null;
}

export function createTraceContext(parentContext?: TraceContext): TraceContext {
  return {
    traceId: parentContext?.traceId || generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId: parentContext?.spanId
  };
}

export function startSpan(
  operationName: string,
  context?: TraceContext,
  tags: Record<string, any> = {}
): TraceSpan {
  const traceContext = context || createTraceContext();
  
  const span: TraceSpan = {
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
    parentSpanId: traceContext.parentSpanId,
    operationName,
    startTime: Date.now(),
    tags: { component: 'ai-forsikringsguiden', ...tags },
    status: 'ok'
  };

  traceStorage.addSpan(span);
  return span;
}

export function finishSpan(span: TraceSpan, status: TraceSpan['status'] = 'ok'): void {
  const endTime = Date.now();
  traceStorage.finishSpan(span.spanId, endTime, status);
}

export async function traceAsync<T>(
  operationName: string,
  fn: (span: TraceSpan) => Promise<T>,
  context?: TraceContext,
  tags?: Record<string, any>
): Promise<T> {
  const span = startSpan(operationName, context, tags);
  
  try {
    const result = await fn(span);
    finishSpan(span, 'ok');
    return result;
  } catch (error) {
    finishSpan(span, 'error');
    throw error;
  }
}

export function getTrace(traceId: string): TraceSpan[] {
  return traceStorage.getTrace(traceId);
}

export const DatabaseTracing = {
  async query<T>(
    operation: string,
    query: string,
    fn: () => Promise<T>,
    context?: TraceContext
  ): Promise<T> {
    return traceAsync(
      `db.${operation}`,
      async (span) => {
        span.tags['db.statement'] = query.length > 100 ? query.substring(0, 100) + '...' : query;
        return await fn();
      },
      context
    );
  }
};

export const APITracing = {
  async call<T>(
    service: string,
    endpoint: string,
    fn: () => Promise<T>,
    context?: TraceContext
  ): Promise<T> {
    return traceAsync(
      `api.${service}`,
      async (span) => {
        span.tags['http.url'] = endpoint;
        span.tags['service.name'] = service;
        return await fn();
      },
      context
    );
  }
}; 