import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveURL(/.*auth/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show signup form when clicking sign up', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should navigate back to login from signup', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});


