import { test, expect } from '@playwright/test';
import { createProperty, resetAppState, signUp } from './helpers';

test.describe('Properties', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await signUp(page);
  });

  test('displays the properties page', async ({ page }) => {
    await page.goto('/organizations');
    await expect(page.getByRole('heading', { name: /properties/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create property/i })).toBeVisible();
  });

  test('creates a property', async ({ page }) => {
    await createProperty(page, 'Lakeside Cabin');
    await expect(page.getByText('Lakeside Cabin').first()).toBeVisible();
  });

  test('creates several properties', async ({ page }) => {
    await createProperty(page, 'First Property');
    await createProperty(page, 'Second Property');

    await expect(page.getByText('First Property').first()).toBeVisible();
    await expect(page.getByText('Second Property').first()).toBeVisible();
  });
});
