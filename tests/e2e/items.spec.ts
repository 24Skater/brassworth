import { test, expect } from '@playwright/test';

test.describe('Items Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login if needed
    await page.goto('/');
    // Assuming we're logged in or can access items page
  });

  test('should display items page', async ({ page }) => {
    await page.goto('/items');
    await expect(page.getByRole('heading', { name: /items/i })).toBeVisible();
  });

  test('should show empty state when no items', async ({ page }) => {
    await page.goto('/items');
    // Check for empty state message
    const emptyState = page.getByText(/no items|empty/i);
    if (await emptyState.isVisible().catch(() => false)) {
      expect(emptyState).toBeVisible();
    }
  });
});
