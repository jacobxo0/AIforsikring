import { test, expect } from '@playwright/test';

test('forsiden loader og har Hjem-link', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/AI Forsikringsguiden/i);
  await expect(page.getByRole('link', { name: /Hjem/i })).toBeVisible();
}); 