import { User, Organization, Membership, Location, Category, Tag, Item, Photo, Document, UserWithAuth, UserRoleAssignment } from '@/types';

const STORAGE_KEYS = {
  USER: 'inventory_user',
  USERS: 'inventory_all_users',
  USER_ROLES: 'inventory_user_roles',
  ORGANIZATIONS: 'inventory_organizations',
  MEMBERSHIPS: 'inventory_memberships',
  LOCATIONS: 'inventory_locations',
  CATEGORIES: 'inventory_categories',
  TAGS: 'inventory_tags',
  ITEMS: 'inventory_items',
  PHOTOS: 'inventory_photos',
  DOCUMENTS: 'inventory_documents',
};

export const storage = {
  // User
  getUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  // Organizations
  getOrganizations: (): Organization[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS);
    return data ? JSON.parse(data) : [];
  },
  setOrganizations: (orgs: Organization[]) => {
    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(orgs));
  },

  // Memberships
  getMemberships: (): Membership[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
    return data ? JSON.parse(data) : [];
  },
  setMemberships: (memberships: Membership[]) => {
    localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(memberships));
  },

  // Locations
  getLocations: (): Location[] => {
    const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    return data ? JSON.parse(data) : [];
  },
  setLocations: (locations: Location[]) => {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  },

  // Categories
  getCategories: (): Category[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return data ? JSON.parse(data) : [];
  },
  setCategories: (categories: Category[]) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  // Tags
  getTags: (): Tag[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TAGS);
    return data ? JSON.parse(data) : [];
  },
  setTags: (tags: Tag[]) => {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
  },

  // Items
  getItems: (): Item[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return data ? JSON.parse(data) : [];
  },
  setItems: (items: Item[]) => {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  // Photos
  getPhotos: (): Photo[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PHOTOS);
    return data ? JSON.parse(data) : [];
  },
  setPhotos: (photos: Photo[]) => {
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
  },

  // Documents
  getDocuments: (): Document[] => {
    const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    return data ? JSON.parse(data) : [];
  },
  setDocuments: (documents: Document[]) => {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
  },

  // Users (all users with auth)
  getUsers: (): UserWithAuth[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  setUsers: (users: UserWithAuth[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  // User Roles
  getUserRoles: (): UserRoleAssignment[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USER_ROLES);
    return data ? JSON.parse(data) : [];
  },
  setUserRoles: (roles: UserRoleAssignment[]) => {
    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(roles));
  },

  // Clear all
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },
};
