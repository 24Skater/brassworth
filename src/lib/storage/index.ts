import type { StorageProvider, StorageProviderType } from './types';
import type {
  Organization,
  Membership,
  Location,
  Category,
  Tag,
  Item,
  ItemEvent,
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
      // Fail loudly. Silently falling back to localStorage would mean an
      // operator who configured a server watched their data quietly go into the
      // browser instead, and only discover it when the browser was cleared.
      throw new Error(
        'VITE_STORAGE_PROVIDER=api is not implemented yet. Use "localStorage" or "indexeddb".'
      );
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

  // Item events (append-only lifecycle log)
  getItemEvents: async () => getStorageProvider().getItemEvents(),
  getItemEventsByItem: async (itemId: string) => getStorageProvider().getItemEventsByItem(itemId),
  createItemEvent: async (event: Omit<ItemEvent, 'id' | 'createdAt'>) =>
    getStorageProvider().createItemEvent(event),
  setItemEvents: async (events: ItemEvent[]) =>
    getStorageProvider().replaceCollection('itemEvents', events),

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
