/**
 * Test Helper Utilities for AI Forsikringsguiden
 * Formål: Reusable functions for Playwright tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Authentication helpers
 */
export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Login with test user credentials
   */
  async loginAsUser(email: string = 'test-user@example.com', password: string = 'TestPassword123!'): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="submit-login"]');
    await expect(this.page).toHaveURL(/.*\/dashboard/);
  }

  /**
   * Login as premium user
   */
  async loginAsPremiumUser(): Promise<void> {
    await this.loginAsUser('test-premium@example.com', 'TestPassword123!');
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin(): Promise<void> {
    await this.loginAsUser('test-admin@example.com', 'TestPassword123!');
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await expect(this.page).toHaveURL(/.*\/login/);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Form helpers
 */
export class FormHelpers {
  constructor(private page: Page) {}

  /**
   * Fill insurance policy form
   */
  async fillPolicyForm(policyData: {
    name: string;
    type: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    coverage?: string[];
  }): Promise<void> {
    await this.page.fill('[data-testid="policy-name-input"]', policyData.name);
    await this.page.selectOption('[data-testid="policy-type-select"]', policyData.type);

    if (policyData.type === 'auto') {
      if (policyData.vehicleMake) {
        await this.page.fill('[data-testid="vehicle-make-input"]', policyData.vehicleMake);
      }
      if (policyData.vehicleModel) {
        await this.page.fill('[data-testid="vehicle-model-input"]', policyData.vehicleModel);
      }
      if (policyData.vehicleYear) {
        await this.page.fill('[data-testid="vehicle-year-input"]', policyData.vehicleYear);
      }
    }

    if (policyData.coverage) {
      for (const coverage of policyData.coverage) {
        await this.page.check(`[data-testid="${coverage}-coverage"]`);
      }
    }
  }

  /**
   * Fill claim form
   */
  async fillClaimForm(claimData: {
    policyId: string;
    type: string;
    date: string;
    description: string;
    documents?: string[];
  }): Promise<void> {
    await this.page.selectOption('[data-testid="claim-policy-select"]', claimData.policyId);
    await this.page.selectOption('[data-testid="claim-type-select"]', claimData.type);
    await this.page.fill('[data-testid="incident-date-input"]', claimData.date);
    await this.page.fill('[data-testid="incident-description"]', claimData.description);

    if (claimData.documents) {
      for (const doc of claimData.documents) {
        await this.page.setInputFiles('[data-testid="document-upload"]', doc);
      }
    }
  }

  /**
   * Wait for form validation and check for errors
   */
  async waitForFormValidation(): Promise<string[]> {
    await this.page.waitForTimeout(500); // Wait for validation to run
    
    const errorElements = await this.page.locator('[data-testid*="form-error"]').all();
    const errors: string[] = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) errors.push(text);
    }
    
    return errors;
  }
}

/**
 * Navigation helpers
 */
export class NavigationHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to main sections
   */
  async goToDashboard(): Promise<void> {
    await this.page.click('[data-testid="dashboard-nav"]');
    await expect(this.page).toHaveURL(/.*\/dashboard/);
  }

  async goToPolicies(): Promise<void> {
    await this.page.click('[data-testid="policies-nav"]');
    await expect(this.page).toHaveURL(/.*\/policies/);
  }

  async goToClaims(): Promise<void> {
    await this.page.click('[data-testid="claims-nav"]');
    await expect(this.page).toHaveURL(/.*\/claims/);
  }

  async goToChat(): Promise<void> {
    await this.page.click('[data-testid="chat-nav"]');
    await expect(this.page).toHaveURL(/.*\/chat/);
  }

  async goToDocuments(): Promise<void> {
    await this.page.click('[data-testid="documents-nav"]');
    await expect(this.page).toHaveURL(/.*\/documents/);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-testid="page-loaded"]', { timeout: 10000 });
  }
}

/**
 * API helpers
 */
export class ApiHelpers {
  constructor(private page: Page) {}

  /**
   * Mock API responses
   */
  async mockApiResponse(endpoint: string, response: any, status: number = 200): Promise<void> {
    await this.page.route(`**/api/${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Mock API error
   */
  async mockApiError(endpoint: string, status: number = 500, error: string = 'Internal Server Error'): Promise<void> {
    await this.page.route(`**/api/${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error })
      });
    });
  }

  /**
   * Mock network failure
   */
  async mockNetworkFailure(endpoint: string): Promise<void> {
    await this.page.route(`**/api/${endpoint}`, route => {
      route.abort('failed');
    });
  }

  /**
   * Wait for API call and capture request
   */
  async waitForApiCall(endpoint: string): Promise<any> {
    return new Promise((resolve) => {
      this.page.on('request', (request) => {
        if (request.url().includes(`/api/${endpoint}`)) {
          resolve({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
          });
        }
      });
    });
  }
}

/**
 * Error testing helpers
 */
export class ErrorHelpers {
  constructor(private page: Page) {}

  /**
   * Trigger component error
   */
  async triggerComponentError(component: string, message: string = 'Test error'): Promise<void> {
    await this.page.evaluate(({ component, message }) => {
      const errorEvent = new CustomEvent('test-error', {
        detail: { component, message }
      });
      window.dispatchEvent(errorEvent);
    }, { component, message });
  }

  /**
   * Trigger network error
   */
  async triggerNetworkError(): Promise<void> {
    await this.page.evaluate(() => {
      const errorEvent = new CustomEvent('network-error', {
        detail: { message: 'Network connection failed' }
      });
      window.dispatchEvent(errorEvent);
    });
  }

