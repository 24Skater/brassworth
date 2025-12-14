import { test, expect } from '@playwright/test';

test.describe('Organizations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display organizations page', async ({ page }) => {
    await page.goto('/organizations');
    await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible();
  });
});
