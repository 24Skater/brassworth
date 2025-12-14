/**
 * Storage API - Backward Compatible Wrapper
 *
 * This file provides a synchronous API for backward compatibility.
 * Internally, it uses the StorageProvider system which supports
 * multiple backends (localStorage, IndexedDB, API).
 *
 * Note: This synchronous API only works with localStorage provider.
 * When using IndexedDB or API providers, you should use the async
 * StorageProvider interface directly.
 */

import { storage as asyncStorage } from './storage/index';
import type {
  User,
  Organization,
  Membership,
  Location,
  Category,
  Tag,
  Item,
  Photo,
  Document,
  UserWithAuth,
  UserRoleAssignment,
} from '@/types';

// Synchronous wrapper that works with localStorage provider
// For other providers, use the async StorageProvider interface directly

export const storage = {
  // User
  getUser: (): User | null => {
    // For localStorage, we can access directly for sync compatibility
    const data = localStorage.getItem('inventory_user');
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: User | null): void => {
    if (user) {
      localStorage.setItem('inventory_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('inventory_user');
    }
    // Also update async storage for consistency
    asyncStorage.setUser(user).catch(console.error);
  },

  // Organizations
  getOrganizations: (): Organization[] => {
    const data = localStorage.getItem('inventory_organizations');
    return data ? JSON.parse(data) : [];
  },
  setOrganizations: (orgs: Organization[]): void => {
    localStorage.setItem('inventory_organizations', JSON.stringify(orgs));
    asyncStorage.setOrganizations(orgs).catch(console.error);
  },

  // Memberships
  getMemberships: (): Membership[] => {
    const data = localStorage.getItem('inventory_memberships');
    return data ? JSON.parse(data) : [];
  },
  setMemberships: (memberships: Membership[]): void => {
    localStorage.setItem('inventory_memberships', JSON.stringify(memberships));
    asyncStorage.setMemberships(memberships).catch(console.error);
  },

  // Locations
  getLocations: (): Location[] => {
    const data = localStorage.getItem('inventory_locations');
    return data ? JSON.parse(data) : [];
  },
  setLocations: (locations: Location[]): void => {
    localStorage.setItem('inventory_locations', JSON.stringify(locations));
    asyncStorage.setLocations(locations).catch(console.error);
  },

  // Categories
  getCategories: (): Category[] => {
    const data = localStorage.getItem('inventory_categories');
    return data ? JSON.parse(data) : [];
  },
  setCategories: (categories: Category[]): void => {
    localStorage.setItem('inventory_categories', JSON.stringify(categories));
    asyncStorage.setCategories(categories).catch(console.error);
  },

  // Tags
  getTags: (): Tag[] => {
    const data = localStorage.getItem('inventory_tags');
    return data ? JSON.parse(data) : [];
  },
  setTags: (tags: Tag[]): void => {
    localStorage.setItem('inventory_tags', JSON.stringify(tags));
    asyncStorage.setTags(tags).catch(console.error);
  },

  // Items
  getItems: (): Item[] => {
    const data = localStorage.getItem('inventory_items');
    return data ? JSON.parse(data) : [];
  },
  setItems: (items: Item[]): void => {
    localStorage.setItem('inventory_items', JSON.stringify(items));
    asyncStorage.setItems(items).catch(console.error);
  },

  // Photos
  getPhotos: (): Photo[] => {
    const data = localStorage.getItem('inventory_photos');
    return data ? JSON.parse(data) : [];
  },
  setPhotos: (photos: Photo[]): void => {
    localStorage.setItem('inventory_photos', JSON.stringify(photos));
    asyncStorage.setPhotos(photos).catch(console.error);
  },

  // Documents
  getDocuments: (): Document[] => {
    const data = localStorage.getItem('inventory_documents');
    return data ? JSON.parse(data) : [];
  },
  setDocuments: (documents: Document[]): void => {
    localStorage.setItem('inventory_documents', JSON.stringify(documents));
    asyncStorage.setDocuments(documents).catch(console.error);
  },

  // Users (all users with auth)
  getUsers: (): UserWithAuth[] => {
    const data = localStorage.getItem('inventory_all_users');
    return data ? JSON.parse(data) : [];
  },
  setUsers: (users: UserWithAuth[]): void => {
    localStorage.setItem('inventory_all_users', JSON.stringify(users));
    asyncStorage.setUsers(users).catch(console.error);
  },

  // User Roles
  getUserRoles: (): UserRoleAssignment[] => {
    const data = localStorage.getItem('inventory_user_roles');
    return data ? JSON.parse(data) : [];
  },
  setUserRoles: (roles: UserRoleAssignment[]): void => {
    localStorage.setItem('inventory_user_roles', JSON.stringify(roles));
    asyncStorage.setUserRoles(roles).catch(console.error);
  },

  // Clear all
  clearAll: (): void => {
    const keys = [
      'inventory_user',
      'inventory_all_users',
      'inventory_user_roles',
      'inventory_organizations',
      'inventory_memberships',
      'inventory_locations',
      'inventory_categories',
      'inventory_tags',
      'inventory_items',
      'inventory_photos',
      'inventory_documents',
    ];
    keys.forEach((key) => localStorage.removeItem(key));
    asyncStorage.clearAll().catch(console.error);
  },
};
