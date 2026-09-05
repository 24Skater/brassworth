import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Server schema.
 *
 * Mirrors the domain types in `src/types` so the browser-side providers and the
 * API describe the same things. Ids stay client-generatable UUID strings rather
 * than autoincrementing integers, because records are created offline in the
 * local-only tier and must keep their identity when they are later uploaded.
 *
 * Every tenant-owned table carries `organizationId`. That is what
 * `requireOrgAccess` checks against, and it is the reason multi-tenancy is a
 * guard rather than a rewrite.
 */

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
};

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    /**
     * scrypt output; see server/auth/password.ts. Null for accounts that only
     * ever sign in through an identity provider and therefore have no password
     * to check.
     */
    passwordHash: text('password_hash'),
    ...timestamps,
  },
  (table) => ({
    // Addresses are compared lowercased, so uniqueness must be too.
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
  })
);

export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256 of the token. The token itself is never stored. */
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    byUser: index('sessions_user_idx').on(table.userId),
  })
);

/** Links a provider subject to a local account. */
export const oidcAccounts = sqliteTable(
  'oidc_accounts',
  {
    provider: text('provider').notNull(),
    subject: text('subject').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    // Linking is by subject, never by email alone: an address can change hands.
    unique: uniqueIndex('oidc_accounts_unique').on(table.provider, table.subject),
    byUser: index('oidc_accounts_user_idx').on(table.userId),
  })
);

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('home'),
  address: text('address'),
  ...timestamps,
});

export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** ADMIN | MANAGER | CONTRIBUTOR | VIEWER */
    role: text('role').notNull().default('VIEWER'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    // One membership per user per organisation, enforced by the database rather
    // than by hoping the application never double-inserts.
    unique: uniqueIndex('memberships_user_org_unique').on(table.userId, table.organizationId),
    byOrg: index('memberships_org_idx').on(table.organizationId),
  })
);

export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id'),
    locationId: text('location_id'),
    brand: text('brand'),
    model: text('model'),
    serialNumber: text('serial_number'),
    /**
     * The make and model this item is an instance of.
     *
     * Deliberately *not* a foreign key. The value is either a stored gear
     * profile's id or a catalogue id derived from brand and model, and the
     * catalogue is never written to the database — so a constraint here would
     * reject exactly the links the catalogue exists to create.
     */
    gearProfileId: text('gear_profile_id'),
    purchaseDate: text('purchase_date'),
    purchasePrice: real('purchase_price'),
    currentEstimatedValue: real('current_estimated_value'),
    depreciationMethod: text('depreciation_method'),
    usefulLifeMonths: integer('useful_life_months'),
    declineRatePerYear: real('decline_rate_per_year'),
    salvageValue: real('salvage_value'),
    condition: text('condition').notNull().default('GOOD'),
    quantity: integer('quantity').notNull().default(1),
    notes: text('notes'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    byOrg: index('items_org_idx').on(table.organizationId),
    bySerial: index('items_serial_idx').on(table.serialNumber),
  })
);

export const itemEvents = sqliteTable(
  'item_events',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    occurredAt: text('occurred_at').notNull(),
    note: text('note'),
    counterparty: text('counterparty'),
    expectedBackOn: text('expected_back_on'),
    amount: real('amount'),
    locationId: text('location_id'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    byItem: index('item_events_item_idx').on(table.itemId),
    byOrg: index('item_events_org_idx').on(table.organizationId),
  })
);

/**
 * The remaining tenant-owned collections.
 *
 * Photos carry `organizationId` even though the browser-side `Photo` type does
 * not. Locally an item's photo is scoped by the item it hangs off; over the
 * wire it needs its own tenant column, or the guard would have to join through
 * items on every request just to decide whether the caller may see a row.
 */
export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentLocationId: text('parent_location_id'),
    notes: text('notes'),
  },
  (table) => ({ byOrg: index('locations_org_idx').on(table.organizationId) })
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
  },
  (table) => ({ byOrg: index('categories_org_idx').on(table.organizationId) })
);

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
  },
  (table) => ({ byOrg: index('tags_org_idx').on(table.organizationId) })
);

