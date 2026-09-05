import { test, expect } from '@playwright/test';
import { logIn, resetAppState, signUp, TEST_PASSWORD, uniqueEmail } from './helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
  });

  test('shows the login and sign up tabs', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: /home inventory/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sign up/i })).toBeVisible();
  });

  test('switches to the sign up form', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign up/i }).click();

    await expect(page.locator('#signup-name')).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-password-confirm')).toBeVisible();
  });

  test('switches back to the login form', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign up/i }).click();
    await expect(page.locator('#signup-name')).toBeVisible();

    await page.getByRole('tab', { name: /login/i }).click();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('signs up a new account and lands on the dashboard', async ({ page }) => {
    await signUp(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('signs back in with an existing account', async ({ page }) => {
    const { email, password } = await signUp(page);

    await page.goto('/auth');
    await page.evaluate(() => localStorage.removeItem('inventory_session'));

    await logIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('rejects a password below the minimum length', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign up/i }).click();

    await page.locator('#signup-name').fill('Weak Password User');
    await page.locator('#signup-email').fill(uniqueEmail());
    await page.locator('#signup-password').fill('short');
    await page.locator('#signup-password-confirm').fill('short');
    await page.getByRole('button', { name: /^sign up$/i }).click();

    // Stays on /auth rather than creating the account.
    await expect(page).toHaveURL(/\/auth/);
  });

  test('rejects an unknown account', async ({ page }) => {
    await page.goto('/auth');
    await page.locator('#login-email').fill(uniqueEmail());
    await page.locator('#login-password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /^login$/i }).click();

    await expect(page).toHaveURL(/\/auth/);
  });
});
