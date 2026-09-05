import { describe, it, expect, beforeEach } from 'vitest';
import { createBackup, parseBackup, restoreBackup, summarise } from '@/lib/backup';
import { storage } from '@/lib/storage';

/**
 * A backup has to contain everything, or it is not a backup.
 *
 * The wishlist, its savings log and its price history were added in Phase 5 and
 * never wired into export or restore. Backing up and restoring silently
 * destroyed all three — including the savings log, which the roadmap makes
 * append-only precisely so that money records cannot be lost or edited away.
 *
 * These tests assert the whole surface, so the next collection cannot be
 * forgotten the same way.
 */

const ORG = 'org-backup-test';

async function seed() {
  await storage.setOrganizations([
    {
      id: ORG,
      name: 'Test property',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ] as never);

  await storage.setGearProfiles([
    {
      id: 'gp-1',
      organizationId: ORG,
      brand: 'DeWalt',
      model: 'DCD791D2',
      specs: [{ label: 'Voltage', value: '20', unit: 'V' }],
      source: 'USER',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ] as never);

  await storage.setItems([
    {
      id: 'item-1',
      organizationId: ORG,
      name: 'Drill',
      gearProfileId: 'gp-1',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ] as never);

  await storage.setWishlistEntries([
    {
      id: 'wish-1',
      organizationId: ORG,
      name: 'Track saw',
      priority: 'HIGH',
      targetPrice: 600,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ] as never);

  await storage.setSavingsContributions([
    {
      id: 'save-1',
      wishlistEntryId: 'wish-1',
      organizationId: ORG,
      amount: 150,
      occurredAt: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ] as never);

  await storage.setPriceObservations([
    {
      id: 'price-1',
      wishlistEntryId: 'wish-1',
      organizationId: ORG,
      amount: 549,
      observedAt: '2026-02-01T00:00:00.000Z',
      source: 'MANUAL',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ] as never);
}

describe('a backup covers every collection', () => {
  beforeEach(async () => {
    await storage.clearAll();
    await seed();
  });

  it('exports the wishlist', async () => {
    const backup = parseBackup(await createBackup());
    expect(backup.data.wishlistEntries).toHaveLength(1);
  });

  it('exports the savings log', async () => {
    const backup = parseBackup(await createBackup());
    expect(backup.data.savingsContributions).toHaveLength(1);
  });

  it('exports the price history', async () => {
    const backup = parseBackup(await createBackup());
    expect(backup.data.priceObservations).toHaveLength(1);
  });

  it('exports the organisation gear profiles', async () => {
    const backup = parseBackup(await createBackup());
    expect(backup.data.gearProfiles).toHaveLength(1);
  });
});

describe('a restore puts every collection back', () => {
  beforeEach(async () => {
    await storage.clearAll();
    await seed();
  });

  it('restores the wishlist and its savings, not just the items', async () => {
    const json = await createBackup();
    await storage.clearAll();
    await restoreBackup(json);

    expect(await storage.getWishlistEntries()).toHaveLength(1);
    expect(await storage.getSavingsContributions()).toHaveLength(1);
    expect(await storage.getPriceObservations()).toHaveLength(1);
  });

  it('restores gear profiles, so a linked item still resolves its model', async () => {
    const json = await createBackup();
    await storage.clearAll();
    await restoreBackup(json);

    const profiles = await storage.getGearProfiles();
    const items = await storage.getItems();
    expect(profiles[0]?.id).toBe('gp-1');
    expect(items[0]?.gearProfileId).toBe('gp-1');
  });

  it('preserves the exact saved amount, because it is a money record', async () => {
    const json = await createBackup();
    await storage.clearAll();
    await restoreBackup(json);

    expect((await storage.getSavingsContributions())[0]?.amount).toBe(150);
  });
});

describe('the restore prompt describes what it is about to replace', () => {
  beforeEach(async () => {
    await storage.clearAll();
    await seed();
  });

  it('counts the wishlist and gear profiles, not only items', async () => {
    const counts = summarise(parseBackup(await createBackup()));
    expect(counts).toMatchObject({ items: 1, wishlistEntries: 1, gearProfiles: 1 });
  });
});

describe('older backups still restore', () => {
  it('accepts a file written before these collections existed', async () => {
    const old = JSON.stringify({
      format: 'brassworth.backup',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: { organizations: [], items: [] },
    });

    await storage.clearAll();
    const counts = await restoreBackup(old);
    expect(counts.wishlistEntries).toBe(0);
    expect(counts.gearProfiles).toBe(0);
  });
});
