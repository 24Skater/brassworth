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
    /** scrypt output; see server/auth/password.ts for the format. */
    passwordHash: text('password_hash').notNull(),
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

export const schema = {
  users,
  sessions,
  organizations,
  memberships,
  items,
  itemEvents,
};
