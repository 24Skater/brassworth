import { test, expect, type Page } from '@playwright/test';
import { signUpWithProperty } from './helpers';

async function createItemWithPurchase(
  page: Page,
  name: string,
  price: string,
  purchaseDate: string
): Promise<void> {
  await page.goto('/items/new');
  await page.locator('#name').fill(name);
  await page.locator('#purchaseDate').fill(purchaseDate);
  await page.locator('#purchasePrice').fill(price);
  await page.getByRole('button', { name: /create item/i }).click();
  await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });

  await page.getByText(name).first().click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

test.describe('Valuation', () => {
  test('prompts for purchase details when nothing is known', async ({ page }) => {
    await signUpWithProperty(page);

    await page.goto('/items/new');
    await page.locator('#name').fill('Mystery Tool');
    await page.getByRole('button', { name: /create item/i }).click();
    await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });
    await page.getByText('Mystery Tool').first().click();

    await expect(page.getByText(/add a purchase date and price/i)).toBeVisible();
  });

  test('shows age paid and worth for a purchased item', async ({ page }) => {
    await signUpWithProperty(page);
    await createItemWithPurchase(page, 'Cordless Drill', '249', '2022-01-01');

    const summary = page.getByTestId('value-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Owned for');
    await expect(summary).toContainText('249.00');
  });

  test('depreciates straight line once a useful life is set', async ({ page }) => {
    await signUpWithProperty(page);
    await createItemWithPurchase(page, 'Site Laptop', '1200', '2022-01-01');

    // The depreciation method lives on the edit form, not the view page.
    await page.getByRole('link', { name: /edit/i }).click();
    await page.locator('#depreciationMethod').click();
    await page.getByRole('option', { name: /straight line/i }).click();
    await page.locator('#usefulLifeMonths').fill('48');
    await page.getByRole('button', { name: /save changes/i }).click();

    // Saving an edit returns to the item's own view page, where the value
    // summary lives.
    await expect(page.getByRole('heading', { name: 'Site Laptop' })).toBeVisible();

    const summary = page.getByTestId('value-summary');
    await expect(summary).toContainText('Straight line');
    // Worth less than it cost, and not zero.
    await expect(summary).not.toContainText('1200.00');
    await expect(summary).toContainText('Worth now');
  });

  test('includes repair spend in cost of ownership', async ({ page }) => {
    await signUpWithProperty(page);
    await createItemWithPurchase(page, 'Angle Grinder', '100', '2022-01-01');

    await page.getByTestId('record-event').click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('What happened').click();
    await page.getByRole('option', { name: /^sent for repair$/i }).click();
    await dialog.getByRole('button', { name: /^record$/i }).click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('record-event').click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('What happened').click();
    await page.getByRole('option', { name: /^repair completed$/i }).click();
    await dialog.locator('#event-amount').fill('35');
    await dialog.getByRole('button', { name: /^record$/i }).click();
    await expect(dialog).toBeHidden();

    await page.reload();

    const summary = page.getByTestId('value-summary');
    await expect(summary).toContainText('Repairs');
    await expect(summary).toContainText('35.00');
    // Purchase 100 plus repairs 35.
    await expect(summary).toContainText('135.00');
  });
});
