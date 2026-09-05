import type { StorageProvider, StorageProviderType } from './types';
import type {
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
  User,
} from '@/types';
import { LocalStorageProvider } from './providers/localStorageProvider';
import { IndexedDBProvider } from './providers/indexedDBProvider';
import { autoMigrateIfNeeded } from './migration';

let storageProviderInstance: StorageProvider | null = null;

/**
 * Creates a storage provider based on environment configuration
 */
export function createStorageProvider(): StorageProvider {
  if (storageProviderInstance) {
    return storageProviderInstance;
  }

  const providerType: StorageProviderType =
    (import.meta.env.VITE_STORAGE_PROVIDER as StorageProviderType) || 'localStorage';

  switch (providerType) {
    case 'localStorage':
      storageProviderInstance = new LocalStorageProvider();
      break;
    case 'indexeddb':
      storageProviderInstance = new IndexedDBProvider();
      // Auto-migrate from localStorage on first use
      autoMigrateIfNeeded('indexeddb').catch((error) => {
        console.error('Auto-migration failed:', error);
      });
      break;
    case 'api':
      // APIProvider will be implemented when backend is ready
      // For now, fall back to localStorage
      console.warn('API provider not yet implemented, falling back to localStorage');
      storageProviderInstance = new LocalStorageProvider();
      break;
    default:
      console.warn(`Unknown storage provider type: ${providerType}, using localStorage`);
      storageProviderInstance = new LocalStorageProvider();
  }

  return storageProviderInstance;
}

/**
 * Get the current storage provider instance
 */
export function getStorageProvider(): StorageProvider {
  if (!storageProviderInstance) {
    return createStorageProvider();
  }
  return storageProviderInstance;
}

/**
 * Set a custom storage provider (useful for testing)
 */
export function setStorageProvider(provider: StorageProvider): void {
  storageProviderInstance = provider;
}

// Export the default storage instance for backward compatibility
// This maintains the existing API while we migrate to the provider pattern
export const storage = {
  // User
  getUser: async () => getStorageProvider().getUser(),
  setUser: async (user: User | null) => getStorageProvider().setUser(user),

  // Organizations
  getOrganizations: async () => getStorageProvider().getOrganizations(),
  setOrganizations: async (orgs: Organization[]) =>
    getStorageProvider().replaceCollection('organizations', orgs),

  // Memberships
  getMemberships: async () => getStorageProvider().getMemberships(),
  setMemberships: async (memberships: Membership[]) =>
    getStorageProvider().replaceCollection('memberships', memberships),

  // Locations
  getLocations: async () => getStorageProvider().getLocations(),
  setLocations: async (locations: Location[]) =>
    getStorageProvider().replaceCollection('locations', locations),

  // Categories
  getCategories: async () => getStorageProvider().getCategories(),
  setCategories: async (categories: Category[]) =>
    getStorageProvider().replaceCollection('categories', categories),

  // Tags
  getTags: async () => getStorageProvider().getTags(),
  setTags: async (tags: Tag[]) => getStorageProvider().replaceCollection('tags', tags),

  // Items
  getItems: async () => getStorageProvider().getItems(),
  setItems: async (items: Item[]) => getStorageProvider().replaceCollection('items', items),

  // Photos
  getPhotos: async () => getStorageProvider().getPhotos(),
  setPhotos: async (photos: Photo[]) => getStorageProvider().replaceCollection('photos', photos),

  // Documents
  getDocuments: async () => getStorageProvider().getDocuments(),
  setDocuments: async (documents: Document[]) =>
    getStorageProvider().replaceCollection('documents', documents),

  // Users
  getUsers: async () => getStorageProvider().getUsers(),
  setUsers: async (users: UserWithAuth[]) => getStorageProvider().replaceCollection('users', users),

  // User Roles
  getUserRoles: async () => getStorageProvider().getUserRoles(),
  setUserRoles: async (roles: UserRoleAssignment[]) =>
    getStorageProvider().replaceCollection('userRoles', roles),

  // Clear all
  clearAll: async () => getStorageProvider().clearAll(),
};

// Export types
export type { StorageProvider, StorageProviderType } from './types';
export { LocalStorageProvider } from './providers/localStorageProvider';
export { IndexedDBProvider } from './providers/indexedDBProvider';