/** An item's tags. A join table rather than a JSON column, so tags are queryable. */
export const itemTags = sqliteTable(
  'item_tags',
  {
    itemId: text('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull(),
    organizationId: text('organization_id').notNull(),
  },
  (table) => ({
    unique: uniqueIndex('item_tags_unique').on(table.itemId, table.tagId),
    byOrg: index('item_tags_org_idx').on(table.organizationId),
  })
);

export const photos = sqliteTable(
  'photos',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    fileUrl: text('file_url').notNull(),
    caption: text('caption'),
    takenAt: text('taken_at').notNull(),
  },
  (table) => ({
    byItem: index('photos_item_idx').on(table.itemId),
    byOrg: index('photos_org_idx').on(table.organizationId),
  })
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    itemId: text('item_id'),
    type: text('type').notNull().default('OTHER'),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    uploadedAt: text('uploaded_at').notNull(),
  },
  (table) => ({ byOrg: index('documents_org_idx').on(table.organizationId) })
);

/**
 * Role assignments, mirroring the browser-side `UserRoleAssignment`.
 *
 * The authoritative role for authorisation is the one on `memberships`; this
 * table exists so the client-side shape round-trips. They are kept in step when
 * a role is written.
 */
export const userRoles = sqliteTable(
  'user_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
  },
  (table) => ({
    unique: uniqueIndex('user_roles_unique').on(table.userId, table.organizationId),
    byOrg: index('user_roles_org_idx').on(table.organizationId),
  })
);

/** Something wanted but not owned yet. */
export const wishlistEntries = sqliteTable(
  'wishlist_entries',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    brand: text('brand'),
    model: text('model'),
    categoryId: text('category_id'),
    targetPrice: real('target_price'),
    priority: text('priority').notNull().default('MEDIUM'),
    notes: text('notes'),
    url: text('url'),
    purchasedItemId: text('purchased_item_id'),
    purchasedAt: text('purchased_at'),
    ...timestamps,
  },
  (table) => ({ byOrg: index('wishlist_entries_org_idx').on(table.organizationId) })
);

/** Append-only savings log. The total is derived, never stored. */
export const savingsContributions = sqliteTable(
  'savings_contributions',
  {
    id: text('id').primaryKey(),
    wishlistEntryId: text('wishlist_entry_id')
      .notNull()
      .references(() => wishlistEntries.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    occurredAt: text('occurred_at').notNull(),
    note: text('note'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    byEntry: index('savings_entry_idx').on(table.wishlistEntryId),
    byOrg: index('savings_org_idx').on(table.organizationId),
  })
);

/** A price seen for a wishlist entry, manually or from structured data. */
export const priceObservations = sqliteTable(
  'price_observations',
  {
    id: text('id').primaryKey(),
    wishlistEntryId: text('wishlist_entry_id')
      .notNull()
      .references(() => wishlistEntries.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    amount: real('amount').notNull(),
    currency: text('currency'),
    observedAt: text('observed_at').notNull(),
    source: text('source').notNull().default('MANUAL'),
    url: text('url'),
    note: text('note'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => ({
    byEntry: index('price_observations_entry_idx').on(table.wishlistEntryId),
    byOrg: index('price_observations_org_idx').on(table.organizationId),
  })
);

/**
 * A make and model, described once by the organisation itself.
 *
 * Only the organisation's own profiles are stored. The shipped catalogue is
 * read-only data merged in by the client at read time — writing it here would
 * copy the same rows into every tenant and turn a catalogue update into a
 * migration.
 */
export const gearProfiles = sqliteTable(
  'gear_profiles',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    productType: text('product_type'),
    /** A JSON array of {label, value, unit?}. Specs vary by product type, so
     * columns would mean a new column per type — see the note on GearSpec. */
    specs: text('specs').notNull().default('[]'),
    manualUrl: text('manual_url'),
    partsUrl: text('parts_url'),
    productUrl: text('product_url'),
    ...timestamps,
  },
  (table) => ({
    byOrg: index('gear_profiles_org_idx').on(table.organizationId),
    byModel: index('gear_profiles_model_idx').on(table.brand, table.model),
  })
);

export const schema = {
  users,
  sessions,
  oidcAccounts,
  organizations,
  memberships,
  items,
  itemEvents,
  locations,
  categories,
  tags,
  itemTags,
  photos,
  documents,
  userRoles,
  wishlistEntries,
  savingsContributions,
  priceObservations,
  gearProfiles,
};