  /**
   * Check if error boundary is displayed
   */
  async expectErrorBoundary(boundaryType: string = 'error-boundary-fallback'): Promise<void> {
    await expect(this.page.locator(`[data-testid="${boundaryType}"]`)).toBeVisible();
  }

  /**
   * Check if error message is displayed
   */
  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  /**
   * Retry from error state
   */
  async retryFromError(): Promise<void> {
    await this.page.click('[data-testid="error-retry-button"]');
  }
}

/**
 * Performance testing helpers
 */
export class PerformanceHelpers {
  constructor(private page: Page) {}

  /**
   * Measure page load time
   */
  async measurePageLoadTime(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  /**
   * Measure Core Web Vitals
   */
  async measureCoreWebVitals(): Promise<{
    lcp: number;
    fid: number;
    cls: number;
  }> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = { lcp: 0, fid: 0, cls: 0 };
        let metricsCollected = 0;

        // Measure LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
          metricsCollected++;
          if (metricsCollected === 3) resolve(vitals);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Measure FID
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const entry = entries[0] as any; // Type assertion for FID entry
            vitals.fid = entry.processingStart - entry.startTime;
          }
          metricsCollected++;
          if (metricsCollected === 3) resolve(vitals);
        }).observe({ entryTypes: ['first-input'] });

        // Measure CLS
        new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as any; // Type assertion for layout shift entry
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
          vitals.cls = clsValue;
          metricsCollected++;
          if (metricsCollected === 3) resolve(vitals);
        }).observe({ entryTypes: ['layout-shift'] });

        // Timeout fallback
        setTimeout(() => resolve(vitals), 5000);
      });
    });
  }

  /**
   * Monitor memory usage
   */
  async getMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
  }

  /**
   * Simulate slow network
   */
  async simulateSlowNetwork(): Promise<void> {
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024, // 50 KB/s
      uploadThroughput: 20 * 1024,   // 20 KB/s
      latency: 500 // 500ms latency
    });
  }
}

/**
 * Chat testing helpers
 */
export class ChatHelpers {
  constructor(private page: Page) {}

  /**
   * Send chat message and wait for response
   */
  async sendMessage(message: string): Promise<string> {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');
    
    // Wait for AI response
    await expect(this.page.locator('[data-testid="ai-response"]').last()).toBeVisible();
    
    const response = await this.page.locator('[data-testid="ai-response"]').last().textContent();
    return response || '';
  }

  /**
   * Check if chat interface is ready
   */
  async waitForChatReady(): Promise<void> {
    await expect(this.page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="chat-input"]')).toBeEnabled();
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(): Promise<void> {
    await this.page.click('[data-testid="clear-chat-button"]');
    await expect(this.page.locator('[data-testid="chat-messages"]')).toBeEmpty();
  }
}

/**
 * Document testing helpers
 */
export class DocumentHelpers {
  constructor(private page: Page) {}

  /**
   * Upload document
   */
  async uploadDocument(filePath: string, category: string = 'policy', description: string = 'Test document'): Promise<void> {
    await this.page.setInputFiles('[data-testid="file-input"]', filePath);
    await this.page.selectOption('[data-testid="document-category"]', category);
    await this.page.fill('[data-testid="document-description"]', description);
    await this.page.click('[data-testid="submit-upload"]');
    
    await expect(this.page.locator('text=Dokument uploadet')).toBeVisible();
  }

  /**
   * Wait for document analysis
   */
  async waitForDocumentAnalysis(): Promise<void> {
    await expect(this.page.locator('[data-testid="document-analysis"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="analysis-complete"]')).toBeVisible();
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string): Promise<number> {
    await this.page.fill('[data-testid="document-search"]', query);
    await this.page.waitForTimeout(500); // Wait for search debounce
    
    const results = await this.page.locator('[data-testid="search-results"] [data-testid="document-item"]').count();
    return results;
  }
}

/**
 * Accessibility helpers
 */
export class AccessibilityHelpers {
  constructor(private page: Page) {}

  /**
   * Check keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Test Tab navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
  }

  /**
   * Check ARIA labels
   */
  async checkAriaLabels(): Promise<string[]> {
    const elementsWithoutLabels = await this.page.locator('button:not([aria-label]):not([aria-labelledby])').all();
    const issues: string[] = [];
    
    for (const element of elementsWithoutLabels) {
      const text = await element.textContent();
      if (!text || text.trim() === '') {
        issues.push('Button without accessible label found');
      }
    }
    
    return issues;
  }

  /**
   * Check color contrast
   */
  async checkColorContrast(): Promise<boolean> {
    // This would typically use axe-core or similar tool
    // For now, just check if high contrast mode is supported
    const supportsHighContrast = await this.page.evaluate(() => {
      return window.matchMedia('(prefers-contrast: high)').matches;
    });
    
    return supportsHighContrast;
  }
}

/**
 * Main test helper class that combines all helpers
 */
export class TestHelpers {
  public auth: AuthHelpers;
  public forms: FormHelpers;
  public navigation: NavigationHelpers;
  public api: ApiHelpers;
  public errors: ErrorHelpers;
  public performance: PerformanceHelpers;
  public chat: ChatHelpers;
  public documents: DocumentHelpers;
  public accessibility: AccessibilityHelpers;

  constructor(page: Page) {
    this.auth = new AuthHelpers(page);
    this.forms = new FormHelpers(page);
    this.navigation = new NavigationHelpers(page);
    this.api = new ApiHelpers(page);
    this.errors = new ErrorHelpers(page);
    this.performance = new PerformanceHelpers(page);
    this.chat = new ChatHelpers(page);
    this.documents = new DocumentHelpers(page);
    this.accessibility = new AccessibilityHelpers(page);
  }
} 