import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import type { Item, Organization, Location, Category } from '@/types';

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    localStorage.clear();
    provider = new LocalStorageProvider();
  });

  describe('Organization operations', () => {
    it('should create organization', async () => {
      const org = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      expect(org.id).toBeDefined();
      expect(org.name).toBe('Test Org');
      expect(org.createdAt).toBeDefined();
    });

    it('should get organization by id', async () => {
      const created = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      const retrieved = await provider.getOrganization(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should update organization', async () => {
      const created = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      const updated = await provider.updateOrganization(created.id, {
        name: 'Updated Org',
      });

      expect(updated.name).toBe('Updated Org');
      expect(updated.id).toBe(created.id);
    });

    it('should delete organization', async () => {
      const created = await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      await provider.deleteOrganization(created.id);
      const retrieved = await provider.getOrganization(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Item operations', () => {
    it('should create item', async () => {
      const item = await provider.createItem({
        organizationId: 'org1',
        name: 'Test Item',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Test Item');
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
    });

    it('should get items by organization', async () => {
      await provider.createItem({
        organizationId: 'org1',
        name: 'Item 1',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      await provider.createItem({
        organizationId: 'org2',
        name: 'Item 2',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      const org1Items = await provider.getItemsByOrg('org1');
      expect(org1Items).toHaveLength(1);
      expect(org1Items[0].name).toBe('Item 1');
    });

    it('should update item', async () => {
      const created = await provider.createItem({
        organizationId: 'org1',
        name: 'Test Item',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      // Without advancing the clock, create and update land in the same
      // millisecond and the ISO timestamps compare equal — a flaky assertion.
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(Date.parse(created.updatedAt) + 1000));

      const updated = await provider.updateItem(created.id, {
        name: 'Updated Item',
        quantity: 2,
      });

      vi.useRealTimers();

      expect(updated.name).toBe('Updated Item');
      expect(updated.quantity).toBe(2);
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should delete item', async () => {
      const created = await provider.createItem({
        organizationId: 'org1',
        name: 'Test Item',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
      });

      await provider.deleteItem(created.id);
      const retrieved = await provider.getItem(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Export/Import', () => {
    it('should export data', async () => {
      await provider.createOrganization({
        name: 'Test Org',
        type: 'home',
      });

      const exported = await provider.exportData();
      const parsed = JSON.parse(exported);

      expect(parsed.organizations).toBeDefined();
      expect(parsed.organizations.length).toBeGreaterThan(0);
    });

    it('should import data', async () => {
      const data = {
        organizations: [
          {
            id: '1',
            name: 'Imported Org',
            type: 'home',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        items: [],
        locations: [],
        categories: [],
        tags: [],
        photos: [],
        documents: [],
        memberships: [],
        users: [],
        userRoles: [],
      };

      await provider.importData(JSON.stringify(data));
      const orgs = await provider.getOrganizations();
      expect(orgs).toHaveLength(1);
      expect(orgs[0].name).toBe('Imported Org');
    });
  });
});
