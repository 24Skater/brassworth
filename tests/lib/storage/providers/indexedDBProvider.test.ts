import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBProvider } from '@/lib/storage/providers/indexedDBProvider';

// NOTE: no Dexie mock. These tests run against real Dexie on top of
// fake-indexeddb (wired up in tests/setup.ts), so they exercise the actual
// query/transaction behaviour instead of a hand-written stand-in.
describe('IndexedDBProvider', () => {
  let provider: IndexedDBProvider;

  beforeEach(() => {
    localStorage.clear();
    provider = new IndexedDBProvider();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('User operations', () => {
    it('should get and set user', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      await provider.setUser(user);
      const retrieved = await provider.getUser();

      expect(retrieved).toEqual(user);
    });

    it('should return null for non-existent user', async () => {
      const user = await provider.getUser();
      expect(user).toBeNull();
    });

    it('should remove user when set to null', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      await provider.setUser(user);
      await provider.setUser(null);
      const retrieved = await provider.getUser();

      expect(retrieved).toBeNull();
    });
  });

  describe('Organization operations', () => {
    it('should create an organization', async () => {
      const org = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      expect(org.id).toBeDefined();
      expect(org.name).toBe('Test Org');
      expect(org.type).toBe('home');
      expect(org.createdAt).toBeDefined();
      expect(org.updatedAt).toBeDefined();
    });

    it('should get organization by id', async () => {
      const created = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      const retrieved = await provider.getOrganization(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent organization', async () => {
      const org = await provider.getOrganization('non-existent-id');
      expect(org).toBeNull();
    });

    it('should update an organization', async () => {
      const created = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      const updated = await provider.updateOrganization(created.id, { name: 'Updated Org' });

      expect(updated.name).toBe('Updated Org');
      expect(updated.type).toBe('home');
    });

    it('should throw error when updating non-existent organization', async () => {
      await expect(provider.updateOrganization('non-existent', { name: 'Test' })).rejects.toThrow();
    });
  });

  describe('Item operations', () => {
    const mockOrg = 'org-1';

    it('should create an item', async () => {
      const item = await provider.createItem({
        organizationId: mockOrg,
        name: 'Test Item',
        condition: 'NEW',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Test Item');
      expect(item.condition).toBe('NEW');
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
    });

    it('should get item by id', async () => {
      const created = await provider.createItem({
        organizationId: mockOrg,
        name: 'Test Item',
        condition: 'GOOD',
        quantity: 2,
        isArchived: false,
        tags: ['tag1'],
      });

      const retrieved = await provider.getItem(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should update an item', async () => {
      const created = await provider.createItem({
        organizationId: mockOrg,
        name: 'Test Item',
        condition: 'NEW',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      const updated = await provider.updateItem(created.id, { name: 'Updated Item', quantity: 5 });

      expect(updated.name).toBe('Updated Item');
      expect(updated.quantity).toBe(5);
    });

    it('should throw error when updating non-existent item', async () => {
      await expect(provider.updateItem('non-existent', { name: 'Test' })).rejects.toThrow();
    });

    it('should delete an item', async () => {
      const created = await provider.createItem({
        organizationId: mockOrg,
        name: 'Test Item',
        condition: 'NEW',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      await provider.deleteItem(created.id);
      const retrieved = await provider.getItem(created.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('Category operations', () => {
    const mockOrg = 'org-1';

    it('should create a category', async () => {
      const category = await provider.createCategory({
        organizationId: mockOrg,
        name: 'Electronics',
        description: 'Electronic devices',
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('Electronics');
      expect(category.description).toBe('Electronic devices');
    });

    it('should update a category', async () => {
      const created = await provider.createCategory({
        organizationId: mockOrg,
        name: 'Electronics',
      });

      const updated = await provider.updateCategory(created.id, {
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
    });
  });

  describe('Location operations', () => {
    const mockOrg = 'org-1';

    it('should create a location', async () => {
      const location = await provider.createLocation({
        organizationId: mockOrg,
        name: 'Living Room',
        notes: 'Main living area',
      });

      expect(location.id).toBeDefined();
      expect(location.name).toBe('Living Room');
      expect(location.notes).toBe('Main living area');
    });

    it('should support nested locations', async () => {
      const parent = await provider.createLocation({
        organizationId: mockOrg,
        name: 'House',
      });

      const child = await provider.createLocation({
        organizationId: mockOrg,
        name: 'Living Room',
        parentLocationId: parent.id,
      });

      expect(child.parentLocationId).toBe(parent.id);
    });
  });

  describe('Tag operations', () => {
    const mockOrg = 'org-1';

    it('should create a tag', async () => {
      const tag = await provider.createTag({
        organizationId: mockOrg,
        name: 'Important',
      });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('Important');
    });

    it('should update a tag', async () => {
      const created = await provider.createTag({
        organizationId: mockOrg,
        name: 'Important',
      });

      const updated = await provider.updateTag(created.id, { name: 'Very Important' });

      expect(updated.name).toBe('Very Important');
    });
  });

  describe('Export/Import operations', () => {
    it('should export data as JSON string', async () => {
      const exportedData = await provider.exportData();
      const parsed = JSON.parse(exportedData);

      expect(parsed).toHaveProperty('organizations');
      expect(parsed).toHaveProperty('items');
      expect(parsed).toHaveProperty('categories');
      expect(parsed).toHaveProperty('locations');
    });

    it('should import data from JSON string', async () => {
      const testData = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          createdAt: new Date().toISOString(),
        },
        organizations: [],
        memberships: [],
        locations: [],
        categories: [],
        tags: [],
        items: [],
        photos: [],
        documents: [],
        users: [],
        userRoles: [],
      };

      await provider.importData(JSON.stringify(testData));
      const user = await provider.getUser();

      expect(user).toEqual(testData.user);
    });
  });

  describe('Clear all operations', () => {
    it('should clear all data', async () => {
      // Set up some data
      await provider.setUser({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        createdAt: new Date().toISOString(),
      });
      await provider.createOrganization({ name: 'Test Org', type: 'home' });

      // Clear all
      await provider.clearAll();

      // Verify data is cleared
      const user = await provider.getUser();
      expect(user).toBeNull();
    });
  });
});
