import type { StorageProvider, StorageProviderType } from './types';
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
  setUser: async (user: any) => getStorageProvider().setUser(user),

  // Organizations
  getOrganizations: async () => getStorageProvider().getOrganizations(),
  setOrganizations: async (orgs: any[]) => {
    // For backward compatibility, we need to replace all organizations
    // This is not ideal but maintains compatibility
    const provider = getStorageProvider();
    const existing = await provider.getOrganizations();
    // Delete all existing
    for (const org of existing) {
      await provider.deleteOrganization(org.id);
    }
    // Create new ones
    for (const org of orgs) {
      await provider.createOrganization({
        name: org.name,
        type: org.type,
        address: org.address,
      });
    }
  },

  // Memberships
  getMemberships: async () => getStorageProvider().getMemberships(),
  setMemberships: async (memberships: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getMemberships();
    for (const m of existing) {
      await provider.deleteMembership(m.id);
    }
    for (const m of memberships) {
      await provider.createMembership(m);
    }
  },

  // Locations
  getLocations: async () => getStorageProvider().getLocations(),
  setLocations: async (locations: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getLocations();
    for (const l of existing) {
      await provider.deleteLocation(l.id);
    }
    for (const l of locations) {
      await provider.createLocation(l);
    }
  },

  // Categories
  getCategories: async () => getStorageProvider().getCategories(),
  setCategories: async (categories: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getCategories();
    for (const c of existing) {
      await provider.deleteCategory(c.id);
    }
    for (const c of categories) {
      await provider.createCategory(c);
    }
  },

  // Tags
  getTags: async () => getStorageProvider().getTags(),
  setTags: async (tags: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getTags();
    for (const t of existing) {
      await provider.deleteTag(t.id);
    }
    for (const t of tags) {
      await provider.createTag(t);
    }
  },

  // Items
  getItems: async () => getStorageProvider().getItems(),
  setItems: async (items: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getItems();
    for (const i of existing) {
      await provider.deleteItem(i.id);
    }
    for (const i of items) {
      await provider.createItem(i);
    }
  },

  // Photos
  getPhotos: async () => getStorageProvider().getPhotos(),
  setPhotos: async (photos: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getPhotos();
    for (const p of existing) {
      await provider.deletePhoto(p.id);
    }
    for (const p of photos) {
      await provider.createPhoto(p);
    }
  },

  // Documents
  getDocuments: async () => getStorageProvider().getDocuments(),
  setDocuments: async (documents: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getDocuments();
    for (const d of existing) {
      await provider.deleteDocument(d.id);
    }
    for (const d of documents) {
      await provider.createDocument(d);
    }
  },

  // Users
  getUsers: async () => getStorageProvider().getUsers(),
  setUsers: async (users: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getUsers();
    for (const u of existing) {
      await provider.deleteUser(u.id);
    }
    for (const u of users) {
      await provider.createUser(u);
    }
  },

  // User Roles
  getUserRoles: async () => getStorageProvider().getUserRoles(),
  setUserRoles: async (roles: any[]) => {
    const provider = getStorageProvider();
    const existing = await provider.getUserRoles();
    for (const r of existing) {
      await provider.deleteUserRole(r.userId, r.organizationId);
    }
    for (const r of roles) {
      await provider.setUserRole(r);
    }
  },

  // Clear all
  clearAll: async () => getStorageProvider().clearAll(),
};

// Export types
export type { StorageProvider, StorageProviderType } from './types';
export { LocalStorageProvider } from './providers/localStorageProvider';
export { IndexedDBProvider } from './providers/indexedDBProvider';
