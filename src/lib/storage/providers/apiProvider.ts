import type { CollectionName, CollectionRow, StorageProvider } from '../types';
import type {
  Category,
  Document,
  Item,
  ItemEvent,
  Location,
  Membership,
  Organization,
  Photo,
  Tag,
  User,
  UserRoleAssignment,
  UserWithAuth,
  WishlistEntry,
  SavingsContribution,
} from '@/types';

/**
 * Storage backed by the Brassworth API.
 *
 * One design point worth stating plainly: this provider has to be told which
 * organisation it is acting for, which the local providers never did. Locally,
 * `organizationId` is a column you filter on; over the wire it is a tenant
 * boundary that lives in the URL and is checked server-side. A provider that
 * guessed would either leak across tenants or silently read nothing.
 *
 * Requests send credentials, because the session is an httpOnly cookie the page
 * cannot read — that being the whole point of it.
 */

const COLLECTION_PATHS: Record<CollectionName, string> = {
  items: 'items',
  itemEvents: 'item-events',
  locations: 'locations',
  categories: 'categories',
  tags: 'tags',
  photos: 'photos',
  documents: 'documents',
  userRoles: 'user-roles',
  wishlistEntries: 'wishlist',
  savingsContributions: 'savings',
  // Organisations and memberships are not tenant-scoped collections; they are
  // how a caller discovers which tenants exist for them at all.
  organizations: 'organizations',
  memberships: 'memberships',
  users: 'users',
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiProviderOptions {
  baseUrl?: string;
  /** Injectable so tests can drive the real server in-process. */
  fetchImpl?: typeof fetch;
}

export class ApiStorageProvider implements StorageProvider {
  private organizationId: string | null = null;
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(options: ApiProviderOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
    this.doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  /** Called when the active property changes. */
  setOrganization(organizationId: string | null): void {
    this.organizationId = organizationId;
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  private requireOrg(): string {
    if (!this.organizationId) {
      throw new ApiError(400, 'No property selected.');
    }
    return this.organizationId;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.doFetch(`${this.baseUrl}${path}`, {
      ...init,
      // The session lives in an httpOnly cookie, so it has to ride along.
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(response.status, body?.error ?? 'The server rejected that request.');
    }

    return (await response.json()) as T;
  }

  private async listScoped<T>(collection: CollectionName): Promise<T[]> {
    const org = this.requireOrg();
    const { rows } = await this.request<{ rows: T[] }>(
      `/api/orgs/${org}/${COLLECTION_PATHS[collection]}`
    );
    return rows;
  }

  private async createScoped<T>(collection: CollectionName, body: unknown): Promise<T> {
    const org = this.requireOrg();
    const { row } = await this.request<{ row: T }>(
      `/api/orgs/${org}/${COLLECTION_PATHS[collection]}`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return row;
  }

  private async updateScoped<T>(
    collection: CollectionName,
    id: string,
    changes: unknown
  ): Promise<T> {
    const org = this.requireOrg();
    const { row } = await this.request<{ row: T }>(
      `/api/orgs/${org}/${COLLECTION_PATHS[collection]}/${id}`,
      { method: 'PATCH', body: JSON.stringify(changes) }
    );
    return row;
  }

  private async deleteScoped(collection: CollectionName, id: string): Promise<void> {
    const org = this.requireOrg();
    await this.request(`/api/orgs/${org}/${COLLECTION_PATHS[collection]}/${id}`, {
      method: 'DELETE',
    });
  }

  // --- User ---

  async getUser(): Promise<User | null> {
    try {
      const { user } = await this.request<{ user: User }>('/api/auth/me');
      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }

  async setUser(): Promise<void> {
    // The server decides who the viewer is, from the session cookie. A client
    // asserting its own identity is precisely what this tier exists to stop.
    throw new ApiError(400, 'The signed-in user is set by signing in.');
  }

  // --- Organisations ---

  async getOrganizations(): Promise<Organization[]> {
    const { organizations } = await this.request<{ organizations: Organization[] }>('/api/orgs');
    return organizations;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return (await this.getOrganizations()).find((org) => org.id === id) ?? null;
  }

  async createOrganization(
    org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Organization> {
    const { organization } = await this.request<{ organization: Organization }>('/api/orgs', {
      method: 'POST',
      body: JSON.stringify(org),
    });
    return organization;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { organization } = await this.request<{ organization: Organization }>(`/api/orgs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return organization;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.request(`/api/orgs/${id}`, { method: 'DELETE' });
  }

  // --- Memberships ---

  async getMemberships(): Promise<Membership[]> {
    const { memberships } = await this.request<{ memberships: Membership[] }>('/api/memberships');
    return memberships;
  }

  async getMembershipsByOrg(orgId: string): Promise<Membership[]> {
    return (await this.getMemberships()).filter((m) => m.organizationId === orgId);
  }

  async createMembership(membership: Omit<Membership, 'id'>): Promise<Membership> {
    const { membership: created } = await this.request<{ membership: Membership }>(
      '/api/memberships',
      { method: 'POST', body: JSON.stringify(membership) }
    );
    return created;
  }

  async deleteMembership(id: string): Promise<void> {
    await this.request(`/api/memberships/${id}`, { method: 'DELETE' });
  }

  // --- Locations ---

  async getLocations(): Promise<Location[]> {
    return this.listScoped<Location>('locations');
  }
  async getLocationsByOrg(orgId: string): Promise<Location[]> {
    return (await this.getLocations()).filter((l) => l.organizationId === orgId);
  }
  async getLocation(id: string): Promise<Location | null> {
    return (await this.getLocations()).find((l) => l.id === id) ?? null;
  }
  async createLocation(location: Omit<Location, 'id'>): Promise<Location> {
    return this.createScoped<Location>('locations', location);
  }
  async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    return this.updateScoped<Location>('locations', id, updates);
  }
  async deleteLocation(id: string): Promise<void> {
    return this.deleteScoped('locations', id);
  }

  // --- Categories ---

  async getCategories(): Promise<Category[]> {
    return this.listScoped<Category>('categories');
  }
  async getCategoriesByOrg(orgId: string): Promise<Category[]> {
    return (await this.getCategories()).filter((c) => c.organizationId === orgId);
  }
  async getCategory(id: string): Promise<Category | null> {
    return (await this.getCategories()).find((c) => c.id === id) ?? null;
  }
  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    return this.createScoped<Category>('categories', category);
  }
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    return this.updateScoped<Category>('categories', id, updates);
  }
  async deleteCategory(id: string): Promise<void> {
    return this.deleteScoped('categories', id);
  }

  // --- Tags ---

  async getTags(): Promise<Tag[]> {
    return this.listScoped<Tag>('tags');
  }
  async getTagsByOrg(orgId: string): Promise<Tag[]> {
    return (await this.getTags()).filter((t) => t.organizationId === orgId);
  }
  async getTag(id: string): Promise<Tag | null> {
    return (await this.getTags()).find((t) => t.id === id) ?? null;
  }
  async createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
    return this.createScoped<Tag>('tags', tag);
  }
  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    return this.updateScoped<Tag>('tags', id, updates);
  }
  async deleteTag(id: string): Promise<void> {
    return this.deleteScoped('tags', id);
  }

  // --- Items ---

  async getItems(): Promise<Item[]> {
    return (await this.listScoped<Item>('items')).map(normaliseItem);
  }
  async getItemsByOrg(orgId: string): Promise<Item[]> {
    return (await this.getItems()).filter((i) => i.organizationId === orgId);
  }
  async getItem(id: string): Promise<Item | null> {
    return (await this.getItems()).find((i) => i.id === id) ?? null;
  }
  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    return normaliseItem(await this.createScoped<Item>('items', item));
  }
  async updateItem(id: string, updates: Partial<Item>): Promise<Item> {
    return normaliseItem(await this.updateScoped<Item>('items', id, updates));
  }
  async deleteItem(id: string): Promise<void> {
    return this.deleteScoped('items', id);
  }

  // --- Item events ---

  async getItemEvents(): Promise<ItemEvent[]> {
    return this.listScoped<ItemEvent>('itemEvents');
  }
  async getItemEventsByItem(itemId: string): Promise<ItemEvent[]> {
    return (await this.getItemEvents()).filter((e) => e.itemId === itemId);
  }
  async createItemEvent(event: Omit<ItemEvent, 'id' | 'createdAt'>): Promise<ItemEvent> {
    return this.createScoped<ItemEvent>('itemEvents', event);
  }
  async deleteItemEventsByItem(itemId: string): Promise<void> {
    const events = await this.getItemEventsByItem(itemId);
    await Promise.all(events.map((event) => this.deleteScoped('itemEvents', event.id)));
  }

  // --- Wishlist ---

  async getWishlistEntries(): Promise<WishlistEntry[]> {
    return this.listScoped<WishlistEntry>('wishlistEntries');
  }
  async getWishlistEntry(id: string): Promise<WishlistEntry | null> {
    return (await this.getWishlistEntries()).find((e) => e.id === id) ?? null;
  }
  async createWishlistEntry(
    entry: Omit<WishlistEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WishlistEntry> {
    return this.createScoped<WishlistEntry>('wishlistEntries', entry);
  }
  async updateWishlistEntry(id: string, updates: Partial<WishlistEntry>): Promise<WishlistEntry> {
    return this.updateScoped<WishlistEntry>('wishlistEntries', id, updates);
  }
  async deleteWishlistEntry(id: string): Promise<void> {
    await this.deleteSavingsContributionsByEntry(id);
    return this.deleteScoped('wishlistEntries', id);
  }

  // --- Savings ---

  async getSavingsContributions(): Promise<SavingsContribution[]> {
    return this.listScoped<SavingsContribution>('savingsContributions');
  }
  async getSavingsContributionsByEntry(entryId: string): Promise<SavingsContribution[]> {
    return (await this.getSavingsContributions()).filter((c) => c.wishlistEntryId === entryId);
  }
  async createSavingsContribution(
    contribution: Omit<SavingsContribution, 'id' | 'createdAt'>
  ): Promise<SavingsContribution> {
    return this.createScoped<SavingsContribution>('savingsContributions', contribution);
  }
  async deleteSavingsContributionsByEntry(entryId: string): Promise<void> {
    const rows = await this.getSavingsContributionsByEntry(entryId);
    await Promise.all(rows.map((row) => this.deleteScoped('savingsContributions', row.id)));
  }

  // --- Photos ---

  async getPhotos(): Promise<Photo[]> {
    return this.listScoped<Photo>('photos');
  }
  async getPhotosByItem(itemId: string): Promise<Photo[]> {
    return (await this.getPhotos()).filter((p) => p.itemId === itemId);
  }
  async getPhoto(id: string): Promise<Photo | null> {
    return (await this.getPhotos()).find((p) => p.id === id) ?? null;
  }
  async createPhoto(photo: Omit<Photo, 'id'>): Promise<Photo> {
    return this.createScoped<Photo>('photos', photo);
  }
  async updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo> {
    return this.updateScoped<Photo>('photos', id, updates);
  }
  async deletePhoto(id: string): Promise<void> {
    return this.deleteScoped('photos', id);
  }

  // --- Documents ---

  async getDocuments(): Promise<Document[]> {
    return this.listScoped<Document>('documents');
  }
  async getDocumentsByOrg(orgId: string): Promise<Document[]> {
    return (await this.getDocuments()).filter((d) => d.organizationId === orgId);
  }
  async getDocumentsByItem(itemId: string): Promise<Document[]> {
    return (await this.getDocuments()).filter((d) => d.itemId === itemId);
  }
  async getDocument(id: string): Promise<Document | null> {
    return (await this.getDocuments()).find((d) => d.id === id) ?? null;
  }
  async createDocument(document: Omit<Document, 'id'>): Promise<Document> {
    return this.createScoped<Document>('documents', document);
  }
  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    return this.updateScoped<Document>('documents', id, updates);
  }
  async deleteDocument(id: string): Promise<void> {
    return this.deleteScoped('documents', id);
  }

  // --- Users and roles ---

  async getUsers(): Promise<UserWithAuth[]> {
    const { users } = await this.request<{ users: UserWithAuth[] }>('/api/users');
    return users;
  }
  async getUserById(id: string): Promise<UserWithAuth | null> {
    return (await this.getUsers()).find((u) => u.id === id) ?? null;
  }
  async getUserByEmail(email: string): Promise<UserWithAuth | null> {
    return (await this.getUsers()).find((u) => u.email === email) ?? null;
  }
  async createUser(): Promise<UserWithAuth> {
    // Accounts are created by signing up, not by another account writing a row.
    throw new ApiError(400, 'Accounts are created by signing up.');
  }
  async updateUser(): Promise<UserWithAuth> {
    throw new ApiError(400, 'Accounts are managed through the account settings.');
  }
  async deleteUser(): Promise<void> {
    throw new ApiError(400, 'Accounts are managed through the account settings.');
  }

  /**
   * Never returns credentials.
   *
   * The interface says `UserWithAuth` because the local providers store a
   * password hash alongside the user. The server does not disclose hashes to
   * anyone, so the auth fields come back empty — and nothing in the API tier
   * verifies a password client-side, which is the entire point.
   */
  async getUserWithAuth(id: string): Promise<UserWithAuth | null> {
    const user = await this.getUserById(id);
    if (!user) return null;
    return { ...user, passwordHash: '', passwordSalt: '' };
  }

  async getUserRolesByOrg(orgId: string): Promise<UserRoleAssignment[]> {
    return (await this.getUserRoles()).filter((r) => r.organizationId === orgId);
  }

  async getUserRoles(): Promise<UserRoleAssignment[]> {
    return this.listScoped<UserRoleAssignment>('userRoles');
  }
  async getUserRole(userId: string, organizationId: string): Promise<UserRoleAssignment | null> {
    return (
      (await this.getUserRoles()).find(
        (r) => r.userId === userId && r.organizationId === organizationId
      ) ?? null
    );
  }
  async setUserRole(role: UserRoleAssignment): Promise<UserRoleAssignment> {
    const existing = await this.getUserRole(role.userId, role.organizationId);
    if (existing) {
      return this.updateScoped<UserRoleAssignment>('userRoles', existing.id, { role: role.role });
    }
    return this.createScoped<UserRoleAssignment>('userRoles', role);
  }
  async deleteUserRole(userId: string, organizationId: string): Promise<void> {
    const existing = await this.getUserRole(userId, organizationId);
    if (existing) await this.deleteScoped('userRoles', existing.id);
  }

  // --- Bulk ---

  async replaceCollection<K extends CollectionName>(
    collection: K,
    rows: CollectionRow<K>[]
  ): Promise<void> {
    const org = this.requireOrg();
    await this.request(`/api/orgs/${org}/${COLLECTION_PATHS[collection]}`, {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    });
  }

  async clearAll(): Promise<void> {
    // Deliberately not a single destructive endpoint. Wiping a server-side
    // account should be a considered action in account settings, not something
    // a stray provider call can do.
    throw new ApiError(400, 'Deleting everything is done from account settings.');
  }

  async exportData(): Promise<string> {
    const org = this.requireOrg();
    const [
      organizations,
      locations,
      categories,
      tags,
      items,
      itemEvents,
      wishlistEntries,
      savingsContributions,
      photos,
      documents,
    ] = await Promise.all([
      this.getOrganizations(),
      this.getLocations(),
      this.getCategories(),
      this.getTags(),
      this.getItems(),
      this.getItemEvents(),
      this.getWishlistEntries(),
      this.getSavingsContributions(),
      this.getPhotos(),
      this.getDocuments(),
    ]);

    return JSON.stringify(
      {
        organizations: organizations.filter((o) => o.id === org),
        locations,
        categories,
        tags,
        items,
        itemEvents,
        wishlistEntries,
        savingsContributions,
        photos,
        documents,
      },
      null,
      2
    );
  }

  async importData(data: string): Promise<void> {
    const parsed = JSON.parse(data) as Record<string, unknown[]>;

    // Ordered so referenced records exist before the rows pointing at them.
    const order: CollectionName[] = [
      'locations',
      'categories',
      'tags',
      'items',
      'itemEvents',
      'wishlistEntries',
      'savingsContributions',
      'photos',
      'documents',
    ];

    for (const collection of order) {
      const rows = parsed[collection];
      if (Array.isArray(rows)) {
        await this.replaceCollection(collection, rows as never);
      }
    }
  }
}

/** SQLite has no boolean, so `isArchived` arrives as 0 or 1. */
function normaliseItem(item: Item): Item {
  return { ...item, isArchived: Boolean(item.isArchived), tags: item.tags ?? [] };
}
