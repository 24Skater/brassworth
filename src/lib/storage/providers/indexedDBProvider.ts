import Dexie, { type Table } from 'dexie';
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
  GearProfile,
} from '@/types';

/**
 * IndexedDB database schema
 */
class HomeAssetKeeperDB extends Dexie {
  organizations!: Table<Organization, string>;
  memberships!: Table<Membership, string>;
  locations!: Table<Location, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  items!: Table<Item, string>;
  itemEvents!: Table<ItemEvent, string>;
  wishlistEntries!: Table<WishlistEntry, string>;
  savingsContributions!: Table<SavingsContribution, string>;
  priceObservations!: Table<PriceObservation, string>;
  gearProfiles!: Table<GearProfile, string>;
  photos!: Table<Photo, string>;
  documents!: Table<Document, string>;
  users!: Table<UserWithAuth, string>;
  userRoles!: Table<UserRoleAssignment, string>;

  constructor() {
    super('HomeAssetKeeperDB');
    this.version(1).stores({
      organizations: 'id, organizationId, createdAt',
      memberships: 'id, userId, organizationId',
      locations: 'id, organizationId',
      categories: 'id, organizationId',
      tags: 'id, organizationId',
      items: 'id, organizationId, createdAt, updatedAt',
      photos: 'id, itemId',
      documents: 'id, organizationId, itemId',
      users: 'id, email',
      userRoles: 'id, userId, organizationId, [userId+organizationId]',
    });

    // v2 adds the append-only lifecycle log. Dexie applies this on top of an
    // existing v1 database without touching the stores already there.
    this.version(2).stores({
      itemEvents: 'id, itemId, organizationId, occurredAt',
    });

    // v3 adds the pre-purchase half. Applied on top of an existing database
    // without touching the stores already there.
    this.version(3).stores({
      wishlistEntries: 'id, organizationId, priority, createdAt',
      savingsContributions: 'id, wishlistEntryId, organizationId, occurredAt',
    });

    // v4 adds the price history behind a wishlist entry.
    this.version(4).stores({
      priceObservations: 'id, wishlistEntryId, organizationId, observedAt',
    });

    // v5 adds the organisation's own gear profiles. The shipped catalogue is
    // deliberately not a store — it is read-only data merged in at read time,
    // so writing it here would copy it into every browser and every backup.
    this.version(5).stores({
      gearProfiles: 'id, organizationId, brand, model',
    });
  }
}

/**
 * IndexedDB-based storage provider
 *
 * Provides better persistence than localStorage:
 * - Larger storage capacity (typically 50% of disk space)
 * - Indexed queries for better performance
 * - Structured data storage
 * - Better for large datasets
 */
export class IndexedDBProvider implements StorageProvider {
  private db: HomeAssetKeeperDB;
  private userCache: User | null = null;

  constructor() {
    this.db = new HomeAssetKeeperDB();
  }

  // User operations (stored in localStorage for compatibility)
  async getUser(): Promise<User | null> {
    if (this.userCache !== null) {
      return this.userCache;
    }
    const data = localStorage.getItem('inventory_user');
    this.userCache = data ? JSON.parse(data) : null;
    return this.userCache;
  }

