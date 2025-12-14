import {
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

/**
 * Storage Provider Interface
 *
 * All storage providers must implement this interface to ensure
 * consistent behavior across different storage backends (localStorage,
 * IndexedDB, API, etc.)
 */
export interface StorageProvider {
  // User operations
  getUser(): Promise<User | null>;
  setUser(user: User | null): Promise<void>;

  // Organization operations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | null>;
  createOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;

  // Membership operations
  getMemberships(): Promise<Membership[]>;
  getMembershipsByOrg(orgId: string): Promise<Membership[]>;
  createMembership(membership: Omit<Membership, 'id'>): Promise<Membership>;
  deleteMembership(id: string): Promise<void>;

  // Location operations
  getLocations(): Promise<Location[]>;
  getLocationsByOrg(orgId: string): Promise<Location[]>;
  getLocation(id: string): Promise<Location | null>;
  createLocation(location: Omit<Location, 'id'>): Promise<Location>;
  updateLocation(id: string, updates: Partial<Location>): Promise<Location>;
  deleteLocation(id: string): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoriesByOrg(orgId: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | null>;
  createCategory(category: Omit<Category, 'id'>): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Tag operations
  getTags(): Promise<Tag[]>;
  getTagsByOrg(orgId: string): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | null>;
  createTag(tag: Omit<Tag, 'id'>): Promise<Tag>;
  updateTag(id: string, updates: Partial<Tag>): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  // Item operations
  getItems(): Promise<Item[]>;
  getItemsByOrg(orgId: string): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  // Photo operations
  getPhotos(): Promise<Photo[]>;
  getPhotosByItem(itemId: string): Promise<Photo[]>;
  getPhoto(id: string): Promise<Photo | null>;
  createPhoto(photo: Omit<Photo, 'id'>): Promise<Photo>;
  updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;

  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocumentsByOrg(orgId: string): Promise<Document[]>;
  getDocumentsByItem(itemId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | null>;
  createDocument(document: Omit<Document, 'id'>): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // User management (for auth)
  getUsers(): Promise<UserWithAuth[]>;
  getUserWithAuth(id: string): Promise<UserWithAuth | null>;
  createUser(user: Omit<UserWithAuth, 'id' | 'createdAt'>): Promise<UserWithAuth>;
  updateUser(id: string, updates: Partial<UserWithAuth>): Promise<UserWithAuth>;
  deleteUser(id: string): Promise<void>;

  // User role operations
  getUserRoles(): Promise<UserRoleAssignment[]>;
  getUserRolesByOrg(orgId: string): Promise<UserRoleAssignment[]>;
  getUserRole(userId: string, orgId: string): Promise<UserRoleAssignment | null>;
  setUserRole(assignment: Omit<UserRoleAssignment, 'id'>): Promise<UserRoleAssignment>;
  deleteUserRole(userId: string, orgId: string): Promise<void>;

  // Utility operations
  clearAll(): Promise<void>;
  exportData(): Promise<string>; // JSON export
  importData(data: string): Promise<void>; // JSON import
}

/**
 * Storage provider type
 */
export type StorageProviderType = 'localStorage' | 'indexeddb' | 'api';
