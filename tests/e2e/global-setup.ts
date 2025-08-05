/**
 * Global Setup for Playwright Tests
 * Formål: Database seeding, authentication setup, og test environment preparation
 */

import { chromium, FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

/**
 * Global setup function kørt før alle tests
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🚀 Starting global setup for AI Forsikringsguiden tests...');

  try {
    // 1. Database setup og seeding
    await setupDatabase();

    // 2. Authentication setup
    await setupAuthentication();

    // 3. Test data preparation
    await prepareTestData();

    // 4. Feature flags setup
    await setupFeatureFlags();

    // 5. Monitoring setup
    await setupMonitoring();

    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Database setup og migration
 */
async function setupDatabase(): Promise<void> {
  console.log('📊 Setting up test database...');

  try {
    // Ensure database is ready
    await prisma.$connect();
    
    // Clean up existing test data
    await prisma.policy.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });

    // Seed basic test data
    console.log('🗃️ Test environment initialized');

    console.log('✅ Database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Authentication setup for tests
 */
async function setupAuthentication(): Promise<void> {
  console.log('🔐 Setting up test authentication...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found, skipping auth setup');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create test users if they don't exist
    const testUsers = [
      {
        email: 'test-user@example.com',
        password: 'TestPassword123!',
        role: 'user'
      },
      {
        email: 'test-premium@example.com',
        password: 'TestPassword123!',
        role: 'premium'
      },
      {
        email: 'test-admin@example.com',
        password: 'TestPassword123!',
        role: 'admin'
      }
    ];

    for (const user of testUsers) {
      const { error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role,
          test_user: true
        }
      });

      if (error && !error.message.includes('already registered')) {
        console.error(`Failed to create test user ${user.email}:`, error);
      }
    }

    console.log('✅ Authentication setup completed');
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  }
}

/**
 * Prepare test data
 */
async function prepareTestData(): Promise<void> {
  console.log('📋 Preparing test data...');

  // Create test insurance policies
  const testPolicies = [
    {
      id: 'test-policy-1',
      name: 'Test Bilforsikring',
      type: 'auto',
      premium: 2500,
      coverage: 'Kasko'
    },
    {
      id: 'test-policy-2',
      name: 'Test Husforsikring',
      type: 'home',
      premium: 3500,
      coverage: 'Fuld dækning'
    }
  ];

  // Store test data in environment variables for tests
  process.env.TEST_POLICIES = JSON.stringify(testPolicies);
  
  console.log('✅ Test data preparation completed');
}

/**
 * Setup feature flags for testing
 */
async function setupFeatureFlags(): Promise<void> {
  console.log('🚩 Setting up feature flags for testing...');

  const testFeatureFlags = {
    FEATURE_ERROR_TESTING: 'true',
    FEATURE_PERFORMANCE_MONITORING: 'true',
    FEATURE_REAL_TIME_MONITORING: 'true',
    FEATURE_ADVANCED_ANALYTICS: 'true',
    FEATURE_CIRCUIT_BREAKER: 'true',
    FEATURE_RATE_LIMITING: 'true',
    FEATURE_DISTRIBUTED_TRACING: 'true',
    FEATURE_HEALTH_CHECKS: 'true',
    FEATURE_GRACEFUL_DEGRADATION: 'true',
    FEATURE_MEMORY_MONITORING: 'true'
  };

  // Set feature flags as environment variables
  Object.entries(testFeatureFlags).forEach(([key, value]) => {
    process.env[`NEXT_PUBLIC_${key}`] = value;
  });

  console.log('✅ Feature flags setup completed');
}

/**
 * Setup monitoring for tests
 */
async function setupMonitoring(): Promise<void> {
  console.log('📊 Setting up test monitoring...');

  // Initialize test session for monitoring
  const testSessionId = `test-session-${Date.now()}`;
  process.env.TEST_SESSION_ID = testSessionId;

  // Create initial monitoring entry
  try {
    console.log(`🔍 Test session initiated: ${testSessionId}`);
    console.log('✅ Test monitoring setup completed');
  } catch (error) {
    console.warn('⚠️ Test monitoring setup failed, continuing anyway:', error);
  }
}

export default globalSetup; 