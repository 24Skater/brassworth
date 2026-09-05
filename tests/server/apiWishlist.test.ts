import { describe, it, expect, beforeEach } from 'vitest';
import { createHarness, signUpAndSelectOrg, type Harness } from './harness';
import { progressFor, savedTotal } from '@/lib/wishlist';

/** The wishlist half of the API provider, against the real server. */

let h: Harness;

beforeEach(async () => {
  h = createHarness();
  await h.ready;
});

const newEntry = (name = 'Table Saw', targetPrice?: number) => ({
  organizationId: 'set-by-the-server',
  name,
  priority: 'MEDIUM' as const,
  targetPrice,
});

describe('wishlist over the API', () => {
  it('refuses before a property is selected', async () => {
    await h.auth.signup('user@example.com', 'correct horse battery staple', 'User');
    await expect(h.storage.getWishlistEntries()).rejects.toThrow();
  });

  it('round-trips an entry', async () => {
    await signUpAndSelectOrg(h);

    const created = await h.storage.createWishlistEntry(newEntry('Table Saw', 900));
    expect(created.name).toBe('Table Saw');
    expect(created.targetPrice).toBe(900);

    const entries = await h.storage.getWishlistEntries();
    expect(entries).toHaveLength(1);
    expect((await h.storage.getWishlistEntry(created.id))?.name).toBe('Table Saw');
    expect(await h.storage.getWishlistEntry('missing')).toBeNull();
  });

  it('updates and deletes an entry', async () => {
    await signUpAndSelectOrg(h);
    const created = await h.storage.createWishlistEntry(newEntry('Before', 100));

    const updated = await h.storage.updateWishlistEntry(created.id, {
      name: 'After',
      priority: 'HIGH',
    });
    expect(updated.name).toBe('After');
    expect(updated.priority).toBe('HIGH');

    await h.storage.deleteWishlistEntry(created.id);
    expect(await h.storage.getWishlistEntries()).toHaveLength(0);
  });

  it('accumulates savings and derives progress', async () => {
    await signUpAndSelectOrg(h);
    const entry = await h.storage.createWishlistEntry(newEntry('Table Saw', 1000));

    await h.storage.createSavingsContribution({
      wishlistEntryId: entry.id,
      organizationId: 'set-by-the-server',
      amount: 250,
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await h.storage.createSavingsContribution({
      wishlistEntryId: entry.id,
      organizationId: 'set-by-the-server',
      amount: 150,
      occurredAt: '2024-02-01T00:00:00.000Z',
    });

    const rows = await h.storage.getSavingsContributionsByEntry(entry.id);
    expect(rows).toHaveLength(2);
    expect(savedTotal(rows)).toBe(400);
    expect(progressFor(entry, rows).remaining).toBe(600);
  });

  it('accepts a negative contribution as a withdrawal', async () => {
    await signUpAndSelectOrg(h);
    const entry = await h.storage.createWishlistEntry(newEntry('Table Saw', 1000));

    for (const amount of [300, -100]) {
      await h.storage.createSavingsContribution({
        wishlistEntryId: entry.id,
        organizationId: 'set-by-the-server',
        amount,
        occurredAt: '2024-01-01T00:00:00.000Z',
      });
    }

    expect(savedTotal(await h.storage.getSavingsContributionsByEntry(entry.id))).toBe(200);
  });

  it('removes the savings log with its entry', async () => {
    await signUpAndSelectOrg(h);
    const kept = await h.storage.createWishlistEntry(newEntry('Kept', 100));
    const removed = await h.storage.createWishlistEntry(newEntry('Removed', 100));

    for (const entry of [kept, removed]) {
      await h.storage.createSavingsContribution({
        wishlistEntryId: entry.id,
        organizationId: 'set-by-the-server',
        amount: 25,
        occurredAt: '2024-01-01T00:00:00.000Z',
      });
    }

    await h.storage.deleteWishlistEntry(removed.id);

    expect(await h.storage.getSavingsContributionsByEntry(removed.id)).toHaveLength(0);
    // The other entry's savings must survive.
    expect(await h.storage.getSavingsContributionsByEntry(kept.id)).toHaveLength(1);
  });

  it('replaces the whole collection with ids intact', async () => {
    const orgId = await signUpAndSelectOrg(h);
    const created = await h.storage.createWishlistEntry(newEntry('Original', 100));

    await h.storage.replaceCollection('wishlistEntries', [
      { ...created, organizationId: orgId, name: 'Replacement' },
    ]);

    const entries = await h.storage.getWishlistEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe(created.id);
    expect(entries[0]?.name).toBe('Replacement');
  });

  it('hides another account wishlist behind a 404', async () => {
    const aliceOrg = await signUpAndSelectOrg(h, 'alice@example.com');
    await h.storage.createWishlistEntry(newEntry('Alice Saw', 900));

    await h.auth.logout();
    await h.auth.signup('bob@example.com', 'correct horse battery staple', 'Bob');
    h.storage.setOrganization(aliceOrg);

    await expect(h.storage.getWishlistEntries()).rejects.toMatchObject({ status: 404 });
  });

  it('includes the wishlist in an export', async () => {
    await signUpAndSelectOrg(h);
    const entry = await h.storage.createWishlistEntry(newEntry('Table Saw', 900));
    await h.storage.createSavingsContribution({
      wishlistEntryId: entry.id,
      organizationId: 'set-by-the-server',
      amount: 75,
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    const exported = JSON.parse(await h.storage.exportData());
    expect(exported.wishlistEntries).toHaveLength(1);
    expect(exported.savingsContributions).toHaveLength(1);
  });
});
