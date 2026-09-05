import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import { IndexedDBProvider } from '@/lib/storage/providers/indexedDBProvider';
import type { StorageProvider } from '@/lib/storage/types';
import { progressFor, savedTotal } from '@/lib/wishlist';

const providers: Array<[string, () => StorageProvider]> = [
  ['LocalStorageProvider', () => new LocalStorageProvider()],
  ['IndexedDBProvider', () => new IndexedDBProvider()],
];

describe.each(providers)('wishlist storage — %s', (_name, makeProvider) => {
  let provider: StorageProvider;

  beforeEach(async () => {
    provider = makeProvider();
    await provider.clearAll();
  });

  const newEntry = (name = 'Cordless Drill', targetPrice?: number) => ({
    organizationId: 'org-1',
    name,
    priority: 'MEDIUM' as const,
    targetPrice,
  });

  it('starts empty', async () => {
    expect(await provider.getWishlistEntries()).toEqual([]);
    expect(await provider.getSavingsContributions()).toEqual([]);
  });

  it('creates an entry with timestamps', async () => {
    const created = await provider.createWishlistEntry(newEntry());

    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(created.updatedAt).toBeTruthy();
    expect(created.name).toBe('Cordless Drill');
  });

  it('reads one back, and null for one that is not there', async () => {
    const created = await provider.createWishlistEntry(newEntry());

    expect((await provider.getWishlistEntry(created.id))?.name).toBe('Cordless Drill');
    expect(await provider.getWishlistEntry('missing')).toBeNull();
  });

  it('updates an entry and touches updatedAt', async () => {
    const created = await provider.createWishlistEntry(newEntry());
    const updated = await provider.updateWishlistEntry(created.id, { targetPrice: 249 });

    expect(updated.targetPrice).toBe(249);
    expect(updated.id).toBe(created.id);
  });

  it('appends savings rather than replacing them', async () => {
    const created = await provider.createWishlistEntry(newEntry('Drill', 200));

    await provider.createSavingsContribution({
      wishlistEntryId: created.id,
      organizationId: 'org-1',
      amount: 50,
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await provider.createSavingsContribution({
      wishlistEntryId: created.id,
      organizationId: 'org-1',
      amount: 30,
      occurredAt: '2024-02-01T00:00:00.000Z',
    });

    const rows = await provider.getSavingsContributionsByEntry(created.id);
    expect(rows).toHaveLength(2);
    expect(savedTotal(rows)).toBe(80);
    expect(progressFor(created, rows).remaining).toBe(120);
  });

  it('keeps each entry savings separate', async () => {
    const a = await provider.createWishlistEntry(newEntry('A'));
    const b = await provider.createWishlistEntry(newEntry('B'));

    await provider.createSavingsContribution({
      wishlistEntryId: a.id,
      organizationId: 'org-1',
      amount: 10,
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    expect(await provider.getSavingsContributionsByEntry(a.id)).toHaveLength(1);
    expect(await provider.getSavingsContributionsByEntry(b.id)).toHaveLength(0);
  });

  it('removes the savings log when its entry is deleted', async () => {
    const kept = await provider.createWishlistEntry(newEntry('Kept'));
    const removed = await provider.createWishlistEntry(newEntry('Removed'));

    for (const target of [kept, removed]) {
      await provider.createSavingsContribution({
        wishlistEntryId: target.id,
        organizationId: 'org-1',
        amount: 25,
        occurredAt: '2024-01-01T00:00:00.000Z',
      });
    }

    await provider.deleteWishlistEntry(removed.id);

    expect(await provider.getWishlistEntries()).toHaveLength(1);
    expect(await provider.getSavingsContributionsByEntry(removed.id)).toHaveLength(0);
    // The other entry's savings must survive.
    expect(await provider.getSavingsContributionsByEntry(kept.id)).toHaveLength(1);
  });

  it('survives a bulk replace with ids intact', async () => {
    const created = await provider.createWishlistEntry(newEntry('Drill', 200));

    await provider.replaceCollection('wishlistEntries', [{ ...created, name: 'Renamed' }]);

    const stored = await provider.getWishlistEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(created.id);
    expect(stored[0]?.name).toBe('Renamed');
  });

  it('is included in an export', async () => {
    const created = await provider.createWishlistEntry(newEntry('Drill', 200));
    await provider.createSavingsContribution({
      wishlistEntryId: created.id,
      organizationId: 'org-1',
      amount: 75,
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    const exported = JSON.parse(await provider.exportData());
    expect(exported.wishlistEntries).toHaveLength(1);
    expect(exported.savingsContributions).toHaveLength(1);
    expect(exported.savingsContributions[0].amount).toBe(75);
  });
});
