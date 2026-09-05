import { describe, it, expect, beforeEach } from 'vitest';
import { storage, setStorageProvider } from '@/lib/storage';
import { LocalStorageProvider } from '@/lib/storage/providers/localStorageProvider';
import type { User, Organization, Item } from '@/types';

/**
 * The storage facade is fully asynchronous. It used to be fronted by a
 * synchronous wrapper (`src/lib/storage.ts`) that only worked with the
 * localStorage provider; that wrapper is gone, so every call awaits.
 */
describe('storage facade', () => {
  beforeEach(() => {
    setStorageProvider(new LocalStorageProvider());
  });

  describe('user', () => {
    it('stores and retrieves the current user', async () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      await storage.setUser(user);

      expect(await storage.getUser()).toEqual(user);
    });

    it('returns null when no user is stored', async () => {
      expect(await storage.getUser()).toBeNull();
    });

    it('removes the user when set to null', async () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      await storage.setUser(user);
      await storage.setUser(null);

      expect(await storage.getUser()).toBeNull();
    });
  });

  describe('organizations', () => {
    it('stores and retrieves organizations', async () => {
      const orgs: Organization[] = [
        {
          id: '1',
          name: 'Test Org',
          type: 'home',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await storage.setOrganizations(orgs);

      expect(await storage.getOrganizations()).toEqual(orgs);
    });

    it('returns an empty array when none are stored', async () => {
      expect(await storage.getOrganizations()).toEqual([]);
    });

    it('preserves ids and timestamps across a save', async () => {
      const org: Organization = {
        id: 'fixed-id',
        name: 'Test Org',
        type: 'home',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      };

      await storage.setOrganizations([org]);
      const [stored] = await storage.getOrganizations();

      expect(stored?.id).toBe('fixed-id');
      expect(stored?.createdAt).toBe('2020-01-01T00:00:00.000Z');
    });
  });

  describe('items', () => {
    const makeItem = (id: string): Item => ({
      id,
      organizationId: 'org1',
      name: `Item ${id}`,
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    it('stores and retrieves items', async () => {
      const items = [makeItem('1')];

      await storage.setItems(items);

      expect(await storage.getItems()).toEqual(items);
    });

    it('returns an empty array when none are stored', async () => {
      expect(await storage.getItems()).toEqual([]);
    });

    it('replaces the collection rather than appending to it', async () => {
      await storage.setItems([makeItem('1'), makeItem('2')]);
      await storage.setItems([makeItem('1')]);

      const stored = await storage.getItems();
      expect(stored).toHaveLength(1);
      expect(stored[0]?.id).toBe('1');
    });
  });

  describe('clearAll', () => {
    it('clears every collection', async () => {
      await storage.setUser({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      });
      await storage.setOrganizations([
        {
          id: '1',
          name: 'Test Org',
          type: 'home',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await storage.clearAll();

      expect(await storage.getUser()).toBeNull();
      expect(await storage.getOrganizations()).toEqual([]);
    });
  });
});
