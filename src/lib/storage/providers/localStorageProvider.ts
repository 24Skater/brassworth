import type { CollectionName, CollectionRow, StorageProvider } from '../types';
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
  ItemEvent,
  WishlistEntry,
  SavingsContribution,
  PriceObservation,
} from '@/types';

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
  ITEM_EVENTS: 'inventory_item_events',
  WISHLIST: 'inventory_wishlist',
  SAVINGS: 'inventory_savings',
  PRICES: 'inventory_price_observations',
  PHOTOS: 'inventory_photos',
  DOCUMENTS: 'inventory_documents',
};

/**
 * LocalStorage-based storage provider
 *
 * This is the default provider for single-user, client-side storage.
 * Data is stored in browser localStorage and persists across sessions.
 *
 * ⚠️ WARNING: Not suitable for production multi-user scenarios.
 */
export class LocalStorageProvider implements StorageProvider {
  // User operations
  async getUser(): Promise<User | null> {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  async setUser(user: User | null): Promise<void> {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  // Organization operations
  async getOrganizations(): Promise<Organization[]> {
    const data = localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS);
    return data ? JSON.parse(data) : [];
  }

  async getOrganization(id: string): Promise<Organization | null> {
    const orgs = await this.getOrganizations();
    return orgs.find((o) => o.id === id) || null;
  }

  async createOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Organization> {
    const orgs = await this.getOrganizations();
    const newOrg: Organization = {
      ...org,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orgs.push(newOrg);
    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(orgs));
    return newOrg;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const orgs = await this.getOrganizations();
    const index = orgs.findIndex((entry) => entry.id === id);
    const existing = orgs[index];
    if (!existing) {
      throw new Error(`Organization with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    orgs[index] = updated;
    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(orgs));
    return updated;
  }

  async deleteOrganization(id: string): Promise<void> {
    const orgs = await this.getOrganizations();
    const filtered = orgs.filter((o) => o.id !== id);
    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(filtered));
  }

  // Membership operations
  async getMemberships(): Promise<Membership[]> {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
    return data ? JSON.parse(data) : [];
  }

  async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    const memberships = await this.getMemberships();
    return memberships.filter((m) => m.organizationId === orgId);
  }

  async createMembership(membership: Omit<Membership, 'id'>): Promise<Membership> {
    const memberships = await this.getMemberships();
    const newMembership: Membership = {
      ...membership,
      id: crypto.randomUUID(),
    };
    memberships.push(newMembership);
    localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(memberships));
    return newMembership;
  }

  async deleteMembership(id: string): Promise<void> {
    const memberships = await this.getMemberships();
    const filtered = memberships.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(filtered));
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    return data ? JSON.parse(data) : [];
  }

  async getLocationsByOrg(orgId: string): Promise<Location[]> {
    const locations = await this.getLocations();
    return locations.filter((l) => l.organizationId === orgId);
  }

  async getLocation(id: string): Promise<Location | null> {
    const locations = await this.getLocations();
    return locations.find((l) => l.id === id) || null;
  }

  async createLocation(location: Omit<Location, 'id'>): Promise<Location> {
    const locations = await this.getLocations();
    const newLocation: Location = {
      ...location,
      id: crypto.randomUUID(),
    };
    locations.push(newLocation);
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    return newLocation;
  }

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    const locations = await this.getLocations();
    const index = locations.findIndex((entry) => entry.id === id);
    const existing = locations[index];
    if (!existing) {
      throw new Error(`Location with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    locations[index] = updated;
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    return updated;
  }

  async deleteLocation(id: string): Promise<void> {
    const locations = await this.getLocations();
    const filtered = locations.filter((l) => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(filtered));
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return data ? JSON.parse(data) : [];
  }

  async getCategoriesByOrg(orgId: string): Promise<Category[]> {
    const categories = await this.getCategories();
    return categories.filter((c) => c.organizationId === orgId);
  }

  async getCategory(id: string): Promise<Category | null> {
    const categories = await this.getCategories();
    return categories.find((c) => c.id === id) || null;
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const categories = await this.getCategories();
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
    };
    categories.push(newCategory);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const categories = await this.getCategories();
    const index = categories.findIndex((entry) => entry.id === id);
    const existing = categories[index];
    if (!existing) {
      throw new Error(`Category with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    categories[index] = updated;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = await this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
  }

  // Tag operations
  async getTags(): Promise<Tag[]> {
    const data = localStorage.getItem(STORAGE_KEYS.TAGS);
    return data ? JSON.parse(data) : [];
  }

  async getTagsByOrg(orgId: string): Promise<Tag[]> {
    const tags = await this.getTags();
    return tags.filter((t) => t.organizationId === orgId);
  }

  async getTag(id: string): Promise<Tag | null> {
    const tags = await this.getTags();
    return tags.find((t) => t.id === id) || null;
  }

  async createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
    const tags = await this.getTags();
    const newTag: Tag = {
      ...tag,
      id: crypto.randomUUID(),
    };
    tags.push(newTag);
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const tags = await this.getTags();
    const index = tags.findIndex((entry) => entry.id === id);
    const existing = tags[index];
    if (!existing) {
      throw new Error(`Tag with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    tags[index] = updated;
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    return updated;
  }

  async deleteTag(id: string): Promise<void> {
    const tags = await this.getTags();
    const filtered = tags.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(filtered));
  }

  // Item operations
  async getItems(): Promise<Item[]> {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return data ? JSON.parse(data) : [];
  }

  async getItemsByOrg(orgId: string): Promise<Item[]> {
    const items = await this.getItems();
    return items.filter((i) => i.organizationId === orgId);
  }

  async getItem(id: string): Promise<Item | null> {
    const items = await this.getItems();
    return items.find((i) => i.id === id) || null;
  }

  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const items = await this.getItems();
    const newItem: Item = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    return newItem;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    const items = await this.getItems();
    const index = items.findIndex((entry) => entry.id === id);
    const existing = items[index];
    if (!existing) {
      throw new Error(`Item with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    items[index] = updated;
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filtered = items.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(filtered));
    // The lifecycle log belongs to the item; leaving it behind orphans it.
    await this.deleteItemEventsByItem(id);
  }

  // Photo operations
  async getPhotos(): Promise<Photo[]> {
    const data = localStorage.getItem(STORAGE_KEYS.PHOTOS);
    return data ? JSON.parse(data) : [];
  }

  async getPhotosByItem(itemId: string): Promise<Photo[]> {
    const photos = await this.getPhotos();
    return photos.filter((p) => p.itemId === itemId);
  }

  async getPhoto(id: string): Promise<Photo | null> {
    const photos = await this.getPhotos();
    return photos.find((p) => p.id === id) || null;
  }

  async createPhoto(photo: Omit<Photo, 'id'>): Promise<Photo> {
    const photos = await this.getPhotos();
    const newPhoto: Photo = {
      ...photo,
      id: crypto.randomUUID(),
    };
    photos.push(newPhoto);
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
    return newPhoto;
  }

  async updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo> {
    const photos = await this.getPhotos();
    const index = photos.findIndex((entry) => entry.id === id);
    const existing = photos[index];
    if (!existing) {
      throw new Error(`Photo with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    photos[index] = updated;
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
    return updated;
  }

  async deletePhoto(id: string): Promise<void> {
    const photos = await this.getPhotos();
    const filtered = photos.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(filtered));
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    return data ? JSON.parse(data) : [];
  }

  async getDocumentsByOrg(orgId: string): Promise<Document[]> {
    const documents = await this.getDocuments();
    return documents.filter((d) => d.organizationId === orgId);
  }

  async getDocumentsByItem(itemId: string): Promise<Document[]> {
    const documents = await this.getDocuments();
    return documents.filter((d) => d.itemId === itemId);
  }

  async getDocument(id: string): Promise<Document | null> {
    const documents = await this.getDocuments();
    return documents.find((d) => d.id === id) || null;
  }

  async createDocument(document: Omit<Document, 'id'>): Promise<Document> {
    const documents = await this.getDocuments();
    const newDocument: Document = {
      ...document,
      id: crypto.randomUUID(),
    };
    documents.push(newDocument);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    return newDocument;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const documents = await this.getDocuments();
    const index = documents.findIndex((entry) => entry.id === id);
    const existing = documents[index];
    if (!existing) {
      throw new Error(`Document with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    documents[index] = updated;
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    const documents = await this.getDocuments();
    const filtered = documents.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));
  }

  // User management operations
  async getUsers(): Promise<UserWithAuth[]> {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  async getUserWithAuth(id: string): Promise<UserWithAuth | null> {
    const users = await this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async createUser(user: Omit<UserWithAuth, 'id' | 'createdAt'>): Promise<UserWithAuth> {
    const users = await this.getUsers();
    const newUser: UserWithAuth = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  }

  async updateUser(id: string, updates: Partial<UserWithAuth>): Promise<UserWithAuth> {
    const users = await this.getUsers();
    const index = users.findIndex((entry) => entry.id === id);
    const existing = users[index];
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    users[index] = updated;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const users = await this.getUsers();
    const filtered = users.filter((u) => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
  }

  // User role operations
  async getUserRoles(): Promise<UserRoleAssignment[]> {
    const data = localStorage.getItem(STORAGE_KEYS.USER_ROLES);
    return data ? JSON.parse(data) : [];
  }

  async getUserRolesByOrg(orgId: string): Promise<UserRoleAssignment[]> {
    const roles = await this.getUserRoles();
    return roles.filter((r) => r.organizationId === orgId);
  }

  async getUserRole(userId: string, orgId: string): Promise<UserRoleAssignment | null> {
    const roles = await this.getUserRoles();
    return roles.find((r) => r.userId === userId && r.organizationId === orgId) || null;
  }

  async setUserRole(assignment: Omit<UserRoleAssignment, 'id'>): Promise<UserRoleAssignment> {
    const roles = await this.getUserRoles();
    const existingIndex = roles.findIndex(
      (r) => r.userId === assignment.userId && r.organizationId === assignment.organizationId
    );

    const newRole: UserRoleAssignment = {
      ...assignment,
      id: roles[existingIndex]?.id ?? crypto.randomUUID(),
    };

    if (existingIndex >= 0) {
      roles[existingIndex] = newRole;
    } else {
      roles.push(newRole);
    }

    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(roles));
    return newRole;
  }

  async deleteUserRole(userId: string, orgId: string): Promise<void> {
    const roles = await this.getUserRoles();
    const filtered = roles.filter((r) => !(r.userId === userId && r.organizationId === orgId));
    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(filtered));
  }

  // Utility operations
  // --- Wishlist ---

  async getWishlistEntries(): Promise<WishlistEntry[]> {
    const data = localStorage.getItem(STORAGE_KEYS.WISHLIST);
    return data ? JSON.parse(data) : [];
  }

  async getWishlistEntry(id: string): Promise<WishlistEntry | null> {
    return (await this.getWishlistEntries()).find((e) => e.id === id) ?? null;
  }

  async createWishlistEntry(
    entry: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WishlistEntry> {
    const entries = await this.getWishlistEntries();
    const now = new Date().toISOString();
    const created: WishlistEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    entries.push(created);
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(entries));
    return created;
  }

  async updateWishlistEntry(id: string, updates: Partial<WishlistEntry>): Promise<WishlistEntry> {
    const entries = await this.getWishlistEntries();
    const index = entries.findIndex((e) => e.id === id);
    const existing = entries[index];
    if (!existing) throw new Error(`Wishlist entry with id ${id} not found`);

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    entries[index] = updated;
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(entries));
    return updated;
  }

  async deleteWishlistEntry(id: string): Promise<void> {
    const entries = await this.getWishlistEntries();
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(entries.filter((e) => e.id !== id)));
    // The savings log belongs to the entry; leaving it behind orphans it.
    await this.deleteSavingsContributionsByEntry(id);
    await this.deletePriceObservationsByEntry(id);
  }

  // --- Savings ---

  async getSavingsContributions(): Promise<SavingsContribution[]> {
    const data = localStorage.getItem(STORAGE_KEYS.SAVINGS);
    return data ? JSON.parse(data) : [];
  }

  async getSavingsContributionsByEntry(entryId: string): Promise<SavingsContribution[]> {
    return (await this.getSavingsContributions()).filter((c) => c.wishlistEntryId === entryId);
  }

  async createSavingsContribution(
    contribution: Omit<SavingsContribution, 'id' | 'createdAt'>
  ): Promise<SavingsContribution> {
    const contributions = await this.getSavingsContributions();
    const created: SavingsContribution = {
      ...contribution,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    contributions.push(created);
    localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(contributions));
    return created;
  }

  async deleteSavingsContributionsByEntry(entryId: string): Promise<void> {
    const contributions = await this.getSavingsContributions();
    localStorage.setItem(
      STORAGE_KEYS.SAVINGS,
      JSON.stringify(contributions.filter((c) => c.wishlistEntryId !== entryId))
    );
  }

  // --- Price observations ---

  async getPriceObservations(): Promise<PriceObservation[]> {
    const data = localStorage.getItem(STORAGE_KEYS.PRICES);
    return data ? JSON.parse(data) : [];
  }

  async getPriceObservationsByEntry(entryId: string): Promise<PriceObservation[]> {
    return (await this.getPriceObservations()).filter((o) => o.wishlistEntryId === entryId);
  }

  async createPriceObservation(
    observation: Omit<PriceObservation, 'id' | 'createdAt'>
  ): Promise<PriceObservation> {
    const observations = await this.getPriceObservations();
    const created: PriceObservation = {
      ...observation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    observations.push(created);
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(observations));
    return created;
  }

  async deletePriceObservationsByEntry(entryId: string): Promise<void> {
    const observations = await this.getPriceObservations();
    localStorage.setItem(
      STORAGE_KEYS.PRICES,
      JSON.stringify(observations.filter((o) => o.wishlistEntryId !== entryId))
    );
  }

  private static readonly COLLECTION_KEYS: Record<CollectionName, string> = {
    organizations: STORAGE_KEYS.ORGANIZATIONS,
    memberships: STORAGE_KEYS.MEMBERSHIPS,
    locations: STORAGE_KEYS.LOCATIONS,
    categories: STORAGE_KEYS.CATEGORIES,
    tags: STORAGE_KEYS.TAGS,
    items: STORAGE_KEYS.ITEMS,
    itemEvents: STORAGE_KEYS.ITEM_EVENTS,
    wishlistEntries: STORAGE_KEYS.WISHLIST,
    savingsContributions: STORAGE_KEYS.SAVINGS,
    priceObservations: STORAGE_KEYS.PRICES,
    photos: STORAGE_KEYS.PHOTOS,
    documents: STORAGE_KEYS.DOCUMENTS,
    users: STORAGE_KEYS.USERS,
    userRoles: STORAGE_KEYS.USER_ROLES,
  };

  // --- Item events (append-only) ---

  async getItemEvents(): Promise<ItemEvent[]> {
    const data = localStorage.getItem(STORAGE_KEYS.ITEM_EVENTS);
    return data ? JSON.parse(data) : [];
  }

  async getItemEventsByItem(itemId: string): Promise<ItemEvent[]> {
    const events = await this.getItemEvents();
    return events.filter((e) => e.itemId === itemId);
  }

  async createItemEvent(event: Omit<ItemEvent, 'id' | 'createdAt'>): Promise<ItemEvent> {
    const events = await this.getItemEvents();
    const created: ItemEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    events.push(created);
    localStorage.setItem(STORAGE_KEYS.ITEM_EVENTS, JSON.stringify(events));
    return created;
  }

  async deleteItemEventsByItem(itemId: string): Promise<void> {
    const events = await this.getItemEvents();
    localStorage.setItem(
      STORAGE_KEYS.ITEM_EVENTS,
      JSON.stringify(events.filter((e) => e.itemId !== itemId))
    );
  }

  async replaceCollection<K extends CollectionName>(
    collection: K,
    rows: CollectionRow<K>[]
  ): Promise<void> {
    const key = LocalStorageProvider.COLLECTION_KEYS[collection];
    localStorage.setItem(key, JSON.stringify(rows));
  }

  async clearAll(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }

  async exportData(): Promise<string> {
    const data = {
      user: await this.getUser(),
      organizations: await this.getOrganizations(),
      memberships: await this.getMemberships(),
      locations: await this.getLocations(),
      categories: await this.getCategories(),
      tags: await this.getTags(),
      items: await this.getItems(),
      itemEvents: await this.getItemEvents(),
      wishlistEntries: await this.getWishlistEntries(),
      savingsContributions: await this.getSavingsContributions(),
      priceObservations: await this.getPriceObservations(),
      photos: await this.getPhotos(),
      documents: await this.getDocuments(),
      users: await this.getUsers(),
      userRoles: await this.getUserRoles(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(data: string): Promise<void> {
    const parsed = JSON.parse(data);

    if (parsed.user) await this.setUser(parsed.user);
    if (parsed.organizations) {
      localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(parsed.organizations));
    }
    if (parsed.memberships) {
      localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(parsed.memberships));
    }
    if (parsed.locations) {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(parsed.locations));
    }
    if (parsed.categories) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(parsed.categories));
    }
    if (parsed.tags) {
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(parsed.tags));
    }
    if (parsed.items) {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(parsed.items));
    }
    if (parsed.itemEvents) {
      localStorage.setItem(STORAGE_KEYS.ITEM_EVENTS, JSON.stringify(parsed.itemEvents));
    }
    if (parsed.wishlistEntries) {
      localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(parsed.wishlistEntries));
    }
    if (parsed.savingsContributions) {
      localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(parsed.savingsContributions));
    }
    if (parsed.priceObservations) {
      localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(parsed.priceObservations));
    }
    if (parsed.photos) {
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(parsed.photos));
    }
    if (parsed.documents) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(parsed.documents));
    }
    if (parsed.users) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed.users));
    }
    if (parsed.userRoles) {
      localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(parsed.userRoles));
    }
  }
}
