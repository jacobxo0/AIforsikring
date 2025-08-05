import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Safe logger for production
const safeLogger = {
  error: (message: string, ...args: unknown[]) => {
    try {
      logger.error(message, ...args);
    } catch {
      console.error('[POLICY_ID_API_ERROR]', message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    try {
      logger.warn(message, ...args);
    } catch {
      console.warn('[POLICY_ID_API_WARN]', message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    try {
      logger.info(message, ...args);
    } catch {
      console.log('[POLICY_ID_API_INFO]', message, ...args);
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let policyId = 'unknown';
  
  try {
    // Get and validate params
    const resolvedParams = await params;
    policyId = resolvedParams.id;
    
    if (!policyId || policyId.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Policy ID mangler eller er ugyldig',
          errorCode: 'MISSING_POLICY_ID'
        }, 
        { status: 400 }
      );
    }

    // Validate ID format (basic UUID or custom format validation)
    if (policyId.length < 3 || policyId.length > 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Policy ID har ugyldig længde',
          errorCode: 'INVALID_POLICY_ID_FORMAT'
        }, 
        { status: 400 }
      );
    }

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

    // Test database connection
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

    // Find policy with error handling
    let policy;
    try {
      policy = await prisma.policy.findUnique({
        where: { id: policyId },
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
    } catch (queryError: unknown) {
      safeLogger.error('Policy query failed:', queryError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Kunne ikke søge efter policy',
          errorCode: 'POLICY_QUERY_FAILED',
          policyId
        }, 
        { status: 500 }
      );
    }
    
    if (!policy) {
      safeLogger.warn('Policy not found:', { policyId });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Policy ikke fundet',
          errorCode: 'POLICY_NOT_FOUND',
          policyId
        }, 
        { status: 404 }
      );
    }

    const queryTime = Date.now() - startTime;
    
    safeLogger.info('Policy fetched successfully:', {
      policyId,
      policenummer: policy.policenummer,
      type: policy.type,
      queryTime
    });
    
    return NextResponse.json({ 
      success: true, 
      policy,
      queryTime 
    });

  } catch (error: unknown) {
    const queryTime = Date.now() - startTime;
    
    safeLogger.error('Policy fetch error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      policyId,
      queryTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Der opstod en uventet fejl',
        errorId: `policy-fetch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyId
      }, 
      { status: 500 }
    );
  }
}

// Handle PUT requests for updating policies
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let policyId = 'unknown';
  
  try {
    const resolvedParams = await params;
    policyId = resolvedParams.id;
    
    if (!policyId) {
      return NextResponse.json(
        { success: false, error: 'Policy ID mangler' }, 
        { status: 400 }
      );
    }

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

    // Update policy
    const updatedPolicy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        ...requestBody,
        // Ensure we don't update critical fields accidentally
        id: undefined,
        createdAt: undefined
      }
    });

    const processingTime = Date.now() - startTime;
    
    safeLogger.info('Policy updated successfully:', {
      policyId,
      updatedFields: Object.keys(requestBody),
      processingTime
    });

    return NextResponse.json({ 
      success: true, 
      policy: updatedPolicy,
      processingTime 
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    
    safeLogger.error('Policy update error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      policyId,
      processingTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Kunne ikke opdatere policy',
        errorId: `policy-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyId
      }, 
      { status: 500 }
    );
  }
}

// Handle DELETE requests
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let policyId = 'unknown';
  
  try {
    const resolvedParams = await params;
    policyId = resolvedParams.id;
    
    if (!policyId) {
      return NextResponse.json(
        { success: false, error: 'Policy ID mangler' }, 
        { status: 400 }
      );
    }

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

    // Check if policy exists first
    const existingPolicy = await prisma.policy.findUnique({
      where: { id: policyId }
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Policy ikke fundet',
          policyId
        }, 
        { status: 404 }
      );
    }

    // Delete policy
    await prisma.policy.delete({
      where: { id: policyId }
    });

    const processingTime = Date.now() - startTime;
    
    safeLogger.info('Policy deleted successfully:', {
      policyId,
      policenummer: existingPolicy.policenummer,
      processingTime
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Policy slettet succesfuldt',
      deletedPolicy: {
        id: policyId,
        policenummer: existingPolicy.policenummer
      },
      processingTime 
    });

  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    
    safeLogger.error('Policy deletion error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      policyId,
      processingTime
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Kunne ikke slette policy',
        errorId: `policy-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyId
      }, 
      { status: 500 }
    );
  }
} 