import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { schema } from './schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * libSQL rather than better-sqlite3.
 *
 * Both speak SQLite. better-sqlite3 is a native module that has to compile or
 * find a prebuilt binary, which is a support burden for a project whose pitch
 * is that self-hosting is easy. libSQL ships prebuilt everywhere and takes the
 * same file URL, so `docker compose up` stays a single step.
 *
 * DATABASE_URL selects the target: file:./data/brassworth.db by default,
 * :memory: in tests, or a libsql:// URL for a hosted deployment.
 */
export function createDatabase(url = process.env.DATABASE_URL ?? 'file:./data/brassworth.db'): {
  db: Database;
  client: Client;
} {
  const client = createClient({ url });
  const db = drizzle(client, { schema });
  return { db, client };
}

/**
 * Create the tables.
 *
 * Hand-written rather than generated, so the first release does not depend on
 * drizzle-kit being present at runtime. Once the schema starts changing under
 * real users this becomes a migrations directory.
 */
export async function migrate(client: Client): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
    `CREATE TABLE IF NOT EXISTS oidc_accounts (
      provider TEXT NOT NULL,
      subject TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS oidc_accounts_unique ON oidc_accounts (provider, subject)`,
    `CREATE INDEX IF NOT EXISTS oidc_accounts_user_idx ON oidc_accounts (user_id)`,
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'home',
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_org_unique ON memberships (user_id, organization_id)`,
    `CREATE INDEX IF NOT EXISTS memberships_org_idx ON memberships (organization_id)`,
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      location_id TEXT,
      brand TEXT,
      model TEXT,
      serial_number TEXT,
      gear_profile_id TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      current_estimated_value REAL,
      depreciation_method TEXT,
      useful_life_months INTEGER,
      decline_rate_per_year REAL,
      salvage_value REAL,
      condition TEXT NOT NULL DEFAULT 'GOOD',
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS items_org_idx ON items (organization_id)`,
    `CREATE INDEX IF NOT EXISTS items_serial_idx ON items (serial_number)`,
    `CREATE TABLE IF NOT EXISTS item_events (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      note TEXT,
      counterparty TEXT,
      expected_back_on TEXT,
      amount REAL,
      location_id TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS item_events_item_idx ON item_events (item_id)`,
    `CREATE INDEX IF NOT EXISTS item_events_org_idx ON item_events (organization_id)`,
    `CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      parent_location_id TEXT,
      notes TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS locations_org_idx ON locations (organization_id)`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS categories_org_idx ON categories (organization_id)`,
    `CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS tags_org_idx ON tags (organization_id)`,
    `CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL,
      organization_id TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS item_tags_unique ON item_tags (item_id, tag_id)`,
    `CREATE INDEX IF NOT EXISTS item_tags_org_idx ON item_tags (organization_id)`,
    `CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      caption TEXT,
      taken_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS photos_item_idx ON photos (item_id)`,
    `CREATE INDEX IF NOT EXISTS photos_org_idx ON photos (organization_id)`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      item_id TEXT,
      type TEXT NOT NULL DEFAULT 'OTHER',
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS documents_org_idx ON documents (organization_id)`,
    `CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique ON user_roles (user_id, organization_id)`,
    `CREATE INDEX IF NOT EXISTS user_roles_org_idx ON user_roles (organization_id)`,
    `CREATE TABLE IF NOT EXISTS wishlist_entries (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      category_id TEXT,
      target_price REAL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      notes TEXT,
      url TEXT,
      purchased_item_id TEXT,
      purchased_at TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS wishlist_entries_org_idx ON wishlist_entries (organization_id)`,
    `CREATE TABLE IF NOT EXISTS savings_contributions (
      id TEXT PRIMARY KEY,
      wishlist_entry_id TEXT NOT NULL REFERENCES wishlist_entries(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      occurred_at TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS savings_entry_idx ON savings_contributions (wishlist_entry_id)`,
    `CREATE INDEX IF NOT EXISTS savings_org_idx ON savings_contributions (organization_id)`,
    `CREATE TABLE IF NOT EXISTS price_observations (
      id TEXT PRIMARY KEY,
      wishlist_entry_id TEXT NOT NULL REFERENCES wishlist_entries(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      currency TEXT,
      observed_at TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'MANUAL',
      url TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS price_observations_entry_idx ON price_observations (wishlist_entry_id)`,
    `CREATE INDEX IF NOT EXISTS price_observations_org_idx ON price_observations (organization_id)`,
    `CREATE TABLE IF NOT EXISTS gear_profiles (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      product_type TEXT,
      specs TEXT NOT NULL DEFAULT '[]',
      manual_url TEXT,
      parts_url TEXT,
      product_url TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS gear_profiles_org_idx ON gear_profiles (organization_id)`,
    `CREATE INDEX IF NOT EXISTS gear_profiles_model_idx ON gear_profiles (brand, model)`,
  ];

  // Foreign keys are off by default in SQLite; the cascades above depend on it.
  await client.execute('PRAGMA foreign_keys = ON');
  for (const statement of statements) {
    await client.execute(statement);
  }

  // `CREATE TABLE IF NOT EXISTS` does nothing to a table that already exists,
  // so a database created before this column existed would never gain it.
  await addColumnIfMissing(client, 'items', 'gear_profile_id', 'TEXT');
}

/**
 * Add a column only when it is not already there.
 *
 * SQLite has no `ADD COLUMN IF NOT EXISTS`, and running the ALTER twice is an
 * error rather than a no-op — so the column list is read first. This is what
 * stands in for a migrations directory until the schema starts changing often
 * enough to need one.
 */
async function addColumnIfMissing(
  client: Client,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const present = info.rows.some((row) => row.name === column);
  if (present) return;

  await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
