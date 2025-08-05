import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Safe logger for production
const safeLogger = {
  error: (message: string, ...args: unknown[]) => {
    try {
      logger.error(message, ...args);
    } catch {
      console.error('[POLICIES_API_ERROR]', message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    try {
      logger.warn(message, ...args);
    } catch {
      console.warn('[POLICIES_API_WARN]', message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    try {
      logger.info(message, ...args);
    } catch {
      console.log('[POLICIES_API_INFO]', message, ...args);
    }
  }
};

// Safe Prisma connection with fallback
async function getPrismaClient() {
  try {
    const { prisma } = await import('@/lib/prisma');
    return prisma;
  } catch (error) {
    safeLogger.error('Failed to connect to Prisma:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get Prisma client
    const prisma = await getPrismaClient();
    if (!prisma) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database utilgængelig. Prøv igen senere.',
          errorCode: 'DATABASE_UNAVAILABLE'
        }, 
        { status: 503 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const policyType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate limits
    const safeLt = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
    const safeOffset = Math.max(offset, 0);

    // Build query
    const whereClause: Record<string, unknown> = {};
    if (userId && userId !== 'null' && userId !== 'undefined') {
      whereClause.userId = userId;
    }
    if (policyType) {
      whereClause.type = policyType;
    }

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (connectionError) {
      safeLogger.error('Database connection test failed:', connectionError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database forbindelse fejlede. Prøv igen senere.',
          errorCode: 'DATABASE_CONNECTION_FAILED'
        }, 
        { status: 503 }
      );
    }

    // Execute query with error handling
    let policies;
    let totalCount = 0;
    
    try {
      // Get policies with pagination
      policies = await prisma.policy.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: safeLt,
        skip: safeOffset,
        select: {
          id: true,
          policenummer: true,
          type: true,
          premie: true,
          daekning: true,
          selvrisiko: true,
          udloebsdato: true,
          createdAt: true,
          userId: true
        }
      });

      // Get total count for pagination
      totalCount = await prisma.policy.count({
        where: whereClause
      });

    } catch (queryError: unknown) {
      safeLogger.error('Database query failed:', queryError);
      
      // Return fallback empty result instead of error
      return NextResponse.json({ 
        success: true, 
        policies: [],
        totalCount: 0,
        pagination: {
          limit: safeLt,
          offset: safeOffset,
          hasMore: false
        },
        warning: 'Kunne ikke hente alle data fra databasen',
        queryTime: Date.now() - startTime
      });
    }

    const queryTime = Date.now() - startTime;
    
    safeLogger.info('Policies fetched successfully:', {
      count: policies.length,
      totalCount,
      queryTime,
      userId,
      policyType
    });

    return NextResponse.json({ 
      success: true, 
      policies,
      totalCount,
      pagination: {
        limit: safeLt,
        offset: safeOffset,
        hasMore: safeOffset + policies.length < totalCount
      },
      queryTime
    });

  } catch (error: unknown) {
    const queryTime = Date.now() - startTime;
    
    safeLogger.error('Policies API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      queryTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Der opstod en fejl ved hentning af policies',
        errorId: `policies-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fallback: 'Prøv igen eller kontakt support'
      }, 
      { status: 500 }
    );
  }
}

// Handle POST requests for creating policies
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get Prisma client
    const prisma = await getPrismaClient();
    if (!prisma) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database utilgængelig. Prøv igen senere.',
          errorCode: 'DATABASE_UNAVAILABLE'
        }, 
        { status: 503 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (_) {
      return NextResponse.json(
        { success: false, error: 'Ugyldig request format' }, 
        { status: 400 }
      );
    }

    // Validate required fields
    const { 
      policenummer, 
      type, 
      premie, 
      daekning, 
      selvrisiko, 
      udloebsdato,
      userId = 'anon'
    } = requestBody;

    if (!policenummer) {
      return NextResponse.json(
        { success: false, error: 'Policenummer er påkrævet' }, 
        { status: 400 }
      );
    }

    // Check for duplicate policy number
    try {
      const existingPolicy = await prisma.policy.findFirst({
        where: { policenummer }
      });

      if (existingPolicy) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Police med dette nummer eksisterer allerede',
            existingPolicy: {
              id: existingPolicy.id,
              type: existingPolicy.type
            }
          }, 
          { status: 409 }
        );
      }
    } catch (duplicateCheckError) {
      safeLogger.warn('Could not check for duplicate policy:', duplicateCheckError);
    }

    // Create new policy
    const newPolicy = await prisma.policy.create({
      data: {
        policenummer,
        type,
        premie: premie ? parseFloat(premie) : null,
        daekning: daekning ? parseFloat(daekning) : null,
        selvrisiko: selvrisiko ? parseFloat(selvrisiko) : null,
        udloebsdato: udloebsdato ? new Date(udloebsdato) : null,
        userId,
        createdAt: new Date()
      }
    });

    const processingTime = Date.now() - startTime;
    
    safeLogger.info('Policy created successfully:', {
      policyId: newPolicy.id,
      policenummer,
      type,
      processingTime
    });

    return NextResponse.json({ 
      success: true, 
      policy: newPolicy,
      processingTime
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    
    safeLogger.error('Policy creation error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Kunne ikke oprette police',
        errorId: `policy-create-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }, 
      { status: 500 }
    );
  }
} 