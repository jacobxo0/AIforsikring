/**
 * Global E2E test teardown for AI Forsikringsguiden
 * Formål: Clean up after all E2E tests are completed
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function globalTeardown() {
  console.log('🧹 Starting global E2E test teardown...');
  
  try {
    // Connect to database
    await prisma.$connect();
    console.log('📊 Connected to test database for cleanup');
    
    // Get test session info
    const testSessionId = process.env.E2E_SESSION_ID || 'unknown';
    const startTime = Date.now();
    
    // Clean up test data
    await prisma.policy.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });
    
    console.log('🗑️ Test data cleaned up');
    
    // Generate test report summary
    const testResultsPath = './test-results';
    if (fs.existsSync(testResultsPath)) {
      const files = fs.readdirSync(testResultsPath);
      console.log(`📁 Generated ${files.length} test result files`);
      
      // Count screenshots
      const screenshotPath = path.join(testResultsPath, 'screenshots');
      if (fs.existsSync(screenshotPath)) {
        const screenshots = fs.readdirSync(screenshotPath);
        console.log(`📸 Generated ${screenshots.length} screenshots`);
      }
    }
    
    // Performance summary
    const teardownDuration = Date.now() - startTime;
    console.log(`⚡ Teardown completed in ${teardownDuration}ms`);
    
    console.log(`🎯 Test session ${testSessionId} completed successfully`);
    
  } catch (error) {
    console.error('❌ E2E test teardown failed:', error);
  } finally {
    // Always disconnect
    await prisma.$disconnect();
    console.log('📊 Database connection closed');
  }
  
  console.log('✅ Global E2E test teardown completed');
}

export default globalTeardown; 