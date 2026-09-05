import { test, expect, type Page } from '@playwright/test';
import { signUpWithProperty } from './helpers';

async function createItem(
  page: Page,
  name: string,
  fields: { brand?: string; price?: string } = {}
): Promise<void> {
  await page.goto('/items/new');
  await page.locator('#name').fill(name);
  if (fields.brand) await page.locator('#brand').fill(fields.brand);
  if (fields.price) await page.locator('#purchasePrice').fill(fields.price);
  await page.getByRole('button', { name: /create item/i }).click();
  await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });
}

test.describe('Value reporting', () => {
  test('breaks value down by brand', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Drill', { brand: 'Milwaukee', price: '200' });
    await createItem(page, 'Switch', { brand: 'Ubiquiti', price: '350' });

    await page.goto('/dashboard');

    const breakdown = page.getByTestId('value-breakdown');
    await expect(breakdown).toBeVisible();

    await breakdown.getByRole('tab', { name: /brand/i }).click();

    // Most valuable first, and IT gear sits alongside tools without ceremony.
    await expect(breakdown).toContainText('Ubiquiti');
    await expect(breakdown).toContainText('Milwaukee');
    await expect(breakdown).toContainText('350.00');
  });

  test('labels items with no brand rather than hiding them', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Unbranded Thing', { price: '25' });

    await page.goto('/dashboard');
    const breakdown = page.getByTestId('value-breakdown');
    await breakdown.getByRole('tab', { name: /brand/i }).click();

    await expect(breakdown).toContainText('No brand');
  });

  test('excludes a sold item from the value breakdown', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Kept Drill', { brand: 'Milwaukee', price: '200' });
    await createItem(page, 'Sold Saw', { brand: 'Sold Brand', price: '400' });

    await page.getByText('Sold Saw').first().click();
    await page.getByTestId('record-event').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('What happened').click();
    await page.getByRole('option', { name: /^sold$/i }).click();
    await dialog.locator('#event-amount').fill('300');
    await dialog.getByRole('button', { name: /^record$/i }).click();
    await expect(dialog).toBeHidden();

    await page.goto('/dashboard');
    const breakdown = page.getByTestId('value-breakdown');
    await breakdown.getByRole('tab', { name: /brand/i }).click();

    await expect(breakdown).toContainText('Milwaukee');
    await expect(breakdown).not.toContainText('Sold Brand');
  });

  test('downloads a CSV report with the identifying columns', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Reportable Drill', { brand: 'Milwaukee', price: '249' });

    await page.goto('/dashboard');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-report').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^brassworth-report-\d{4}-\d{2}-\d{2}\.csv$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const csv = Buffer.concat(chunks).toString('utf-8');

    expect(csv).toContain('Serial number');
    expect(csv).toContain('Reportable Drill');
    expect(csv).toContain('Milwaukee');
    expect(csv).toContain('249.00');
  });
});
