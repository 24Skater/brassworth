import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import { IndexedDBProvider } from '@/lib/storage/providers/indexedDBProvider';
import { storage, setStorageProvider } from '@/lib/storage/index';
import type { StorageProvider } from '@/lib/storage/types';

/**
 * Regression cover for a data-integrity bug in the bulk save path.
 *
 * The facade's setX() helpers used to delete every existing record and then
 * re-create them via createX(). Every createX() mints a fresh
 * crypto.randomUUID(), so saving a collection silently reassigned the id of
 * every record it already contained — orphaning memberships, roles, photos and
 * documents that referenced the old ids, and resetting createdAt.
 */

const providers: Array<[string, () => StorageProvider]> = [
  ['LocalStorageProvider', () => new LocalStorageProvider()],
  ['IndexedDBProvider', () => new IndexedDBProvider()],
];

describe.each(providers)('replaceCollection — %s', (_name, makeProvider) => {
  let provider: StorageProvider;

  beforeEach(() => {
    provider = makeProvider();
  });

  it('preserves ids and timestamps of existing records', async () => {
    const first = await provider.createOrganization({ name: 'First', type: 'home' });
    const second = await provider.createOrganization({ name: 'Second', type: 'church' });

    await provider.replaceCollection('organizations', [first, second]);

    const stored = await provider.getOrganizations();
    expect(stored).toHaveLength(2);

    const storedFirst = stored.find((o) => o.name === 'First');
    expect(storedFirst?.id).toBe(first.id);
    expect(storedFirst?.createdAt).toBe(first.createdAt);
  });

  it('does not duplicate records across repeated saves', async () => {
    const org = await provider.createOrganization({ name: 'Only', type: 'home' });

    await provider.replaceCollection('organizations', [org]);
    await provider.replaceCollection('organizations', [org]);
    await provider.replaceCollection('organizations', [org]);

    const stored = await provider.getOrganizations();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(org.id);
  });

  it('removes records absent from the replacement set', async () => {
    const keep = await provider.createOrganization({ name: 'Keep', type: 'home' });
    await provider.createOrganization({ name: 'Drop', type: 'home' });

    await provider.replaceCollection('organizations', [keep]);

    const stored = await provider.getOrganizations();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe('Keep');
  });

  it('writes an empty collection', async () => {
    await provider.createOrganization({ name: 'Temporary', type: 'home' });

    await provider.replaceCollection('organizations', []);

    expect(await provider.getOrganizations()).toHaveLength(0);
  });

  it('preserves item ids, which photos and documents reference', async () => {
    const item = await provider.createItem({
      organizationId: 'org-1',
      name: 'Cordless Drill',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    await provider.replaceCollection('items', [{ ...item, name: 'Cordless Drill (updated)' }]);

    const stored = await provider.getItems();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(item.id);
    expect(stored[0]?.name).toBe('Cordless Drill (updated)');
  });
});

describe('storage facade bulk setters', () => {
  beforeEach(() => {
    setStorageProvider(new LocalStorageProvider());
  });

  it('keeps organization ids stable when a second organization is added', async () => {
    const provider = new LocalStorageProvider();
    setStorageProvider(provider);

    const first = await provider.createOrganization({ name: 'First Property', type: 'home' });

    // Mirrors OrganizationContext.createOrganization: read all, append, save.
    const existing = await storage.getOrganizations();
    const second = {
      id: 'fixed-second-id',
      name: 'Second Property',
      type: 'home' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.setOrganizations([...existing, second]);

    const stored = await storage.getOrganizations();
    expect(stored).toHaveLength(2);

    // The original organization must keep the id its memberships point at.
    expect(stored.find((o) => o.name === 'First Property')?.id).toBe(first.id);
    expect(stored.find((o) => o.name === 'Second Property')?.id).toBe('fixed-second-id');
  });
});
