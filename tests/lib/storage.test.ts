import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '@/lib/storage';
import type { User, Organization, Item } from '@/types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('User storage', () => {
    it('should store and retrieve user', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      storage.setUser(user);
      const retrieved = storage.getUser();

      expect(retrieved).toEqual(user);
    });

    it('should return null when no user is stored', () => {
      const user = storage.getUser();
      expect(user).toBeNull();
    });

    it('should remove user when set to null', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      storage.setUser(user);
      storage.setUser(null);
      const retrieved = storage.getUser();

      expect(retrieved).toBeNull();
    });
  });

  describe('Organization storage', () => {
    it('should store and retrieve organizations', () => {
      const orgs: Organization[] = [
        {
          id: '1',
          name: 'Test Org',
          type: 'home',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      storage.setOrganizations(orgs);
      const retrieved = storage.getOrganizations();

      expect(retrieved).toEqual(orgs);
    });

    it('should return empty array when no organizations are stored', () => {
      const orgs = storage.getOrganizations();
      expect(orgs).toEqual([]);
    });
  });

  describe('Item storage', () => {
    it('should store and retrieve items', () => {
      const items: Item[] = [
        {
          id: '1',
          organizationId: 'org1',
          name: 'Test Item',
          condition: 'GOOD',
          quantity: 1,
          isArchived: false,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      storage.setItems(items);
      const retrieved = storage.getItems();

      expect(retrieved).toEqual(items);
    });

    it('should return empty array when no items are stored', () => {
      const items = storage.getItems();
      expect(items).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('should clear all storage', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      storage.setUser(user);
      storage.setOrganizations([
        {
          id: '1',
          name: 'Test Org',
          type: 'home',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      storage.clearAll();

      expect(storage.getUser()).toBeNull();
      expect(storage.getOrganizations()).toEqual([]);
    });
  });
});
