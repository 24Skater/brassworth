import { test, expect } from '@playwright/test';
import { resetAppState } from './helpers';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('renders the marketing content', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /home inventory/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /track your property with confidence/i })
    ).toBeVisible();
  });

  test('routes to the auth page from the primary call to action', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start tracking now/i }).click();

    await expect(page).toHaveURL(/\/auth/);
  });

  test('shows a not-found page for an unknown route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });
});
