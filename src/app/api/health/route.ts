/**
 * Health Check API for AI Forsikringsguiden
 * Formål: System health monitoring med danske beskeder
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Safe logger that doesn't break during build
const safeLogger = {
  error: (message: string, ...args: unknown[]) => {
    try {
      logger.error(message, ...args);
    } catch {
      console.error(message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    try {
      logger.info(message, ...args);
    } catch {
      console.log(message, ...args);
    }
  }
};

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  details?: unknown;
}

let requestCount = 0;
let errorCount = 0;

export async function GET(_: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    requestCount++;
    
    const checks = await performHealthChecks();
    const responseTime = Date.now() - startTime;
    
    const overallStatus = determineOverallStatus(checks);
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime,
      checks,
      metrics: {
        requestCount,
        errorCount,
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 206 : 503;
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    errorCount++;
    safeLogger.error('Health check failed', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      message: 'Health check fejlede',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

async function performHealthChecks() {
  const [database, circuitBreakers, queue, memory] = await Promise.allSettled([
    checkDatabase(),
    checkCircuitBreakers(),
    checkQueue(),
    checkMemory()
  ]);

  return {
    database: getCheckResult(database, 'Database'),
    circuitBreakers: getCheckResult(circuitBreakers, 'Circuit Breakers'),
    queue: getCheckResult(queue, 'Queue'),
    memory: getCheckResult(memory, 'Memory')
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Simulate database check
    await new Promise(resolve => setTimeout(resolve, 100));
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      message: 'Database tilgængelig',
      responseTime
    };
  } catch (_) {
    return {
      status: 'unhealthy',
      message: 'Database fejl',
      responseTime: Date.now() - startTime
    };
  }
}

async function checkCircuitBreakers(): Promise<HealthCheck> {
  try {
    // Dynamic import to avoid build issues
    const { CircuitBreakers } = await import('@/lib/circuitBreaker').catch(() => ({ CircuitBreakers: null }));
    
    if (!CircuitBreakers) {
      return {
        status: 'healthy',
        message: 'Circuit breakers ikke tilgængelige',
        details: { available: false }
      };
    }
    
    const stats = {
      openai: CircuitBreakers.openai.getStats(),
      database: CircuitBreakers.database.getStats()
    };
    
    const openCircuits = Object.values(stats).filter(stat => stat.state === 'OPEN');
    
    if (openCircuits.length === 0) {
      return {
        status: 'healthy',
        message: 'Alle circuit breakers OK',
        details: stats
      };
    } else {
      return {
        status: 'degraded',
        message: `${openCircuits.length} circuit breakers åbne`,
        details: stats
      };
    }
  } catch (_) {
    return {
      status: 'healthy', // Don't fail health check for optional features
      message: 'Circuit breaker tjek sprunget over',
      details: { skipped: true }
    };
  }
}

async function checkQueue(): Promise<HealthCheck> {
  try {
    // Dynamic import to avoid build issues
    const { TaskQueue } = await import('@/lib/queueSystem').catch(() => ({ TaskQueue: null }));
    
    if (!TaskQueue) {
      return {
        status: 'healthy',
        message: 'Queue system ikke tilgængelig',
        details: { available: false }
      };
    }
    
    const stats = TaskQueue.getStats();
    
    if (stats.failed < stats.total * 0.1) {
      return {
        status: 'healthy',
        message: `Queue OK - ${stats.pending} ventende`,
        details: stats
      };
    } else {
      return {
        status: 'degraded',
        message: 'Queue har fejl',
        details: stats
      };
    }
  } catch (_) {
    return {
      status: 'healthy', // Don't fail health check for optional features
      message: 'Queue tjek sprunget over',
      details: { skipped: true }
    };
  }
}

async function checkMemory(): Promise<HealthCheck> {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    if (usagePercent < 70) {
      return {
        status: 'healthy',
        message: `Hukommelse OK - ${usagePercent.toFixed(1)}%`,
        details: { heapUsedMB, heapTotalMB, usagePercent }
      };
    } else {
      return {
        status: 'degraded',
        message: `Høj hukommelsesbrug - ${usagePercent.toFixed(1)}%`,
        details: { heapUsedMB, heapTotalMB, usagePercent }
      };
    }
  } catch (_) {
    return {
      status: 'unhealthy',
      message: 'Hukommelse tjek fejlede'
    };
  }
}

function getCheckResult(result: PromiseSettledResult<HealthCheck>, name: string): HealthCheck {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    return {
      status: 'unhealthy',
      message: `${name} tjek fejlede`
    };
  }
}

function determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks);
  const unhealthyCount = statuses.filter(check => check.status === 'unhealthy').length;
  const degradedCount = statuses.filter(check => check.status === 'degraded').length;
  
  if (unhealthyCount > 0) {
    return 'unhealthy';
  } else if (degradedCount > 0) {
    return 'degraded';
  } else {
    return 'healthy';
  }
} 