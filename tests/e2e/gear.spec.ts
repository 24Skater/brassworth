import { test, expect, type Page } from '@playwright/test';
import { signUpWithProperty } from './helpers';

/**
 * Gear profiles, driven through the real form.
 *
 * The bundled catalogue ships in the app bundle, so these run without a server
 * and without a network — which is also how a self-hoster in local-only mode
 * uses the feature.
 */

async function openNewItemForm(page: Page): Promise<void> {
  await page.goto('/items/new');
  await expect(page.locator('#gear-profile-search')).toBeVisible();
}

async function linkProfile(page: Page, query: string, label: string): Promise<void> {
  await page.locator('#gear-profile-search').fill(query);
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
}

test.describe('Gear profiles', () => {
  test('searches the bundled catalogue and links a make and model', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await linkProfile(page, 'DCD791', 'DeWalt DCD791D2');

    // The link replaces the search box with the chosen profile.
    const selected = page.getByTestId('gear-profile-selected');
    await expect(selected).toContainText('DeWalt DCD791D2');
    await expect(selected).toContainText('Catalogue');
  });

  test('fills blank brand and model from the profile', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await linkProfile(page, 'DCD791', 'DeWalt DCD791D2');

    await expect(page.locator('#brand')).toHaveValue('DeWalt');
    await expect(page.locator('#model')).toHaveValue('DCD791D2');
  });

  test('never overwrites a brand the user typed', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await page.locator('#brand').fill('DEWALT (used)');
    await linkProfile(page, 'DCD791', 'DeWalt DCD791D2');

    await expect(page.locator('#brand')).toHaveValue('DEWALT (used)');
  });

  test('says so when the catalogue has nothing, and the item still saves', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await page.locator('#gear-profile-search').fill('Nonexistent Brand ZZ9');
    await expect(page.getByText(/Nothing in the catalogue matches/i)).toBeVisible();

    await page.locator('#name').fill('Unlisted tool');
    await page.getByRole('button', { name: /create item/i }).click();
    await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });
    await expect(page.getByText('Unlisted tool').first()).toBeVisible();
  });

  test('shows the model specifications once an item is linked and saved', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await linkProfile(page, 'DCD791', 'DeWalt DCD791D2');
    await page.locator('#name').fill('Site drill');
    await page.getByRole('button', { name: /create item/i }).click();
    await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });

    await page.getByText('Site drill').first().click();
    // The gear profile panel lives on the edit form, not the view page.
    await page.getByRole('link', { name: /edit/i }).click();
    await expect(page.getByRole('heading', { name: /edit item/i })).toBeVisible();

    // Specs come from the profile, not from fields copied onto the item.
    const panel = page.getByTestId('gear-profile-panel');
    await expect(panel).toContainText('Battery platform');
    await expect(panel).toContainText('20V MAX XR');
  });

  test('attributes the catalogue and its licence on the item page', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await linkProfile(page, 'XPH12Z', 'Makita XPH12Z');
    await expect(page.getByTestId('gear-profile-panel')).toContainText('ODbL-1.0');
  });

  test('unlinks a profile without clearing what it filled in', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await linkProfile(page, 'DCD791', 'DeWalt DCD791D2');
    await page.getByLabel('Unlink gear profile').click();

    await expect(page.locator('#gear-profile-search')).toBeVisible();
    // Unlinking is not an undo: what was filled in is now the user's own value.
    await expect(page.locator('#brand')).toHaveValue('DeWalt');
  });

  test('keeps the link across a save and reload', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await linkProfile(page, 'SG350', 'Cisco SG350-28');
    await page.locator('#name').fill('Rack switch');
    await page.getByRole('button', { name: /create item/i }).click();
    await expect(page).toHaveURL(/\/items$/, { timeout: 15000 });

    await page.getByText('Rack switch').first().click();
    // The gear profile panel lives on the edit form, not the view page.
    await page.getByRole('link', { name: /edit/i }).click();
    await page.reload();

    await expect(page.getByTestId('gear-profile-panel')).toContainText('Cisco SG350-28');
  });

  test('offers the data plate scanner on the form', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    await expect(page.getByRole('button', { name: /scan data plate/i })).toBeVisible();
  });

  test('spans domains, because brand is data rather than a module', async ({ page }) => {
    await signUpWithProperty(page);
    await openNewItemForm(page);

    // A tool, a network switch and a microphone from one catalogue and one code path.
    const results = page.getByRole('list', { name: /matching gear profiles/i });

    for (const [query, label] of [
      ['DCD791', 'DeWalt DCD791D2'],
      ['SG350', 'Cisco SG350-28'],
      ['SM58', 'Shure SM58'],
    ] as const) {
      await page.locator('#gear-profile-search').fill(query);
      await expect(results).toContainText(label);
      await page.locator('#gear-profile-search').fill('');
    }
  });
});
