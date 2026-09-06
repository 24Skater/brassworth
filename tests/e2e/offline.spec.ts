import { test, expect } from '@playwright/test';
import { signUpWithProperty } from './helpers';

/**
 * These tests run against local-first mode (VITE_STORAGE_PROVIDER unset,
 * the app's default), which is what the E2E build in this repo produces.
 * OfflineBanner only warns in server ('api') mode -- see
 * src/components/OfflineBanner.tsx -- because local-first writes are just
 * browser API calls that succeed with or without a network. A banner here
 * would be a false warning, which is why the second test below asserts the
 * banner's ABSENCE rather than its text.
 */
test.describe('Offline', () => {
  test('the app still loads with the network gone', async ({ page, context }) => {
    await signUpWithProperty(page);
    await page.goto('/items');

    // Let the service worker take control before cutting the network.
    await page.evaluate(() => navigator.serviceWorker?.ready);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { name: /brassworth/i })).toBeVisible();
    await expect(page.getByText(/no property selected/i)).toBeHidden();

    await context.setOffline(false);
  });

  test('says nothing about saving, because local-first writes are not at risk', async ({
    page,
    context,
  }) => {
    await signUpWithProperty(page);
    await page.goto('/items');
    await page.evaluate(() => navigator.serviceWorker?.ready);

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByRole('status')).toHaveCount(0);

    await context.setOffline(false);
  });
});
