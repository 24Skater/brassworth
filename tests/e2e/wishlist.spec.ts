import { test, expect, type Page } from '@playwright/test';
import { signUpWithProperty } from './helpers';

async function addWish(
  page: Page,
  name: string,
  fields: { target?: string; priority?: RegExp; brand?: string } = {}
): Promise<void> {
  await page.getByTestId('add-wish').click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('#wish-name').fill(name);
  if (fields.brand) await dialog.locator('#wish-brand').fill(fields.brand);
  if (fields.target) await dialog.locator('#wish-target').fill(fields.target);

  if (fields.priority) {
    await dialog.locator('#wish-priority').click();
    await page.getByRole('option', { name: fields.priority }).click();
  }

  await dialog.getByRole('button', { name: /^add$/i }).click();
  await expect(dialog).toBeHidden();
}

async function putAside(page: Page, name: string, amount: string): Promise<void> {
  await page.getByTestId(`save-${name}`).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('#save-amount').fill(amount);
  await dialog.getByRole('button', { name: /add to savings/i }).click();
  await expect(dialog).toBeHidden();
}

test.describe('Wishlist', () => {
  test.beforeEach(async ({ page }) => {
    await signUpWithProperty(page);
    await page.goto('/wishlist');
  });

  test('starts empty with an invitation to add something', async ({ page }) => {
    await expect(page.getByText(/nothing on the list yet/i)).toBeVisible();
  });

  test('adds something to want', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '900', brand: 'Milwaukee' });

    const list = page.getByTestId('wishlist');
    await expect(list).toContainText('Table Saw');
    await expect(list).toContainText('Milwaukee');
    await expect(list).toContainText('900.00');
  });

  test('tracks savings towards a target', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '1000' });

    await putAside(page, 'Table Saw', '250');
    await expect(page.getByTestId('wishlist')).toContainText('250.00 saved');
    await expect(page.getByTestId('wishlist')).toContainText('750.00 to go');

    // The log accumulates rather than replacing.
    await putAside(page, 'Table Saw', '150');
    await expect(page.getByTestId('wishlist')).toContainText('400.00 saved');
    await expect(page.getByTestId('wishlist')).toContainText('600.00 to go');
  });

  test('takes money back out with a negative amount', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '1000' });

    await putAside(page, 'Table Saw', '300');
    await putAside(page, 'Table Saw', '-100');

    await expect(page.getByTestId('wishlist')).toContainText('200.00 saved');
  });

  test('announces when something is fully saved for', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '100' });
    await putAside(page, 'Table Saw', '100');

    const ready = page.getByTestId('ready-card');
    await expect(ready).toBeVisible();
    await expect(ready).toContainText('Table Saw');
  });

  test('totals what is set aside across the list', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '1000' });
    await addWish(page, 'Router', { target: '400' });

    await putAside(page, 'Table Saw', '250');
    await putAside(page, 'Router', '100');

    const totals = page.getByTestId('wishlist-totals');
    await expect(totals).toContainText('350.00');
    await expect(totals).toContainText('1,050.00');
  });

  test('converts a purchase into an owned item with its history', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '900', brand: 'Milwaukee' });

    await page.getByTestId('buy-Table Saw').click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#paid-amount').fill('850');
    await dialog.getByRole('button', { name: /add to my items/i }).click();
    await expect(dialog).toBeHidden();

    // The entry stays, marked bought, so the record of saving survives.
    await expect(page.getByTestId('wishlist')).toContainText('Bought');

    await page.goto('/items');
    await expect(page.getByText('Table Saw').first()).toBeVisible();

    await page.getByText('Table Saw').first().click();
    await expect(page.getByRole('heading', { name: /edit item/i })).toBeVisible();

    // It starts life with an acquisition, not just a purchase date.
    await expect(page.getByTestId('timeline')).toContainText('Acquired');
    await expect(page.getByTestId('value-summary')).toContainText('850.00');
  });

  test('removes an entry and its savings', async ({ page }) => {
    await addWish(page, 'Mistake', { target: '100' });
    await putAside(page, 'Mistake', '50');

    await page.getByRole('button', { name: /remove Mistake/i }).click();

    await expect(page.getByText(/nothing on the list yet/i)).toBeVisible();
  });

  test('keeps the list across a reload', async ({ page }) => {
    await addWish(page, 'Table Saw', { target: '900' });
    await putAside(page, 'Table Saw', '200');

    await page.reload();

    await expect(page.getByTestId('wishlist')).toContainText('Table Saw');
    await expect(page.getByTestId('wishlist')).toContainText('200.00 saved');
  });
});
