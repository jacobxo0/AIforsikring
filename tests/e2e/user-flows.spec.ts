/**
 * User Flow Tests for AI Forsikringsguiden
 * Formål: Test complete user journeys, authentication flows, og business processes
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Complete User Flows', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
  });

  test.describe('Authentication Flows', () => {
    test('should complete user registration flow', async () => {
      // Navigate to registration
      await page.click('[data-testid="register-button"]');
      await expect(page).toHaveURL(/.*\/register/);
      
      // Fill registration form
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="name-input"]', 'Test Bruger');
      
      // Accept terms and conditions
      await page.check('[data-testid="terms-checkbox"]');
      await page.check('[data-testid="privacy-checkbox"]');
      
      // Submit registration
      await page.click('[data-testid="submit-registration"]');
      
      // Should redirect to email verification
      await expect(page).toHaveURL(/.*\/verify-email/);
      await expect(page.locator('text=Bekræft din e-mail')).toBeVisible();
    });

    test('should complete user login flow', async () => {
      // Navigate to login
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL(/.*\/login/);
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', 'test-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      
      // Submit login
      await page.click('[data-testid="submit-login"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('[data-testid="user-welcome"]')).toBeVisible();
    });

    test('should handle password reset flow', async () => {
      await page.goto('/login');
      
      // Click forgot password
      await page.click('[data-testid="forgot-password-link"]');
      await expect(page).toHaveURL(/.*\/reset-password/);
      
      // Enter email
      await page.fill('[data-testid="reset-email-input"]', 'test@example.com');
      await page.click('[data-testid="send-reset-email"]');
      
      // Should show confirmation
      await expect(page.locator('text=Reset e-mail sendt')).toBeVisible();
    });

    test('should handle two-factor authentication', async () => {
      await page.goto('/login');
      
      // Login with 2FA enabled account
      await page.fill('[data-testid="email-input"]', 'test-2fa@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      
      // Should redirect to 2FA verification
      await expect(page).toHaveURL(/.*\/verify-2fa/);
      await expect(page.locator('[data-testid="2fa-code-input"]')).toBeVisible();
      
      // Enter 2FA code
      await page.fill('[data-testid="2fa-code-input"]', '123456');
      await page.click('[data-testid="verify-2fa"]');
      
      // Should complete login
      await expect(page).toHaveURL(/.*\/dashboard/);
    });
  });

  test.describe('Insurance Policy Management', () => {
    test.beforeEach(async () => {
      // Login as authenticated user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should complete policy creation flow', async () => {
      // Navigate to create policy
      await page.click('[data-testid="create-policy-button"]');
      await expect(page).toHaveURL(/.*\/policies\/new/);
      
      // Fill policy details
      await page.fill('[data-testid="policy-name-input"]', 'Min Bilforsikring');
      await page.selectOption('[data-testid="policy-type-select"]', 'auto');
      await page.fill('[data-testid="vehicle-make-input"]', 'Toyota');
      await page.fill('[data-testid="vehicle-model-input"]', 'Corolla');
      await page.fill('[data-testid="vehicle-year-input"]', '2020');
      
      // Select coverage options
      await page.check('[data-testid="comprehensive-coverage"]');
      await page.check('[data-testid="collision-coverage"]');
      
      // Review and submit
      await page.click('[data-testid="review-policy"]');
      await expect(page.locator('[data-testid="policy-summary"]')).toBeVisible();
      
      await page.click('[data-testid="submit-policy"]');
      
      // Should redirect to policy details
      await expect(page).toHaveURL(/.*\/policies\/[^\/]+/);
      await expect(page.locator('text=Police oprettet')).toBeVisible();
    });

    test('should complete policy comparison flow', async () => {
      await page.goto('/policies');
      
      // Select policies to compare
      await page.check('[data-testid="compare-policy-1"]');
      await page.check('[data-testid="compare-policy-2"]');
      
      // Start comparison
      await page.click('[data-testid="compare-selected"]');
      await expect(page).toHaveURL(/.*\/policies\/compare/);
      
      // Should show comparison table
      await expect(page.locator('[data-testid="comparison-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="policy-1-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="policy-2-details"]')).toBeVisible();
      
      // Should show recommendations
      await expect(page.locator('[data-testid="comparison-recommendations"]')).toBeVisible();
    });

    test('should complete policy renewal flow', async () => {
      await page.goto('/policies');
      
      // Find expiring policy
      await page.click('[data-testid="renew-policy-button"]');
      await expect(page).toHaveURL(/.*\/policies\/[^\/]+\/renew/);
      
      // Review current policy
      await expect(page.locator('[data-testid="current-policy-details"]')).toBeVisible();
      
      // Make changes if needed
      await page.click('[data-testid="modify-coverage"]');
      await page.check('[data-testid="add-roadside-assistance"]');
      
      // Confirm renewal
      await page.click('[data-testid="confirm-renewal"]');
      
      // Should show renewal confirmation
      await expect(page.locator('text=Police fornyet')).toBeVisible();
    });
  });

  test.describe('Claims Management', () => {
    test.beforeEach(async () => {
      // Login as authenticated user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should complete claim submission flow', async () => {
      // Navigate to claims
      await page.click('[data-testid="claims-menu"]');
      await page.click('[data-testid="file-new-claim"]');
      await expect(page).toHaveURL(/.*\/claims\/new/);
      
      // Select policy
      await page.selectOption('[data-testid="claim-policy-select"]', 'policy-1');
      
      // Fill claim details
      await page.selectOption('[data-testid="claim-type-select"]', 'collision');
      await page.fill('[data-testid="incident-date-input"]', '2024-01-15');
      await page.fill('[data-testid="incident-description"]', 'Kollision med andet køretøj på motorvejen');
      
      // Upload documents
      await page.setInputFiles('[data-testid="document-upload"]', 'tests/fixtures/accident-report.pdf');
      await page.setInputFiles('[data-testid="photo-upload"]', 'tests/fixtures/damage-photo.jpg');
      
      // Submit claim
      await page.click('[data-testid="submit-claim"]');
      
      // Should show confirmation
      await expect(page.locator('text=Skade anmeldt')).toBeVisible();
      await expect(page.locator('[data-testid="claim-number"]')).toBeVisible();
    });

    test('should track claim status', async () => {
      await page.goto('/claims');
      
      // View claim details
      await page.click('[data-testid="view-claim-details"]');
      
      // Should show claim timeline
      await expect(page.locator('[data-testid="claim-timeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="claim-status"]')).toBeVisible();
      
      // Should show progress indicators
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    });

    test('should handle claim communication', async () => {
      await page.goto('/claims/claim-123');
      
      // Send message to claims adjuster
      await page.fill('[data-testid="message-input"]', 'Jeg har yderligere dokumentation til sagen');
      await page.setInputFiles('[data-testid="attachment-upload"]', 'tests/fixtures/additional-docs.pdf');
      await page.click('[data-testid="send-message"]');
      
      // Should show message sent confirmation
      await expect(page.locator('text=Besked sendt')).toBeVisible();
      
      // Should update message thread
      await expect(page.locator('[data-testid="message-thread"]')).toContainText('Jeg har yderligere dokumentation');
    });
  });

  test.describe('AI Chat Assistant Flow', () => {
    test.beforeEach(async () => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should complete insurance consultation flow', async () => {
      // Open chat
      await page.click('[data-testid="chat-button"]');
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      
      // Start consultation
      await page.fill('[data-testid="chat-input"]', 'Jeg har brug for hjælp til at vælge bilforsikring');
      await page.click('[data-testid="send-message"]');
      
      // Should receive AI response
      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-response"]')).toContainText('bilforsikring');
      
      // Continue conversation
      await page.fill('[data-testid="chat-input"]', 'Jeg kører en Toyota Corolla fra 2020');
      await page.click('[data-testid="send-message"]');
      
      // Should receive personalized recommendations
      await expect(page.locator('[data-testid="insurance-recommendations"]')).toBeVisible();
      
      // Should offer to create quote
      await expect(page.locator('[data-testid="create-quote-button"]')).toBeVisible();
    });

    test('should handle policy questions', async () => {
      await page.goto('/chat');
      
      // Ask about existing policy
      await page.fill('[data-testid="chat-input"]', 'Hvad dækker min nuværende bilforsikring?');
      await page.click('[data-testid="send-message"]');
      
      // Should show policy details
      await expect(page.locator('[data-testid="policy-summary-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="coverage-details"]')).toBeVisible();
      
      // Should offer additional actions
      await expect(page.locator('[data-testid="policy-actions"]')).toBeVisible();
    });

    test('should provide claims guidance', async () => {
      await page.goto('/chat');
      
      // Ask about claims process
      await page.fill('[data-testid="chat-input"]', 'Hvordan anmelder jeg en skade?');
      await page.click('[data-testid="send-message"]');
      
      // Should provide step-by-step guidance
      await expect(page.locator('[data-testid="claims-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-by-step-guide"]')).toBeVisible();
      
      // Should offer to start claim process
      await expect(page.locator('[data-testid="start-claim-button"]')).toBeVisible();
    });
  });

  test.describe('Document Management Flow', () => {
    test.beforeEach(async () => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should complete document upload flow', async () => {
      await page.goto('/documents');
      
      // Upload document
      await page.click('[data-testid="upload-document-button"]');
      await page.setInputFiles('[data-testid="file-input"]', 'tests/fixtures/insurance-document.pdf');
      
      // Categorize document
      await page.selectOption('[data-testid="document-category"]', 'policy');
      await page.fill('[data-testid="document-description"]', 'Bilforsikring police dokument');
      
      // Submit upload
      await page.click('[data-testid="submit-upload"]');
      
      // Should show upload success
      await expect(page.locator('text=Dokument uploadet')).toBeVisible();
      
      // Should appear in document list
      await expect(page.locator('[data-testid="document-list"]')).toContainText('Bilforsikring police dokument');
    });

    test('should extract and analyze document content', async () => {
      await page.goto('/documents');
      
      // Upload policy document
      await page.setInputFiles('[data-testid="file-input"]', 'tests/fixtures/policy-document.pdf');
      await page.click('[data-testid="analyze-document"]');
      
      // Should show analysis results
      await expect(page.locator('[data-testid="document-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="extracted-data"]')).toBeVisible();
      
      // Should identify key information
      await expect(page.locator('[data-testid="policy-number"]')).toBeVisible();
      await expect(page.locator('[data-testid="coverage-details"]')).toBeVisible();
    });

    test('should organize documents by category', async () => {
      await page.goto('/documents');
      
      // Filter by category
      await page.selectOption('[data-testid="category-filter"]', 'claims');
      
      // Should show only claims documents
      await expect(page.locator('[data-testid="document-list"] [data-category="claims"]')).toBeVisible();
      
      // Search documents
      await page.fill('[data-testid="document-search"]', 'bilforsikring');
      
      // Should filter results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  test.describe('Premium User Features', () => {
    test.beforeEach(async () => {
      // Login as premium user
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test-premium@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should access advanced analytics', async () => {
      await page.goto('/analytics');
      
      // Should show premium analytics features
      await expect(page.locator('[data-testid="advanced-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="risk-assessment"]')).toBeVisible();
      
      // Should show detailed charts
      await expect(page.locator('[data-testid="premium-trends-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="claims-history-chart"]')).toBeVisible();
    });

    test('should access priority support', async () => {
      await page.goto('/support');
      
      // Should show premium support options
      await expect(page.locator('[data-testid="priority-support"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-chat-premium"]')).toBeVisible();
      
      // Should have faster response times
      await page.click('[data-testid="contact-support"]');
      await expect(page.locator('text=Prioriteret support')).toBeVisible();
    });

    test('should access advanced AI features', async () => {
      await page.goto('/chat');
      
      // Should have access to advanced AI features
      await expect(page.locator('[data-testid="ai-premium-features"]')).toBeVisible();
      
      // Test advanced analysis
      await page.fill('[data-testid="chat-input"]', 'Lav en detaljeret risikoanalyse af mine forsikringer');
      await page.click('[data-testid="send-message"]');
      
      // Should receive detailed analysis
      await expect(page.locator('[data-testid="detailed-risk-analysis"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-recommendations"]')).toBeVisible();
    });
  });

  test.describe('Error Recovery Flows', () => {
    test('should recover from network interruption', async () => {
      await page.goto('/dashboard');
      
      // Simulate network interruption
      await (page as any).setOffline(true);
      
      // Try to perform action
      await page.click('[data-testid="refresh-data"]');
      
      // Should show offline message
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      
      // Restore network
      await (page as any).setOffline(false);
      
      // Should automatically retry and recover
      await expect(page.locator('[data-testid="data-refreshed"]')).toBeVisible();
    });

    test('should handle session expiration gracefully', async () => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="submit-login"]');
      
      // Simulate session expiration
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
      });
      
      // Try to access protected resource
      await page.goto('/policies');
      
      // Should redirect to login with message
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.locator('text=Session udløbet')).toBeVisible();
    });
  });
}); 