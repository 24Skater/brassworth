import { z } from 'zod';
import { storage } from '@/lib/storage';

/**
 * Whole-database backup and restore.
 *
 * This is the escape hatch. Today all data lives in one browser, so clearing
 * site data destroys it; when the backend lands, browser-held data cannot be
 * migrated automatically and export/import is the only path across. Both
 * reasons mean this has to exist before any public release, not after.
 *
 * Backups are a versioned envelope rather than a bare object dump, so a future
 * schema change can migrate an old file instead of rejecting it.
 */

export const BACKUP_FORMAT = 'brassworth.backup';
export const BACKUP_VERSION = 1;

/** Every row we persist carries a string id; the user record is the exception. */
const row = z.object({ id: z.string().min(1) }).passthrough();

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
  exportedAt: z.string().min(1),
  data: z.object({
    user: row.nullable().optional(),
    organizations: z.array(row).default([]),
    memberships: z.array(row).default([]),
    locations: z.array(row).default([]),
    categories: z.array(row).default([]),
    tags: z.array(row).default([]),
    items: z.array(row).default([]),
    itemEvents: z.array(row).default([]),
    wishlistEntries: z.array(row).default([]),
    savingsContributions: z.array(row).default([]),
    priceObservations: z.array(row).default([]),
    gearProfiles: z.array(row).default([]),
    photos: z.array(row).default([]),
    documents: z.array(row).default([]),
    users: z.array(row).default([]),
    userRoles: z.array(row).default([]),
  }),
});

export type Backup = z.infer<typeof backupSchema>;

export interface BackupSummary {
  organizations: number;
  items: number;
  itemEvents: number;
  wishlistEntries: number;
  savingsContributions: number;
  priceObservations: number;
  gearProfiles: number;
  locations: number;
  categories: number;
  tags: number;
  photos: number;
  documents: number;
  users: number;
}

/** Read every collection into a versioned backup envelope. */
export async function createBackup(): Promise<string> {
  const [
    user,
    organizations,
    memberships,
    locations,
    categories,
    tags,
    items,
    itemEvents,
    wishlistEntries,
    savingsContributions,
    priceObservations,
    gearProfiles,
    photos,
    documents,
    users,
    userRoles,
  ] = await Promise.all([
    storage.getUser(),
    storage.getOrganizations(),
    storage.getMemberships(),
    storage.getLocations(),
    storage.getCategories(),
    storage.getTags(),
    storage.getItems(),
    storage.getItemEvents(),
    storage.getWishlistEntries(),
    storage.getSavingsContributions(),
    storage.getPriceObservations(),
    storage.getGearProfiles(),
    storage.getPhotos(),
    storage.getDocuments(),
    storage.getUsers(),
    storage.getUserRoles(),
  ]);

  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      user,
      organizations,
      memberships,
      locations,
      categories,
      tags,
      items,
      itemEvents,
      wishlistEntries,
      savingsContributions,
      priceObservations,
      gearProfiles,
      photos,
      documents,
      users,
      userRoles,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Validate a backup file without writing anything.
 *
 * Restore is destructive, so the caller can show the user what a file contains
 * before they commit to replacing what they already have.
 */
export function parseBackup(json: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    if (
      typeof raw === 'object' &&
      raw !== null &&
      (raw as { format?: unknown }).format !== BACKUP_FORMAT
    ) {
      throw new Error('That file is not a Brassworth backup.');
    }
    throw new Error('That backup file is damaged or incomplete.');
  }

  if (parsed.data.version > BACKUP_VERSION) {
    throw new Error(
      `That backup was made by a newer version of Brassworth (format ${parsed.data.version}). Update before restoring it.`
    );
  }

  return parsed.data;
}

/** Counts for a confirmation prompt, so a restore is never a blind action. */
export function summarise(backup: Backup): BackupSummary {
  const d = backup.data;
  return {
    organizations: d.organizations.length,
    items: d.items.length,
    itemEvents: d.itemEvents.length,
    wishlistEntries: d.wishlistEntries.length,
    savingsContributions: d.savingsContributions.length,
    priceObservations: d.priceObservations.length,
    gearProfiles: d.gearProfiles.length,
    locations: d.locations.length,
    categories: d.categories.length,
    tags: d.tags.length,
    photos: d.photos.length,
    documents: d.documents.length,
    users: d.users.length,
  };
}

/**
 * Replace all stored data with the contents of a backup.
 *
 * Destructive by design — a restore returns the database to a known state
 * rather than merging into it, because merging silently duplicates records
 * that already exist.
 */
export async function restoreBackup(json: string): Promise<BackupSummary> {
  const backup = parseBackup(json);
  const d = backup.data;

  await storage.clearAll();

  // Ordered so that referenced records exist before the rows pointing at them.
  await storage.setOrganizations(d.organizations as never);
  await storage.setMemberships(d.memberships as never);
  await storage.setLocations(d.locations as never);
  await storage.setCategories(d.categories as never);
  await storage.setTags(d.tags as never);
  // Gear profiles before items: an item may name the profile it is an instance of.
  await storage.setGearProfiles(d.gearProfiles as never);
  await storage.setItems(d.items as never);
  await storage.setItemEvents(d.itemEvents as never);
  await storage.setWishlistEntries(d.wishlistEntries as never);
  await storage.setSavingsContributions(d.savingsContributions as never);
  await storage.setPriceObservations(d.priceObservations as never);
  await storage.setPhotos(d.photos as never);
  await storage.setDocuments(d.documents as never);
  await storage.setUsers(d.users as never);
  await storage.setUserRoles(d.userRoles as never);

  if (d.user) {
    await storage.setUser(d.user as never);
  }

  return summarise(backup);
}

/** e.g. brassworth-backup-2026-09-05.json */
export function backupFileName(date = new Date()): string {
  return `brassworth-backup-${date.toISOString().split('T')[0]}.json`;
}
