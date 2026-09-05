import type { StorageProvider, StorageProviderType } from './types';
import type {
  Organization,
  Membership,
  Location,
  Category,
  Tag,
  Item,
  ItemEvent,
  WishlistEntry,
  SavingsContribution,
  PriceObservation,
  Photo,
  Document,
  UserWithAuth,
  UserRoleAssignment,
  User,
} from '@/types';
import { LocalStorageProvider } from './providers/localStorageProvider';
import { IndexedDBProvider } from './providers/indexedDBProvider';
import { ApiStorageProvider } from './providers/apiProvider';
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
      storageProviderInstance = new ApiStorageProvider({
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
      });
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

  // Single-item writes, for callers that create one thing rather than saving a
  // whole collection.
  getItem: async (id: string) => getStorageProvider().getItem(id),
  createItem: async (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) =>
    getStorageProvider().createItem(item),
  updateItem: async (id: string, updates: Partial<Item>) =>
    getStorageProvider().updateItem(id, updates),
  deleteItem: async (id: string) => getStorageProvider().deleteItem(id),

  // Item events (append-only lifecycle log)
  getItemEvents: async () => getStorageProvider().getItemEvents(),
  getItemEventsByItem: async (itemId: string) => getStorageProvider().getItemEventsByItem(itemId),
  createItemEvent: async (event: Omit<ItemEvent, 'id' | 'createdAt'>) =>
    getStorageProvider().createItemEvent(event),
  setItemEvents: async (events: ItemEvent[]) =>
    getStorageProvider().replaceCollection('itemEvents', events),

  // Wishlist
  getWishlistEntries: async () => getStorageProvider().getWishlistEntries(),
  getWishlistEntry: async (id: string) => getStorageProvider().getWishlistEntry(id),
  createWishlistEntry: async (entry: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
    getStorageProvider().createWishlistEntry(entry),
  updateWishlistEntry: async (id: string, updates: Partial<WishlistEntry>) =>
    getStorageProvider().updateWishlistEntry(id, updates),
  deleteWishlistEntry: async (id: string) => getStorageProvider().deleteWishlistEntry(id),
  setWishlistEntries: async (entries: WishlistEntry[]) =>
    getStorageProvider().replaceCollection('wishlistEntries', entries),

  // Savings contributions
  getSavingsContributions: async () => getStorageProvider().getSavingsContributions(),
  getSavingsContributionsByEntry: async (entryId: string) =>
    getStorageProvider().getSavingsContributionsByEntry(entryId),
  createSavingsContribution: async (c: Omit<SavingsContribution, 'id' | 'createdAt'>) =>
    getStorageProvider().createSavingsContribution(c),
  setSavingsContributions: async (rows: SavingsContribution[]) =>
    getStorageProvider().replaceCollection('savingsContributions', rows),

  // Price observations
  getPriceObservations: async () => getStorageProvider().getPriceObservations(),
  getPriceObservationsByEntry: async (entryId: string) =>
    getStorageProvider().getPriceObservationsByEntry(entryId),
  createPriceObservation: async (o: Omit<PriceObservation, 'id' | 'createdAt'>) =>
    getStorageProvider().createPriceObservation(o),
  setPriceObservations: async (rows: PriceObservation[]) =>
    getStorageProvider().replaceCollection('priceObservations', rows),

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