  async setUser(user: User | null): Promise<void> {
    this.userCache = user;
    if (user) {
      localStorage.setItem('inventory_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('inventory_user');
    }
  }

  // Organization operations
  async getOrganizations(): Promise<Organization[]> {
    return await this.db.organizations.toArray();
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return (await this.db.organizations.get(id)) || null;
  }

  async createOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Organization> {
    const newOrg: Organization = {
      ...org,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.organizations.add(newOrg);
    return newOrg;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const existing = await this.db.organizations.get(id);
    if (!existing) {
      throw new Error(`Organization with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.db.organizations.update(id, updated);
    return updated;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.db.organizations.delete(id);
  }

  // Membership operations
  async getMemberships(): Promise<Membership[]> {
    return await this.db.memberships.toArray();
  }

  async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    return await this.db.memberships.where('organizationId').equals(orgId).toArray();
  }

  async createMembership(membership: Omit<Membership, 'id'>): Promise<Membership> {
    const newMembership: Membership = {
      ...membership,
      id: crypto.randomUUID(),
    };
    await this.db.memberships.add(newMembership);
    return newMembership;
  }

  async deleteMembership(id: string): Promise<void> {
    await this.db.memberships.delete(id);
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    return await this.db.locations.toArray();
  }

  async getLocationsByOrg(orgId: string): Promise<Location[]> {
    return await this.db.locations.where('organizationId').equals(orgId).toArray();
  }

  async getLocation(id: string): Promise<Location | null> {
    return (await this.db.locations.get(id)) || null;
  }

  async createLocation(location: Omit<Location, 'id'>): Promise<Location> {
    const newLocation: Location = {
      ...location,
      id: crypto.randomUUID(),
    };
    await this.db.locations.add(newLocation);
    return newLocation;
  }

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    const existing = await this.db.locations.get(id);
    if (!existing) {
      throw new Error(`Location with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await this.db.locations.update(id, updated);
    return updated;
  }

  async deleteLocation(id: string): Promise<void> {
    await this.db.locations.delete(id);
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await this.db.categories.toArray();
  }

  async getCategoriesByOrg(orgId: string): Promise<Category[]> {
    return await this.db.categories.where('organizationId').equals(orgId).toArray();
  }

  async getCategory(id: string): Promise<Category | null> {
    return (await this.db.categories.get(id)) || null;
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
    };
    await this.db.categories.add(newCategory);
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const existing = await this.db.categories.get(id);
    if (!existing) {
      throw new Error(`Category with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await this.db.categories.update(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.categories.delete(id);
  }

  // Tag operations
  async getTags(): Promise<Tag[]> {
    return await this.db.tags.toArray();
  }

  async getTagsByOrg(orgId: string): Promise<Tag[]> {
    return await this.db.tags.where('organizationId').equals(orgId).toArray();
  }

  async getTag(id: string): Promise<Tag | null> {
    return (await this.db.tags.get(id)) || null;
  }

  async createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
    const newTag: Tag = {
      ...tag,
      id: crypto.randomUUID(),
    };
    await this.db.tags.add(newTag);
    return newTag;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const existing = await this.db.tags.get(id);
    if (!existing) {
      throw new Error(`Tag with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await this.db.tags.update(id, updated);
    return updated;
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.tags.delete(id);
  }

  // Item operations
  async getItems(): Promise<Item[]> {
    return await this.db.items.toArray();
  }

  async getItemsByOrg(orgId: string): Promise<Item[]> {
    return await this.db.items.where('organizationId').equals(orgId).toArray();
  }

  async getItem(id: string): Promise<Item | null> {
    return (await this.db.items.get(id)) || null;
  }

  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const newItem: Item = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.db.items.add(newItem);
    return newItem;
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    const existing = await this.db.items.get(id);
    if (!existing) {
      throw new Error(`Item with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.db.items.update(id, updated);
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.items.delete(id);
    // The lifecycle log belongs to the item; leaving it behind orphans it.
    await this.deleteItemEventsByItem(id);
  }

  // Photo operations
  async getPhotos(): Promise<Photo[]> {
    return await this.db.photos.toArray();
  }

  async getPhotosByItem(itemId: string): Promise<Photo[]> {
    return await this.db.photos.where('itemId').equals(itemId).toArray();
  }

  async getPhoto(id: string): Promise<Photo | null> {
    return (await this.db.photos.get(id)) || null;
  }

  async createPhoto(photo: Omit<Photo, 'id'>): Promise<Photo> {
    const newPhoto: Photo = {
      ...photo,
      id: crypto.randomUUID(),
    };
    await this.db.photos.add(newPhoto);
    return newPhoto;
  }

  async updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo> {
    const existing = await this.db.photos.get(id);
    if (!existing) {
      throw new Error(`Photo with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await this.db.photos.update(id, updated);
    return updated;
  }

  async deletePhoto(id: string): Promise<void> {
    await this.db.photos.delete(id);
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    return await this.db.documents.toArray();
  }

  async getDocumentsByOrg(orgId: string): Promise<Document[]> {
    return await this.db.documents.where('organizationId').equals(orgId).toArray();
  }

  async getDocumentsByItem(itemId: string): Promise<Document[]> {
    return await this.db.documents.where('itemId').equals(itemId).toArray();
  }

  async getDocument(id: string): Promise<Document | null> {
    return (await this.db.documents.get(id)) || null;
  }

  async createDocument(document: Omit<Document, 'id'>): Promise<Document> {
    const newDocument: Document = {
      ...document,
      id: crypto.randomUUID(),
    };
    await this.db.documents.add(newDocument);
    return newDocument;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const existing = await this.db.documents.get(id);
    if (!existing) {
      throw new Error(`Document with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await this.db.documents.update(id, updated);
    return updated;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.db.documents.delete(id);
  }

  // User management operations
  async getUsers(): Promise<UserWithAuth[]> {
    return await this.db.users.toArray();
  }

  async getUserWithAuth(id: string): Promise<UserWithAuth | null> {
    return (await this.db.users.get(id)) || null;
  }

  async createUser(user: Omit<UserWithAuth, 'id' | 'createdAt'>): Promise<UserWithAuth> {
    const newUser: UserWithAuth = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.db.users.add(newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<UserWithAuth>): Promise<UserWithAuth> {
    const existing = await this.db.users.get(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    await this.db.users.update(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.users.delete(id);
  }

  // User role operations
  async getUserRoles(): Promise<UserRoleAssignment[]> {
    return await this.db.userRoles.toArray();
  }

  async getUserRolesByOrg(orgId: string): Promise<UserRoleAssignment[]> {
    return await this.db.userRoles.where('organizationId').equals(orgId).toArray();
  }

  async getUserRole(userId: string, orgId: string): Promise<UserRoleAssignment | null> {
    const roles = await this.db.userRoles
      .where('userId')
      .equals(userId)
      .and((r) => r.organizationId === orgId)
      .toArray();
    return roles[0] || null;
  }

  async setUserRole(assignment: Omit<UserRoleAssignment, 'id'>): Promise<UserRoleAssignment> {
    const existing = await this.getUserRole(assignment.userId, assignment.organizationId);
    const newRole: UserRoleAssignment = {
      ...assignment,
      id: existing?.id || crypto.randomUUID(),
    };

    if (existing) {
      await this.db.userRoles.update(existing.id, newRole);
    } else {
      await this.db.userRoles.add(newRole);
    }

    return newRole;
  }

  async deleteUserRole(userId: string, orgId: string): Promise<void> {
    const role = await this.getUserRole(userId, orgId);
    if (role) {
      await this.db.userRoles.delete(role.id);
    }
  }

  // Utility operations
  // --- Item events (append-only) ---

  async getItemEvents(): Promise<ItemEvent[]> {
    return this.db.itemEvents.toArray();
  }

  async getItemEventsByItem(itemId: string): Promise<ItemEvent[]> {
    return this.db.itemEvents.where('itemId').equals(itemId).toArray();
  }

  async createItemEvent(event: Omit<ItemEvent, 'id' | 'createdAt'>): Promise<ItemEvent> {
    const created: ItemEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.db.itemEvents.add(created);
    return created;
  }

  async deleteItemEventsByItem(itemId: string): Promise<void> {
    await this.db.itemEvents.where('itemId').equals(itemId).delete();
  }

  // --- Wishlist ---

  async getWishlistEntries(): Promise<WishlistEntry[]> {
    return this.db.wishlistEntries.toArray();
  }

  async getWishlistEntry(id: string): Promise<WishlistEntry | null> {
    return (await this.db.wishlistEntries.get(id)) ?? null;
  }

  async createWishlistEntry(
    entry: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WishlistEntry> {
    const now = new Date().toISOString();
    const created: WishlistEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.wishlistEntries.add(created);
    return created;
  }

  async updateWishlistEntry(id: string, updates: Partial<WishlistEntry>): Promise<WishlistEntry> {
    await this.db.wishlistEntries.update(id, { ...updates, updatedAt: new Date().toISOString() });
    const updated = await this.db.wishlistEntries.get(id);
    if (!updated) throw new Error(`Wishlist entry with id ${id} not found`);
    return updated;
  }

  async deleteWishlistEntry(id: string): Promise<void> {
    await this.db.wishlistEntries.delete(id);
    // The savings log belongs to the entry; leaving it behind orphans it.
    await this.deleteSavingsContributionsByEntry(id);
    await this.deletePriceObservationsByEntry(id);
  }

  // --- Savings ---

  async getSavingsContributions(): Promise<SavingsContribution[]> {
    return this.db.savingsContributions.toArray();
  }

  async getSavingsContributionsByEntry(entryId: string): Promise<SavingsContribution[]> {
    return this.db.savingsContributions.where('wishlistEntryId').equals(entryId).toArray();
  }

  async createSavingsContribution(
    contribution: Omit<SavingsContribution, 'id' | 'createdAt'>
  ): Promise<SavingsContribution> {
    const created: SavingsContribution = {
      ...contribution,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.db.savingsContributions.add(created);
    return created;
  }

  async deleteSavingsContributionsByEntry(entryId: string): Promise<void> {
    await this.db.savingsContributions.where('wishlistEntryId').equals(entryId).delete();
  }

  // --- Price observations ---

  async getPriceObservations(): Promise<PriceObservation[]> {
    return this.db.priceObservations.toArray();
  }

  async getPriceObservationsByEntry(entryId: string): Promise<PriceObservation[]> {
    return this.db.priceObservations.where('wishlistEntryId').equals(entryId).toArray();
  }

  async createPriceObservation(
    observation: Omit<PriceObservation, 'id' | 'createdAt'>
  ): Promise<PriceObservation> {
    const created: PriceObservation = {
      ...observation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await this.db.priceObservations.add(created);
    return created;
  }

  async deletePriceObservationsByEntry(entryId: string): Promise<void> {
    await this.db.priceObservations.where('wishlistEntryId').equals(entryId).delete();
  }

  // --- Gear profiles (the organisation's own; the catalogue is never stored) ---

  async getGearProfiles(): Promise<GearProfile[]> {
    return this.db.gearProfiles.toArray();
  }

  async getGearProfile(id: string): Promise<GearProfile | null> {
    return (await this.db.gearProfiles.get(id)) ?? null;
  }

  async createGearProfile(
    profile: Omit<GearProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GearProfile> {
    const now = new Date().toISOString();
    const created: GearProfile = {
      ...profile,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.gearProfiles.add(created);
    return created;
  }

  async updateGearProfile(id: string, updates: Partial<GearProfile>): Promise<GearProfile> {
    const existing = await this.db.gearProfiles.get(id);
    if (!existing) throw new Error(`Gear profile not found: ${id}`);

    const updated: GearProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await this.db.gearProfiles.put(updated);
    return updated;
  }

  async deleteGearProfile(id: string): Promise<void> {
    await this.db.gearProfiles.delete(id);
  }

  async replaceCollection<K extends CollectionName>(
    collection: K,
    rows: CollectionRow<K>[]
  ): Promise<void> {
    // Table names on HomeAssetKeeperDB match the collection names exactly.
    const table = this.db.table(collection);
    await this.db.transaction('rw', table, async () => {
      await table.clear();
      if (rows.length > 0) {
        await table.bulkPut(rows);
      }
    });
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.db.organizations.clear(),
      this.db.memberships.clear(),
      this.db.locations.clear(),
      this.db.categories.clear(),
      this.db.tags.clear(),
      this.db.items.clear(),
      this.db.itemEvents.clear(),
      this.db.wishlistEntries.clear(),
      this.db.savingsContributions.clear(),
      this.db.priceObservations.clear(),
      this.db.gearProfiles.clear(),
      this.db.photos.clear(),
      this.db.documents.clear(),
      this.db.users.clear(),
      this.db.userRoles.clear(),
    ]);
    localStorage.removeItem('inventory_user');
    this.userCache = null;
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
      gearProfiles: await this.getGearProfiles(),
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
      await this.db.organizations.bulkPut(parsed.organizations);
    }
    if (parsed.memberships) {
      await this.db.memberships.bulkPut(parsed.memberships);
    }
    if (parsed.locations) {
      await this.db.locations.bulkPut(parsed.locations);
    }
    if (parsed.categories) {
      await this.db.categories.bulkPut(parsed.categories);
    }
    if (parsed.tags) {
      await this.db.tags.bulkPut(parsed.tags);
    }
    if (parsed.items) {
      await this.db.items.bulkPut(parsed.items);
    }
    if (parsed.itemEvents) {
      await this.db.itemEvents.bulkPut(parsed.itemEvents);
    }
    if (parsed.wishlistEntries) {
      await this.db.wishlistEntries.bulkPut(parsed.wishlistEntries);
    }
    if (parsed.savingsContributions) {
      await this.db.savingsContributions.bulkPut(parsed.savingsContributions);
    }
    if (parsed.gearProfiles) {
      await this.db.gearProfiles.bulkPut(parsed.gearProfiles);
    }
    if (parsed.priceObservations) {
      await this.db.priceObservations.bulkPut(parsed.priceObservations);
    }
    if (parsed.photos) {
      await this.db.photos.bulkPut(parsed.photos);
    }
    if (parsed.documents) {
      await this.db.documents.bulkPut(parsed.documents);
    }
    if (parsed.users) {
      await this.db.users.bulkPut(parsed.users);
    }
    if (parsed.userRoles) {
      await this.db.userRoles.bulkPut(parsed.userRoles);
    }
  }
}
