/**
 * Performance Monitoring Tests for AI Forsikringsguiden
 * Formål: Test performance metrics, monitoring systems, og optimization features
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Performance Monitoring & Optimization', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Enable performance monitoring feature flag
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_performance_monitoring', 'true');
      window.localStorage.setItem('feature_real_time_monitoring', 'true');
    });

    await page.goto('/');
  });

  test.describe('Core Web Vitals Monitoring', () => {
    test('should measure and report Largest Contentful Paint (LCP)', async () => {
      await page.goto('/dashboard');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Get LCP measurement
      const lcpValue = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });

      // LCP should be under 2.5 seconds (good threshold)
      expect(lcpValue).toBeLessThan(2500);
      
      // Check if LCP is being tracked
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
    });

    test('should measure and report First Input Delay (FID)', async () => {
      await page.goto('/chat');
      
      // Simulate user interaction
      await page.click('[data-testid="chat-input"]');
      
      // Get FID measurement
      const fidValue = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              resolve((entries[0] as any).processingStart - entries[0].startTime);
            }
          }).observe({ entryTypes: ['first-input'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 3000);
        });
      });

      // FID should be under 100ms (good threshold)
      expect(fidValue).toBeLessThan(100);
    });

    test('should measure and report Cumulative Layout Shift (CLS)', async () => {
      await page.goto('/policies');
      
      // Wait for dynamic content to load
      await page.waitForTimeout(2000);
      
      // Get CLS measurement
      const clsValue = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            resolve(clsValue);
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Resolve after collecting shifts
          setTimeout(() => resolve(clsValue), 3000);
        });
      });

      // CLS should be under 0.1 (good threshold)
      expect(clsValue).toBeLessThan(0.1);
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should load critical resources quickly', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check if critical resources are loaded
      await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    });

    test('should optimize image loading with lazy loading', async () => {
      await page.goto('/policies');
      
      // Check if images are lazy loaded
      const images = await page.locator('img[loading="lazy"]').count();
      expect(images).toBeGreaterThan(0);
      
      // Check if images load when scrolled into view
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      
      // Verify images are loaded
      const loadedImages = await page.locator('img[src]:not([src=""])').count();
      expect(loadedImages).toBeGreaterThan(0);
    });

    test('should implement efficient code splitting', async () => {
      // Navigate to different routes and check for code splitting
      const routes = ['/chat', '/dashboard', '/policies', '/claims'];
      
      for (const route of routes) {
        const startTime = Date.now();
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Each route should load quickly due to code splitting
        expect(loadTime).toBeLessThan(2000);
      }
    });
  });

  test.describe('Memory Usage Monitoring', () => {
    test('should monitor memory usage and detect leaks', async () => {
      await page.goto('/dashboard');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.goto('/chat');
        await page.goto('/dashboard');
        await page.waitForTimeout(100);
      }

      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory growth should be reasonable (less than 50MB increase)
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    test('should clean up resources on component unmount', async () => {
      await page.goto('/chat');
      
      // Check if cleanup listeners are registered
      const hasCleanupListeners = await page.evaluate(() => {
        return window.addEventListener.toString().includes('cleanup') ||
               document.addEventListener.toString().includes('cleanup');
      });

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/chat');
      
      // Component should still function properly
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });
  });

  test.describe('API Performance Monitoring', () => {
    test('should measure API response times', async () => {
      const apiCalls: { url: string; duration: number }[] = [];
      
      // Monitor API calls
      page.on('response', async (response) => {
        if (response.url().includes('/api/')) {
          const request = response.request();
          const timing = (response as any).timing();
          apiCalls.push({
            url: response.url(),
            duration: timing.responseEnd - timing.requestStart
          });
        }
      });

      await page.goto('/policies');
      await page.waitForLoadState('networkidle');
      
      // Check API response times
      for (const call of apiCalls) {
        expect(call.duration).toBeLessThan(5000); // 5 second timeout
      }
      
      // Average response time should be reasonable
      if (apiCalls.length > 0) {
        const avgResponseTime = apiCalls.reduce((sum, call) => sum + call.duration, 0) / apiCalls.length;
        expect(avgResponseTime).toBeLessThan(2000); // 2 second average
      }
    });

    test('should implement request caching', async () => {
      await page.goto('/policies');
      
      // First request
      const firstLoadStart = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const firstLoadTime = Date.now() - firstLoadStart;
      
      // Second request (should be cached)
      const secondLoadStart = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const secondLoadTime = Date.now() - secondLoadStart;
      
      // Second load should be faster due to caching
      expect(secondLoadTime).toBeLessThan(firstLoadTime);
    });

    test('should handle concurrent API requests efficiently', async () => {
      await page.goto('/dashboard');
      
      // Trigger multiple concurrent requests
      await Promise.all([
        page.click('[data-testid="refresh-policies"]'),
        page.click('[data-testid="refresh-claims"]'),
        page.click('[data-testid="refresh-analytics"]')
      ]);
      
      await page.waitForLoadState('networkidle');
      
      // All sections should load successfully
      await expect(page.locator('[data-testid="policies-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="claims-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-section"]')).toBeVisible();
    });
  });

  test.describe('Real-time Performance Monitoring', () => {
    test('should display performance metrics in real-time', async () => {
      await page.goto('/');
      
      // Check if performance monitoring widget is present
      await expect(page.locator('[data-testid="performance-monitor"]')).toBeVisible();
      
      // Check if metrics are being updated
      const initialMetrics = await page.locator('[data-testid="performance-metrics"]').textContent();
      
      // Perform some actions
      await page.goto('/chat');
      await page.goto('/dashboard');
      
      await page.waitForTimeout(2000);
      
      const updatedMetrics = await page.locator('[data-testid="performance-metrics"]').textContent();
      
      // Metrics should have updated
      expect(updatedMetrics).not.toBe(initialMetrics);
    });

    test('should alert on performance degradation', async () => {
      await page.goto('/');
      
      // Simulate performance degradation
      await page.evaluate(() => {
        // Simulate slow operation
        const start = Date.now();
        while (Date.now() - start < 3000) {
          // Busy wait to simulate slow operation
        }
      });

      // Check if performance alert is triggered
      await expect(page.locator('[data-testid="performance-alert"]')).toBeVisible();
      await expect(page.locator('text=Ydeevne påvirket')).toBeVisible();
    });

    test('should track user interaction performance', async () => {
      await page.goto('/chat');
      
      // Measure interaction response time
      const startTime = Date.now();
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');
      
      // Wait for response
      await expect(page.locator('[data-testid="chat-message"]').last()).toBeVisible();
      const responseTime = Date.now() - startTime;
      
      // Interaction should be responsive
      expect(responseTime).toBeLessThan(1000);
      
      // Check if interaction metrics are recorded
      const metricsRecorded = await page.evaluate(() => {
        return window.localStorage.getItem('interaction_metrics') !== null;
      });
      
      expect(metricsRecorded).toBe(true);
    });
  });

  test.describe('Performance Optimization Features', () => {
    test('should implement service worker for caching', async () => {
      await page.goto('/');
      
      // Check if service worker is registered
      const swRegistered = await page.evaluate(async () => {
        return 'serviceWorker' in navigator && 
               (await navigator.serviceWorker.getRegistration()) !== undefined;
      });
      
      expect(swRegistered).toBe(true);
    });

    test('should preload critical resources', async () => {
      await page.goto('/');
      
      // Check if critical resources are preloaded
      const preloadLinks = await page.locator('link[rel="preload"]').count();
      expect(preloadLinks).toBeGreaterThan(0);
      
      // Check if DNS prefetch is implemented
      const dnsPrefetchLinks = await page.locator('link[rel="dns-prefetch"]').count();
      expect(dnsPrefetchLinks).toBeGreaterThan(0);
    });

    test('should implement virtual scrolling for large lists', async () => {
      await page.goto('/policies');
      
      // Check if virtual scrolling is implemented for large lists
      const virtualScrollContainer = await page.locator('[data-testid="virtual-scroll-container"]').count();
      
      if (virtualScrollContainer > 0) {
        // Test virtual scrolling performance
        const startTime = Date.now();
        
        // Scroll through large list
        for (let i = 0; i < 10; i++) {
          await page.evaluate(() => {
            window.scrollBy(0, 500);
          });
          await page.waitForTimeout(100);
        }
        
        const scrollTime = Date.now() - startTime;
        
        // Virtual scrolling should maintain performance
        expect(scrollTime).toBeLessThan(2000);
      }
    });
  });

  test.describe('Performance Reporting', () => {
    test('should generate performance reports', async () => {
      await page.goto('/dashboard');
      
      // Trigger performance report generation
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('generate-performance-report'));
      });
      
      await page.waitForTimeout(2000);
      
      // Check if performance report is available
      const reportGenerated = await page.evaluate(() => {
        return window.localStorage.getItem('performance_report') !== null;
      });
      
      expect(reportGenerated).toBe(true);
    });

    test('should track performance trends over time', async () => {
      await page.goto('/');
      
      // Simulate multiple sessions
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
      
      // Check if performance trends are tracked
      const trendsTracked = await page.evaluate(() => {
        const trends = window.localStorage.getItem('performance_trends');
        return trends && JSON.parse(trends).length > 0;
      });
      
      expect(trendsTracked).toBe(true);
    });

    test('should export performance data for analysis', async () => {
      await page.goto('/dashboard');
      
      // Trigger performance data export
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('export-performance-data'));
      });
      
      await page.waitForTimeout(1000);
      
      // Check if export functionality works
      const exportTriggered = await page.evaluate(() => {
        return document.querySelector('[data-testid="performance-export"]') !== null;
      });
      
      expect(exportTriggered).toBe(true);
    });
  });
}); 