import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import { IndexedDBProvider } from '@/lib/storage/providers/indexedDBProvider';
import type { StorageProvider } from '@/lib/storage/types';
import { deriveStatus } from '@/lib/lifecycle';

const providers: Array<[string, () => StorageProvider]> = [
  ['LocalStorageProvider', () => new LocalStorageProvider()],
  ['IndexedDBProvider', () => new IndexedDBProvider()],
];

describe.each(providers)('item events — %s', (_name, makeProvider) => {
  let provider: StorageProvider;

  beforeEach(async () => {
    provider = makeProvider();
    // Reset explicitly rather than relying on the harness: the IndexedDB
    // provider holds a Dexie connection that outlives a swapped-in factory.
    await provider.clearAll();
  });

  it('starts empty', async () => {
    expect(await provider.getItemEvents()).toEqual([]);
  });

  it('assigns an id and a recorded-at timestamp', async () => {
    const created = await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'LOANED_OUT',
      occurredAt: '2024-01-01T00:00:00.000Z',
      counterparty: 'Dave',
    });

    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();
    expect(created.counterparty).toBe('Dave');
  });

  it('appends rather than replacing', async () => {
    await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'LOANED_OUT',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'RETURNED',
      occurredAt: '2024-02-01T00:00:00.000Z',
    });

    expect(await provider.getItemEvents()).toHaveLength(2);
  });

  it('filters to a single item', async () => {
    await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'NOTE',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await provider.createItemEvent({
      itemId: 'item-2',
      organizationId: 'org-1',
      type: 'NOTE',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    const forItem1 = await provider.getItemEventsByItem('item-1');
    expect(forItem1).toHaveLength(1);
    expect(forItem1[0]?.itemId).toBe('item-1');
  });

  it('feeds a status derivation end to end', async () => {
    await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'LOANED_OUT',
      occurredAt: '2024-01-01T00:00:00.000Z',
      counterparty: 'Dave',
    });

    expect(deriveStatus(await provider.getItemEventsByItem('item-1'))).toBe('LOANED');

    await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'RETURNED',
      occurredAt: '2024-02-01T00:00:00.000Z',
    });

    expect(deriveStatus(await provider.getItemEventsByItem('item-1'))).toBe('IN_POSSESSION');
  });

  it("removes an item's events when the item is deleted", async () => {
    const item = await provider.createItem({
      organizationId: 'org-1',
      name: 'Cordless Drill',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    await provider.createItemEvent({
      itemId: item.id,
      organizationId: 'org-1',
      type: 'LOANED_OUT',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });
    await provider.createItemEvent({
      itemId: 'other-item',
      organizationId: 'org-1',
      type: 'NOTE',
      occurredAt: '2024-01-01T00:00:00.000Z',
    });

    await provider.deleteItem(item.id);

    expect(await provider.getItemEventsByItem(item.id)).toHaveLength(0);
    // Another item's history must survive.
    expect(await provider.getItemEventsByItem('other-item')).toHaveLength(1);
  });

  it('survives a bulk replace with ids intact', async () => {
    const created = await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'ACQUIRED',
      occurredAt: '2024-01-01T00:00:00.000Z',
      amount: 249,
    });

    await provider.replaceCollection('itemEvents', [created]);

    const stored = await provider.getItemEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(created.id);
    expect(stored[0]?.amount).toBe(249);
  });

  it('is included in an export', async () => {
    await provider.createItemEvent({
      itemId: 'item-1',
      organizationId: 'org-1',
      type: 'SOLD',
      occurredAt: '2024-01-01T00:00:00.000Z',
      amount: 180,
    });

    const exported = JSON.parse(await provider.exportData());
    expect(exported.itemEvents).toHaveLength(1);
    expect(exported.itemEvents[0].amount).toBe(180);
  });
});
