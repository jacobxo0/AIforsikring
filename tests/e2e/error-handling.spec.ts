/**
 * Error Handling Tests for AI Forsikringsguiden
 * Formål: Test error boundaries, fallback UI, og error recovery mechanisms
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Error Handling & Recovery', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Enable error testing feature flag
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_error_testing', 'true');
    });

    await page.goto('/');
  });

  test.describe('Error Boundaries', () => {
    test('should display fallback UI when component crashes', async () => {
      // Navigate to a page with error boundary
      await page.goto('/chat');
      
      // Trigger a component error by injecting faulty code
      await page.evaluate(() => {
        // Simulate component crash
        const errorEvent = new CustomEvent('test-error', {
          detail: { message: 'Simulated component crash' }
        });
        window.dispatchEvent(errorEvent);
      });

      // Check if error boundary fallback is displayed
      await expect(page.locator('[data-testid="error-boundary-fallback"]')).toBeVisible();
      await expect(page.locator('text=Der opstod en fejl')).toBeVisible();
      
      // Check if retry button is present
      await expect(page.locator('[data-testid="error-retry-button"]')).toBeVisible();
    });

    test('should recover from error when retry button is clicked', async () => {
      await page.goto('/chat');
      
      // Trigger error
      await page.evaluate(() => {
        const errorEvent = new CustomEvent('test-error', {
          detail: { message: 'Recoverable error' }
        });
        window.dispatchEvent(errorEvent);
      });

      // Wait for error boundary
      await expect(page.locator('[data-testid="error-boundary-fallback"]')).toBeVisible();
      
      // Click retry button
      await page.click('[data-testid="error-retry-button"]');
      
      // Check if component recovered
      await expect(page.locator('[data-testid="error-boundary-fallback"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('should show hierarchical error boundaries', async () => {
      await page.goto('/dashboard');
      
      // Trigger widget-level error
      await page.evaluate(() => {
        const errorEvent = new CustomEvent('widget-error', {
          detail: { component: 'dashboard-widget', message: 'Widget crashed' }
        });
        window.dispatchEvent(errorEvent);
      });

      // Check if only widget error boundary is triggered, not page-level
      await expect(page.locator('[data-testid="widget-error-boundary"]')).toBeVisible();
      await expect(page.locator('[data-testid="page-error-boundary"]')).not.toBeVisible();
      
      // Rest of dashboard should still be functional
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      await page.goto('/policies');
      
      // Check if network error message is displayed
      await expect(page.locator('[data-testid="network-error-message"]')).toBeVisible();
      await expect(page.locator('text=Netværksfejl')).toBeVisible();
      
      // Check if retry mechanism is available
      await expect(page.locator('[data-testid="retry-network-button"]')).toBeVisible();
    });

    test('should handle API timeout errors', async () => {
      // Mock slow API response
      await page.route('**/api/policies', route => {
        setTimeout(() => route.fulfill({
          status: 408,
          body: JSON.stringify({ error: 'Request timeout' })
        }), 5000);
      });

      await page.goto('/policies');
      
      // Check if timeout error is handled
      await expect(page.locator('[data-testid="timeout-error-message"]')).toBeVisible();
      await expect(page.locator('text=Anmodningen tog for lang tid')).toBeVisible();
    });

    test('should handle server errors (5xx)', async () => {
      // Mock server error
      await page.route('**/api/chat', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/chat');
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');
      
      // Check if server error is handled
      await expect(page.locator('[data-testid="server-error-message"]')).toBeVisible();
      await expect(page.locator('text=Serverfejl')).toBeVisible();
    });

    test('should handle authentication errors', async () => {
      // Mock auth error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });

      await page.goto('/dashboard');
      
      // Check if auth error redirects to login
      await expect(page).toHaveURL(/.*\/login/);
      await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible();
    });
  });

  test.describe('Form Error Handling', () => {
    test('should validate form inputs and show errors', async () => {
      await page.goto('/policies/new');
      
      // Submit form without required fields
      await page.click('[data-testid="submit-policy-button"]');
      
      // Check if validation errors are displayed
      await expect(page.locator('[data-testid="form-error-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="form-error-type"]')).toBeVisible();
      await expect(page.locator('text=Dette felt er påkrævet')).toBeVisible();
    });

    test('should handle form submission errors', async () => {
      // Mock form submission error
      await page.route('**/api/policies', route => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ 
            error: 'Validation failed',
            details: { name: 'Policy name already exists' }
          })
        });
      });

      await page.goto('/policies/new');
      await page.fill('[data-testid="policy-name-input"]', 'Test Policy');
      await page.selectOption('[data-testid="policy-type-select"]', 'auto');
      await page.click('[data-testid="submit-policy-button"]');
      
      // Check if submission error is displayed
      await expect(page.locator('[data-testid="submission-error"]')).toBeVisible();
      await expect(page.locator('text=Policy name already exists')).toBeVisible();
    });
  });

  test.describe('Real-time Error Monitoring', () => {
    test('should display error status indicator', async () => {
      await page.goto('/');
      
      // Check if error status indicator is present
      await expect(page.locator('[data-testid="api-status-indicator"]')).toBeVisible();
      
      // Initially should show healthy status
      await expect(page.locator('[data-testid="status-healthy"]')).toBeVisible();
    });

    test('should update error status in real-time', async () => {
      await page.goto('/');
      
      // Mock API error
      await page.route('**/api/health', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ status: 'error' })
        });
      });

      // Trigger health check
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('check-api-health'));
      });

      // Check if status indicator updates
      await expect(page.locator('[data-testid="status-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-healthy"]')).not.toBeVisible();
    });

    test('should show error summary in floating widget', async () => {
      await page.goto('/');
      
      // Trigger multiple errors
      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) {
          window.dispatchEvent(new CustomEvent('api-error', {
            detail: { 
              type: 'network',
              message: `Network error ${i + 1}`,
              severity: 'high'
            }
          }));
        }
      });

      // Check if floating error widget appears
      await expect(page.locator('[data-testid="floating-error-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-count"]')).toContainText('3');
    });
  });

  test.describe('Error Recovery Mechanisms', () => {
    test('should implement circuit breaker pattern', async () => {
      // Mock multiple consecutive failures
      let failureCount = 0;
      await page.route('**/api/policies', route => {
        failureCount++;
        if (failureCount <= 5) {
          route.fulfill({ status: 500 });
        } else {
          // Circuit breaker should prevent further calls
          route.fulfill({
            status: 503,
            body: JSON.stringify({ error: 'Circuit breaker open' })
          });
        }
      });

      await page.goto('/policies');
      
      // Trigger multiple requests
      for (let i = 0; i < 6; i++) {
        await page.click('[data-testid="refresh-policies"]');
        await page.waitForTimeout(100);
      }

      // Check if circuit breaker message is displayed
      await expect(page.locator('[data-testid="circuit-breaker-message"]')).toBeVisible();
      await expect(page.locator('text=Tjenesten er midlertidigt utilgængelig')).toBeVisible();
    });

    test('should implement graceful degradation', async () => {
      // Mock partial service failure
      await page.route('**/api/recommendations', route => {
        route.fulfill({ status: 503 });
      });

      await page.goto('/dashboard');
      
      // Check if main functionality still works
      await expect(page.locator('[data-testid="dashboard-main"]')).toBeVisible();
      
      // Check if degraded service message is shown
      await expect(page.locator('[data-testid="degraded-service-notice"]')).toBeVisible();
      await expect(page.locator('text=Nogle funktioner er midlertidigt utilgængelige')).toBeVisible();
    });

    test('should implement automatic retry with exponential backoff', async () => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];

      await page.route('**/api/policies', route => {
        attemptCount++;
        attemptTimes.push(Date.now());
        
        if (attemptCount <= 2) {
          route.fulfill({ status: 500 });
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ policies: [] })
          });
        }
      });

      await page.goto('/policies');
      
      // Wait for retries to complete
      await page.waitForTimeout(5000);
      
      // Check if data eventually loads
      await expect(page.locator('[data-testid="policies-list"]')).toBeVisible();
      
      // Verify exponential backoff (times should increase)
      expect(attemptCount).toBe(3);
      if (attemptTimes.length >= 2) {
        const firstDelay = attemptTimes[1] - attemptTimes[0];
        const secondDelay = attemptTimes[2] - attemptTimes[1];
        expect(secondDelay).toBeGreaterThan(firstDelay);
      }
    });
  });

  test.describe('Error Logging & Reporting', () => {
    test('should log errors to monitoring system', async () => {
      await page.goto('/chat');
      
      // Trigger an error
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('test-error', {
          detail: { 
            message: 'Test error for logging',
            stack: 'Error stack trace',
            component: 'ChatInterface'
          }
        }));
      });

      // Check if error was logged (via network request)
      const logRequests = [];
      page.on('request', request => {
        if (request.url().includes('/api/logs')) {
          logRequests.push(request);
        }
      });

      await page.waitForTimeout(1000);
      expect(logRequests.length).toBeGreaterThan(0);
    });

    test('should provide error feedback to users', async () => {
      await page.goto('/');
      
      // Trigger error
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('user-feedback-error', {
          detail: { 
            message: 'Something went wrong',
            actionable: true
          }
        }));
      });

      // Check if user feedback is displayed
      await expect(page.locator('[data-testid="error-feedback"]')).toBeVisible();
      await expect(page.locator('[data-testid="feedback-actions"]')).toBeVisible();
      await expect(page.locator('text=Rapportér fejl')).toBeVisible();
    });
  });
}); 