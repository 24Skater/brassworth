import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import { IndexedDBProvider } from '@/lib/storage/providers/indexedDBProvider';
import type { StorageProvider } from '@/lib/storage/types';

/**
 * One contract, run against every provider.
 *
 * The providers are interchangeable by design — a self-hoster picks one and the
 * app must behave identically either way. Testing them separately would let the
 * two drift apart, so every assertion here runs against both. Anything that
 * cannot hold for both belongs in that provider's own file, not here.
 */

const PROVIDERS: Array<[string, () => StorageProvider]> = [
  ['LocalStorageProvider', () => new LocalStorageProvider()],
  ['IndexedDBProvider', () => new IndexedDBProvider()],
];

const ORG = 'org-1';
const OTHER_ORG = 'org-2';

describe.each(PROVIDERS)('%s', (_name, makeProvider) => {
  let storage: StorageProvider;

  beforeEach(async () => {
    storage = makeProvider();
    await storage.clearAll();
  });

  describe('the signed-in user', () => {
    it('has nobody signed in to begin with', async () => {
      expect(await storage.getUser()).toBeNull();
    });

    it('remembers who was signed in', async () => {
      await storage.setUser({
        id: 'u1',
        email: 'a@example.com',
        name: 'A',
        createdAt: '2024-01-01T00:00:00.000Z',
      });

      expect((await storage.getUser())?.email).toBe('a@example.com');
    });

    it('forgets them again on sign out', async () => {
      await storage.setUser({
        id: 'u1',
        email: 'a@example.com',
        name: 'A',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      await storage.setUser(null);

      expect(await storage.getUser()).toBeNull();
    });
  });

  describe('organizations', () => {
    it('creates one and gives it an id', async () => {
      const org = await storage.createOrganization({ name: 'Workshop', type: 'home' });

      expect(org.id).toBeTruthy();
      expect(org.name).toBe('Workshop');
    });

    it('reads one back by id', async () => {
      const org = await storage.createOrganization({ name: 'Workshop', type: 'home' });

      expect((await storage.getOrganization(org.id))?.name).toBe('Workshop');
    });

    it('returns null for an id that does not exist', async () => {
      expect(await storage.getOrganization('nope')).toBeNull();
    });

    it('lists them', async () => {
      await storage.createOrganization({ name: 'One', type: 'home' });
      await storage.createOrganization({ name: 'Two', type: 'home' });

      expect(await storage.getOrganizations()).toHaveLength(2);
    });

    it('updates one without touching the others', async () => {
      const first = await storage.createOrganization({ name: 'One', type: 'home' });
      await storage.createOrganization({ name: 'Two', type: 'home' });

      await storage.updateOrganization(first.id, { name: 'Renamed' });

      expect((await storage.getOrganization(first.id))?.name).toBe('Renamed');
      expect((await storage.getOrganizations()).map((o) => o.name).sort()).toEqual([
        'Renamed',
        'Two',
      ]);
    });

    it('deletes one', async () => {
      const org = await storage.createOrganization({ name: 'Workshop', type: 'home' });

      await storage.deleteOrganization(org.id);

      expect(await storage.getOrganization(org.id)).toBeNull();
    });
  });

  describe('memberships', () => {
    it('creates and lists them', async () => {
      await storage.createMembership({ userId: 'u1', organizationId: ORG });

      expect(await storage.getMemberships()).toHaveLength(1);
    });

    it('lists only the ones for one property', async () => {
      await storage.createMembership({ userId: 'u1', organizationId: ORG });
      await storage.createMembership({ userId: 'u2', organizationId: OTHER_ORG });

      const mine = await storage.getMembershipsByOrg(ORG);
      expect(mine).toHaveLength(1);
      expect(mine[0]?.userId).toBe('u1');
    });

    it('deletes one', async () => {
      const membership = await storage.createMembership({ userId: 'u1', organizationId: ORG });

      await storage.deleteMembership(membership.id);

      expect(await storage.getMemberships()).toHaveLength(0);
    });
  });

  describe('locations', () => {
    it('creates, reads, updates and deletes one', async () => {
      const created = await storage.createLocation({ organizationId: ORG, name: 'Garage' });
      expect(created.id).toBeTruthy();

      expect((await storage.getLocation(created.id))?.name).toBe('Garage');

      await storage.updateLocation(created.id, { name: 'Shed' });
      expect((await storage.getLocation(created.id))?.name).toBe('Shed');

      await storage.deleteLocation(created.id);
      expect(await storage.getLocation(created.id)).toBeNull();
    });

    it('keeps one property’s locations out of another’s', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Mine' });
      await storage.createLocation({ organizationId: OTHER_ORG, name: 'Theirs' });

      const mine = await storage.getLocationsByOrg(ORG);
      expect(mine).toHaveLength(1);
      expect(mine[0]?.name).toBe('Mine');
    });

    it('lists them all when not scoped', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Mine' });
      await storage.createLocation({ organizationId: OTHER_ORG, name: 'Theirs' });

      expect(await storage.getLocations()).toHaveLength(2);
    });
  });

  describe('categories', () => {
    it('creates, reads, updates and deletes one', async () => {
      const created = await storage.createCategory({ organizationId: ORG, name: 'Power Tools' });

      expect((await storage.getCategory(created.id))?.name).toBe('Power Tools');

      await storage.updateCategory(created.id, { name: 'Bench Tools' });
      expect((await storage.getCategory(created.id))?.name).toBe('Bench Tools');

      await storage.deleteCategory(created.id);
      expect(await storage.getCategory(created.id)).toBeNull();
    });

    it('scopes them to one property', async () => {
      await storage.createCategory({ organizationId: ORG, name: 'Mine' });
      await storage.createCategory({ organizationId: OTHER_ORG, name: 'Theirs' });

      expect(await storage.getCategoriesByOrg(ORG)).toHaveLength(1);
      expect(await storage.getCategories()).toHaveLength(2);
    });
  });

  describe('tags', () => {
    it('creates, reads, updates and deletes one', async () => {
      const created = await storage.createTag({ organizationId: ORG, name: 'cordless' });

      expect((await storage.getTag(created.id))?.name).toBe('cordless');

      await storage.updateTag(created.id, { name: 'corded' });
      expect((await storage.getTag(created.id))?.name).toBe('corded');

      await storage.deleteTag(created.id);
      expect(await storage.getTag(created.id)).toBeNull();
    });

    it('scopes them to one property', async () => {
      await storage.createTag({ organizationId: ORG, name: 'mine' });
      await storage.createTag({ organizationId: OTHER_ORG, name: 'theirs' });

      expect(await storage.getTagsByOrg(ORG)).toHaveLength(1);
      expect(await storage.getTags()).toHaveLength(2);
    });
  });

  describe('items', () => {
    const draft = {
      organizationId: ORG,
      name: 'Cordless Drill',
      condition: 'GOOD' as const,
      quantity: 1,
      isArchived: false,
      tags: [],
    };

    it('stamps a new item with an id and timestamps', async () => {
      const item = await storage.createItem(draft);

      expect(item.id).toBeTruthy();
      expect(item.createdAt).toBeTruthy();
      expect(item.updatedAt).toBeTruthy();
    });

    it('reads one back by id', async () => {
      const item = await storage.createItem(draft);

      expect((await storage.getItem(item.id))?.name).toBe('Cordless Drill');
    });

    it('returns null for an item that does not exist', async () => {
      expect(await storage.getItem('nope')).toBeNull();
    });

    it('updates one and moves its updatedAt forward', async () => {
      const item = await storage.createItem({ ...draft, updatedAt: undefined } as typeof draft);

      const updated = await storage.updateItem(item.id, { name: 'Impact Driver' });

      expect(updated.name).toBe('Impact Driver');
      expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(item.updatedAt));
    });

    it('keeps the id it was given when updated', async () => {
      const item = await storage.createItem(draft);

      const updated = await storage.updateItem(item.id, { name: 'Impact Driver' });

      expect(updated.id).toBe(item.id);
    });

    it('deletes one', async () => {
      const item = await storage.createItem(draft);

      await storage.deleteItem(item.id);

      expect(await storage.getItem(item.id)).toBeNull();
    });

    it('scopes them to one property', async () => {
      await storage.createItem(draft);
      await storage.createItem({ ...draft, organizationId: OTHER_ORG, name: 'Not Mine' });

      expect(await storage.getItemsByOrg(ORG)).toHaveLength(1);
      expect(await storage.getItems()).toHaveLength(2);
    });
  });

  describe('item events', () => {
    it('records one against an item', async () => {
      const event = await storage.createItemEvent({
        itemId: 'item-1',
        organizationId: ORG,
        type: 'ACQUIRED',
        occurredAt: '2024-01-01T00:00:00.000Z',
      });

      expect(event.id).toBeTruthy();
      expect(event.createdAt).toBeTruthy();
    });

    it('lists the events for one item only', async () => {
      await storage.createItemEvent({
        itemId: 'item-1',
        organizationId: ORG,
        type: 'ACQUIRED',
        occurredAt: '2024-01-01T00:00:00.000Z',
      });
      await storage.createItemEvent({
        itemId: 'item-2',
        organizationId: ORG,
        type: 'ACQUIRED',
        occurredAt: '2024-01-01T00:00:00.000Z',
      });

      expect(await storage.getItemEventsByItem('item-1')).toHaveLength(1);
      expect(await storage.getItemEvents()).toHaveLength(2);
    });

    it('clears an item’s history when the item goes', async () => {
      await storage.createItemEvent({
        itemId: 'item-1',
        organizationId: ORG,
        type: 'ACQUIRED',
        occurredAt: '2024-01-01T00:00:00.000Z',
      });
      await storage.createItemEvent({
        itemId: 'item-2',
        organizationId: ORG,
        type: 'ACQUIRED',
        occurredAt: '2024-01-01T00:00:00.000Z',
      });

      await storage.deleteItemEventsByItem('item-1');

      expect(await storage.getItemEventsByItem('item-1')).toHaveLength(0);
      // The other item's history must survive.
      expect(await storage.getItemEventsByItem('item-2')).toHaveLength(1);
    });
  });

  describe('the wishlist', () => {
    const draft = {
      organizationId: ORG,
      name: 'Track Saw',
      priority: 'MEDIUM' as const,
      targetPrice: 500,
    };

    it('creates, reads, updates and deletes an entry', async () => {
      const entry = await storage.createWishlistEntry(draft);

      expect((await storage.getWishlistEntry(entry.id))?.name).toBe('Track Saw');

      await storage.updateWishlistEntry(entry.id, { targetPrice: 450 });
      expect((await storage.getWishlistEntry(entry.id))?.targetPrice).toBe(450);

      await storage.deleteWishlistEntry(entry.id);
      expect(await storage.getWishlistEntry(entry.id)).toBeNull();
    });

    it('lists the entries', async () => {
      await storage.createWishlistEntry(draft);

      expect(await storage.getWishlistEntries()).toHaveLength(1);
    });

    it('records savings against one entry', async () => {
      await storage.createSavingsContribution({
        wishlistEntryId: 'w1',
        organizationId: ORG,
        amount: 50,
        occurredAt: '2024-01-01T00:00:00.000Z',
      });
      await storage.createSavingsContribution({
        wishlistEntryId: 'w2',
        organizationId: ORG,
        amount: 20,
        occurredAt: '2024-01-01T00:00:00.000Z',
      });

      expect(await storage.getSavingsContributionsByEntry('w1')).toHaveLength(1);
      expect(await storage.getSavingsContributions()).toHaveLength(2);
    });

    it('clears the savings when the entry goes', async () => {
      await storage.createSavingsContribution({
        wishlistEntryId: 'w1',
        organizationId: ORG,
        amount: 50,
        occurredAt: '2024-01-01T00:00:00.000Z',
      });

      await storage.deleteSavingsContributionsByEntry('w1');

      expect(await storage.getSavingsContributionsByEntry('w1')).toHaveLength(0);
    });

    it('records observed prices against one entry', async () => {
      await storage.createPriceObservation({
        wishlistEntryId: 'w1',
        organizationId: ORG,
        amount: 480,
        observedAt: '2024-01-01T00:00:00.000Z',
        source: 'MANUAL',
      });

      expect(await storage.getPriceObservationsByEntry('w1')).toHaveLength(1);
      expect(await storage.getPriceObservations()).toHaveLength(1);
    });

    it('clears the price history when the entry goes', async () => {
      await storage.createPriceObservation({
        wishlistEntryId: 'w1',
        organizationId: ORG,
        amount: 480,
        observedAt: '2024-01-01T00:00:00.000Z',
        source: 'MANUAL',
      });

      await storage.deletePriceObservationsByEntry('w1');

      expect(await storage.getPriceObservationsByEntry('w1')).toHaveLength(0);
    });
  });

  describe('photos', () => {
    const draft = {
      itemId: 'item-1',
      fileUrl: 'blob:photo',
      takenAt: '2024-01-01T00:00:00.000Z',
    };

    it('creates, reads, updates and deletes one', async () => {
      const photo = await storage.createPhoto(draft);

      expect((await storage.getPhoto(photo.id))?.fileUrl).toBe('blob:photo');

      await storage.updatePhoto(photo.id, { caption: 'The drill' });
      expect((await storage.getPhoto(photo.id))?.caption).toBe('The drill');

      await storage.deletePhoto(photo.id);
      expect(await storage.getPhoto(photo.id)).toBeNull();
    });

    it('lists the photos of one item only', async () => {
      await storage.createPhoto(draft);
      await storage.createPhoto({ ...draft, itemId: 'item-2' });

      expect(await storage.getPhotosByItem('item-1')).toHaveLength(1);
      expect(await storage.getPhotos()).toHaveLength(2);
    });
  });

  describe('documents', () => {
    const draft = {
      organizationId: ORG,
      itemId: 'item-1',
      type: 'RECEIPT' as const,
      fileName: 'receipt.pdf',
      fileUrl: 'blob:receipt',
      uploadedAt: '2024-01-01T00:00:00.000Z',
    };

    it('creates, reads, updates and deletes one', async () => {
      const doc = await storage.createDocument(draft);

      expect((await storage.getDocument(doc.id))?.fileName).toBe('receipt.pdf');

      await storage.updateDocument(doc.id, { fileName: 'warranty.pdf' });
      expect((await storage.getDocument(doc.id))?.fileName).toBe('warranty.pdf');

      await storage.deleteDocument(doc.id);
      expect(await storage.getDocument(doc.id)).toBeNull();
    });

    it('finds them by property and by item', async () => {
      await storage.createDocument(draft);
      await storage.createDocument({ ...draft, organizationId: OTHER_ORG, itemId: 'item-2' });

      expect(await storage.getDocumentsByOrg(ORG)).toHaveLength(1);
      expect(await storage.getDocumentsByItem('item-1')).toHaveLength(1);
      expect(await storage.getDocuments()).toHaveLength(2);
    });
  });

  describe('accounts', () => {
    const draft = {
      email: 'a@example.com',
      name: 'A',
      passwordHash: 'hash',
      passwordSalt: 'salt',
    };

    it('creates one and stamps it', async () => {
      const user = await storage.createUser(draft);

      expect(user.id).toBeTruthy();
      expect(user.createdAt).toBeTruthy();
    });

    it('reads one back with its credentials', async () => {
      const user = await storage.createUser(draft);

      expect((await storage.getUserWithAuth(user.id))?.passwordHash).toBe('hash');
    });

    it('lists them', async () => {
      await storage.createUser(draft);
      await storage.createUser({ ...draft, email: 'b@example.com' });

      expect(await storage.getUsers()).toHaveLength(2);
    });

    it('updates one', async () => {
      const user = await storage.createUser(draft);

      await storage.updateUser(user.id, { name: 'Renamed' });

      expect((await storage.getUserWithAuth(user.id))?.name).toBe('Renamed');
    });

    it('deletes one', async () => {
      const user = await storage.createUser(draft);

      await storage.deleteUser(user.id);

      expect(await storage.getUserWithAuth(user.id)).toBeNull();
    });
  });

  describe('roles', () => {
    it('assigns a role and reads it back', async () => {
      await storage.setUserRole({ userId: 'u1', organizationId: ORG, role: 'ADMIN' });

      expect((await storage.getUserRole('u1', ORG))?.role).toBe('ADMIN');
    });

    it('has no role until one is assigned', async () => {
      expect(await storage.getUserRole('u1', ORG)).toBeNull();
    });

    it('replaces a role rather than stacking a second one', async () => {
      await storage.setUserRole({ userId: 'u1', organizationId: ORG, role: 'VIEWER' });
      await storage.setUserRole({ userId: 'u1', organizationId: ORG, role: 'MANAGER' });

      expect((await storage.getUserRole('u1', ORG))?.role).toBe('MANAGER');
      expect(await storage.getUserRolesByOrg(ORG)).toHaveLength(1);
    });

    it('keeps a person’s roles separate per property', async () => {
      await storage.setUserRole({ userId: 'u1', organizationId: ORG, role: 'ADMIN' });
      await storage.setUserRole({ userId: 'u1', organizationId: OTHER_ORG, role: 'VIEWER' });

      expect((await storage.getUserRole('u1', ORG))?.role).toBe('ADMIN');
      expect((await storage.getUserRole('u1', OTHER_ORG))?.role).toBe('VIEWER');
      expect(await storage.getUserRoles()).toHaveLength(2);
    });

    it('removes a role', async () => {
      await storage.setUserRole({ userId: 'u1', organizationId: ORG, role: 'ADMIN' });

      await storage.deleteUserRole('u1', ORG);

      expect(await storage.getUserRole('u1', ORG)).toBeNull();
    });
  });

  describe('bulk writes', () => {
    it('preserves the id of every row it writes', async () => {
      // Bulk saves once went through delete-all-then-create, which minted a new
      // id for every row and orphaned everything referencing it.
      await storage.replaceCollection('locations', [
        { id: 'fixed-1', organizationId: ORG, name: 'Garage' },
        { id: 'fixed-2', organizationId: ORG, name: 'Shed' },
      ]);

      const ids = (await storage.getLocations()).map((l) => l.id).sort();
      expect(ids).toEqual(['fixed-1', 'fixed-2']);
    });

    it('replaces what was there rather than appending', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Old' });

      await storage.replaceCollection('locations', [
        { id: 'fixed-1', organizationId: ORG, name: 'New' },
      ]);

      const locations = await storage.getLocations();
      expect(locations).toHaveLength(1);
      expect(locations[0]?.name).toBe('New');
    });

    it('empties a collection when given nothing', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Old' });

      await storage.replaceCollection('locations', []);

      expect(await storage.getLocations()).toHaveLength(0);
    });
  });

  describe('export, import and clear', () => {
    it('clears everything', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Garage' });
      await storage.createCategory({ organizationId: ORG, name: 'Power Tools' });

      await storage.clearAll();

      expect(await storage.getLocations()).toHaveLength(0);
      expect(await storage.getCategories()).toHaveLength(0);
    });

    it('exports data as JSON', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Garage' });

      const exported = await storage.exportData();

      expect(() => JSON.parse(exported)).not.toThrow();
      expect(exported).toContain('Garage');
    });

    it('imports what it exported, unchanged', async () => {
      await storage.createLocation({ organizationId: ORG, name: 'Garage' });
      await storage.createCategory({ organizationId: ORG, name: 'Power Tools' });
      const exported = await storage.exportData();

      await storage.clearAll();
      await storage.importData(exported);

      expect((await storage.getLocations())[0]?.name).toBe('Garage');
      expect((await storage.getCategories())[0]?.name).toBe('Power Tools');
    });

    it('keeps ids across an export and import round trip', async () => {
      const location = await storage.createLocation({ organizationId: ORG, name: 'Garage' });
      const exported = await storage.exportData();

      await storage.clearAll();
      await storage.importData(exported);

      expect((await storage.getLocations())[0]?.id).toBe(location.id);
    });
  });
});
