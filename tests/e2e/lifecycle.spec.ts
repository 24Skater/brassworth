import { test, expect, type Page } from '@playwright/test';
import { signUpWithProperty } from './helpers';

/** Create an item and land on its view page, where the history lives. */
async function createItem(page: Page, name: string): Promise<void> {
  await page.goto('/items/new');
  await page.locator('#name').fill(name);
  await page.getByRole('button', { name: /create item/i }).click();
  await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });

  await page.getByText(name).first().click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

async function recordEvent(
  page: Page,
  action: RegExp,
  fields: { counterparty?: string; due?: string; amount?: string } = {}
): Promise<void> {
  await page.getByTestId('record-event').click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What happened').click();
  await page.getByRole('option', { name: action }).click();

  if (fields.counterparty) {
    await dialog.locator('#event-counterparty').fill(fields.counterparty);
  }
  if (fields.due) {
    await dialog.locator('#event-due').fill(fields.due);
  }
  if (fields.amount) {
    await dialog.locator('#event-amount').fill(fields.amount);
  }

  await dialog.getByRole('button', { name: /^record$/i }).click();
  await expect(dialog).toBeHidden();
}

test.describe('Item lifecycle', () => {
  test('a new item starts in possession with no history', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Cordless Drill');

    await expect(page.getByText('In possession').first()).toBeVisible();
    await expect(page.getByTestId('no-history')).toBeVisible();
  });

  test('checks an item out and back in', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Impact Driver');

    await recordEvent(page, /^loaned out$/i, { counterparty: 'Dave' });

    await expect(page.getByText('Loaned out').first()).toBeVisible();
    await expect(page.getByTestId('custody-line')).toContainText('Dave');
    await expect(page.getByTestId('timeline')).toContainText('Loaned to Dave');

    await recordEvent(page, /^returned$/i);

    await expect(page.getByText('In possession').first()).toBeVisible();
    await expect(page.getByTestId('custody-line')).toBeHidden();
  });

  test('only offers actions that make sense for the current state', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Circular Saw');

    // Nothing has happened yet, so a return is not on offer.
    await page.getByTestId('record-event').click();
    await page.getByRole('dialog').getByLabel('What happened').click();
    await expect(page.getByRole('option', { name: /^returned$/i })).toBeHidden();
    await expect(page.getByRole('option', { name: /^loaned out$/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^cancel$/i }).click();

    await recordEvent(page, /^loaned out$/i, { counterparty: 'Sam' });

    // Now it is out, a second loan is not on offer but a return is.
    await page.getByTestId('record-event').click();
    await page.getByRole('dialog').getByLabel('What happened').click();
    await expect(page.getByRole('option', { name: /^returned$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^loaned out$/i })).toBeHidden();
  });

  test('records a repair with its cost', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Angle Grinder');

    await recordEvent(page, /^sent for repair$/i, { counterparty: 'Service Centre' });
    await expect(page.getByText('In repair').first()).toBeVisible();

    await recordEvent(page, /^repair completed$/i, { amount: '40' });

    await expect(page.getByText('In possession').first()).toBeVisible();
    await expect(page.getByTestId('timeline')).toContainText('Repair completed');
    await expect(page.getByText(/repairs: 40\.00/i)).toBeVisible();
  });

  test('marks an overdue loan', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Nail Gun');

    await recordEvent(page, /^loaned out$/i, { counterparty: 'Chris', due: '2020-01-01' });

    await expect(page.getByText('Overdue').first()).toBeVisible();
    await expect(page.getByTestId('custody-line')).toContainText('overdue');
  });

  test('history survives a reload', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Reciprocating Saw');

    await recordEvent(page, /^loaned out$/i, { counterparty: 'Alex' });

    await page.reload();

    await expect(page.getByTestId('timeline')).toContainText('Loaned to Alex');
    await expect(page.getByText('Loaned out').first()).toBeVisible();
  });
});

test.describe('Lifecycle visibility', () => {
  test('shows an overdue loan on the dashboard', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Table Saw');
    await recordEvent(page, /^loaned out$/i, { counterparty: 'Jordan', due: '2020-01-01' });

    await page.goto('/dashboard');

    const card = page.getByTestId('overdue-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Table Saw');
    await expect(card).toContainText('Jordan');
  });

  test('hides the overdue card when nothing is late', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Torque Wrench');

    await page.goto('/dashboard');

    await expect(page.getByTestId('overdue-card')).toBeHidden();
  });

  test('drops the overdue card once the item is returned', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Heat Gun');
    await recordEvent(page, /^loaned out$/i, { counterparty: 'Pat', due: '2020-01-01' });

    await page.goto('/dashboard');
    await expect(page.getByTestId('overdue-card')).toBeVisible();

    await page.getByTestId('overdue-card').getByRole('button', { name: 'Heat Gun' }).click();
    await recordEvent(page, /^returned$/i);

    await page.goto('/dashboard');
    await expect(page.getByTestId('overdue-card')).toBeHidden();
  });

  test('shows status on the item card and filters by it', async ({ page }) => {
    await signUpWithProperty(page);
    await createItem(page, 'Loaned Item');
    await recordEvent(page, /^loaned out$/i, { counterparty: 'Kim' });
    await createItem(page, 'Kept Item');

    await page.goto('/items');
    await expect(page.getByText('Loaned Item')).toBeVisible();
    await expect(page.getByText('Kept Item')).toBeVisible();

    await page.getByTestId('filter-status').click();
    await page.getByRole('option', { name: /^loaned out$/i }).click();

    await expect(page.getByText('Loaned Item')).toBeVisible();
    await expect(page.getByText('Kept Item')).toBeHidden();
  });
});
