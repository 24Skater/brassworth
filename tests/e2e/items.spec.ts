import { test, expect } from '@playwright/test';
import { resetAppState, signUp, signUpWithProperty } from './helpers';

test.describe('Items', () => {
  test('prompts to pick a property when none exists', async ({ page }) => {
    await resetAppState(page);
    await signUp(page);

    await page.goto('/items');
    await expect(page.getByText(/no property selected/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /go to properties/i })).toBeVisible();
  });

  test('opens the items page once a property exists', async ({ page }) => {
    await signUpWithProperty(page);

    await page.goto('/items');
    await expect(page.getByText(/no property selected/i)).toBeHidden();
  });

  test('opens the new item form', async ({ page }) => {
    await signUpWithProperty(page);

    await page.goto('/items/new');
    await expect(page.getByText(/no property selected/i)).toBeHidden();
  });
});
