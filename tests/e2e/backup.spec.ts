import { test, expect } from '@playwright/test';
import { signUpWithProperty } from './helpers';

test.describe('Backup and restore', () => {
  test('downloads a backup file containing the stored data', async ({ page }) => {
    const { property } = await signUpWithProperty(page, 'Backup Property');

    await page.goto('/settings');
    await page.getByRole('tab', { name: /data/i }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download backup/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^brassworth-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const backup = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

    expect(backup.format).toBe('brassworth.backup');
    expect(backup.version).toBe(1);
    expect(backup.data.organizations.some((o: { name: string }) => o.name === property)).toBe(true);
  });

  test('rejects a file that is not a backup', async ({ page }) => {
    await signUpWithProperty(page);

    await page.goto('/settings');
    await page.getByRole('tab', { name: /data/i }).click();

    await page.setInputFiles('input[type="file"][accept*="json"]', {
      name: 'not-a-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ hello: 'world' })),
    });

    await expect(page.getByText(/not a Brassworth backup/i)).toBeVisible();
  });

  test('rejects a damaged backup without destroying existing data', async ({ page }) => {
    await signUpWithProperty(page, 'Keep This Property');

    await page.goto('/settings');
    await page.getByRole('tab', { name: /data/i }).click();

    await page.setInputFiles('input[type="file"][accept*="json"]', {
      name: 'damaged.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ this is not json'),
    });

    await expect(page.getByText(/not valid JSON/i)).toBeVisible();

    // The existing property must survive a failed restore.
    await page.goto('/organizations');
    await expect(page.getByText('Keep This Property').first()).toBeVisible();
  });
});
