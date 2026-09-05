import { z } from 'zod';
import {
  categories,
  documents,
  gearProfiles,
  itemEvents,
  items,
  locations,
  photos,
  priceObservations,
  savingsContributions,
  tags,
  userRoles,
  wishlistEntries,
} from '../db/schema';
import type { Permission } from '../auth/access';

/**
 * The tenant-scoped collections, described once.
 *
 * Every one of these behaves identically over the wire — list, create, update,
 * delete, replace — differing only in its table and its validation. Writing
 * eleven near-identical route sets would multiply the number of places the
 * authorisation guard could be forgotten, which is the one mistake that matters
 * here. One generic router means the guard is applied in exactly one place.
 */

const optionalString = z.string().max(2000).optional().nullable();

const itemSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(300),
  description: optionalString,
  categoryId: optionalString,
  locationId: optionalString,
  brand: optionalString,
  model: optionalString,
  serialNumber: optionalString,
  gearProfileId: optionalString,
  purchaseDate: optionalString,
  purchasePrice: z.number().optional().nullable(),
  currentEstimatedValue: z.number().optional().nullable(),
  depreciationMethod: z
    .enum(['NONE', 'STRAIGHT_LINE', 'DECLINING_BALANCE', 'MANUAL'])
    .optional()
    .nullable(),
  usefulLifeMonths: z.number().int().optional().nullable(),
  declineRatePerYear: z.number().optional().nullable(),
  salvageValue: z.number().optional().nullable(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'DISPOSED']).default('GOOD'),
  quantity: z.number().int().positive().default(1),
  notes: optionalString,
  isArchived: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const itemEventSchema = z.object({
  id: z.string().min(1).optional(),
  itemId: z.string().min(1),
  type: z.enum([
    'ACQUIRED',
    'LOANED_OUT',
    'RETURNED',
    'BROKE',
    'SENT_FOR_REPAIR',
    'REPAIR_COMPLETED',
    'SOLD',
    'LOST',
    'MOVED',
    'VALUE_REASSESSED',
    'NOTE',
  ]),
  occurredAt: z.string().min(1),
  note: optionalString,
  counterparty: optionalString,
  expectedBackOn: optionalString,
  amount: z.number().optional().nullable(),
  locationId: optionalString,
  createdAt: z.string().optional(),
});

const locationSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  parentLocationId: optionalString,
  notes: optionalString,
});

const categorySchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  description: optionalString,
});

const tagSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
});

const photoSchema = z.object({
  id: z.string().min(1).optional(),
  itemId: z.string().min(1),
  fileUrl: z.string().min(1),
  caption: optionalString,
  takenAt: z.string().min(1),
});

const documentSchema = z.object({
  id: z.string().min(1).optional(),
  itemId: optionalString,
  type: z.enum(['RECEIPT', 'WARRANTY', 'APPRAISAL', 'INSURANCE_POLICY', 'OTHER']).default('OTHER'),
  fileName: z.string().min(1).max(500),
  fileUrl: z.string().min(1),
  uploadedAt: z.string().min(1),
});

const wishlistSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(300),
  brand: optionalString,
  model: optionalString,
  categoryId: optionalString,
  targetPrice: z.number().nonnegative().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  notes: optionalString,
  url: optionalString,
  purchasedItemId: optionalString,
  purchasedAt: optionalString,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const savingsSchema = z.object({
  id: z.string().min(1).optional(),
  wishlistEntryId: z.string().min(1),
  // Negative is a withdrawal, so this is deliberately not nonnegative.
  amount: z.number().finite(),
  occurredAt: z.string().min(1),
  note: optionalString,
  createdAt: z.string().optional(),
});

const priceSchema = z.object({
  id: z.string().min(1).optional(),
  wishlistEntryId: z.string().min(1),
  amount: z.number().nonnegative(),
  currency: optionalString,
  observedAt: z.string().min(1),
  source: z.enum(['MANUAL', 'FEED']).default('MANUAL'),
  url: optionalString,
  note: optionalString,
  createdAt: z.string().optional(),
});

const userRoleSchema = z.object({
  id: z.string().min(1).optional(),
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER']),
});

/**
 * A gear profile the organisation wrote itself.
 *
 * `source` is not accepted from the client and `licence` is not stored: every
 * row in this table is a USER record by construction, and letting a request
 * declare otherwise would let somebody mint rows that the UI treats as
 * read-only catalogue data.
 *
 * `specs` arrives as an array and is stored as JSON text, because specs vary by
 * product type — columns would mean a new column per type.
 */
const gearSpecSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(200),
  unit: z.string().trim().max(20).optional(),
});

const gearProfileSchema = z
  .object({
    id: z.string().min(1).optional(),
    brand: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(120),
    productType: z.string().trim().max(120).optional().nullable(),
    specs: z.union([z.array(gearSpecSchema).max(80), z.string()]).optional(),
    manualUrl: optionalString,
    partsUrl: optionalString,
    productUrl: optionalString,
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .transform((profile) => ({
    ...profile,
    specs: typeof profile.specs === 'string' ? profile.specs : JSON.stringify(profile.specs ?? []),
  }));

export interface CollectionSpec {
  table:
    | typeof items
    | typeof itemEvents
    | typeof locations
    | typeof categories
    | typeof tags
    | typeof photos
    | typeof documents
    | typeof userRoles
    | typeof wishlistEntries
    | typeof savingsContributions
    | typeof priceObservations
    | typeof gearProfiles;
  schema: z.ZodType<Record<string, unknown>>;
  /** Permission needed to read. */
  read: Permission;
  /** Permission needed to create, update, replace or delete. */
  write: Permission;
}

export const COLLECTIONS = {
  items: { table: items, schema: itemSchema, read: 'canViewItems', write: 'canAddItems' },
  'item-events': {
    table: itemEvents,
    schema: itemEventSchema,
    read: 'canViewItems',
    write: 'canAddItems',
  },
  locations: {
    table: locations,
    schema: locationSchema,
    read: 'canViewItems',
    write: 'canManageLocations',
  },
  categories: {
    table: categories,
    schema: categorySchema,
    read: 'canViewItems',
    write: 'canManageCategories',
  },
  tags: { table: tags, schema: tagSchema, read: 'canViewItems', write: 'canManageCategories' },
  photos: { table: photos, schema: photoSchema, read: 'canViewItems', write: 'canEditItems' },
  documents: {
    table: documents,
    schema: documentSchema,
    read: 'canViewItems',
    write: 'canEditItems',
  },
  wishlist: {
    table: wishlistEntries,
    schema: wishlistSchema,
    read: 'canViewItems',
    write: 'canAddItems',
  },
  savings: {
    table: savingsContributions,
    schema: savingsSchema,
    read: 'canViewItems',
    write: 'canAddItems',
  },
  prices: {
    table: priceObservations,
    schema: priceSchema,
    read: 'canViewItems',
    write: 'canAddItems',
  },
  'gear-profiles': {
    table: gearProfiles,
    schema: gearProfileSchema,
    read: 'canViewItems',
    write: 'canAddItems',
  },
  'user-roles': {
    table: userRoles,
    schema: userRoleSchema,
    read: 'canViewItems',
    write: 'canManageUsers',
  },
} as const satisfies Record<string, CollectionSpec>;

export type CollectionName = keyof typeof COLLECTIONS;

export function isCollection(value: string): value is CollectionName {
  return Object.prototype.hasOwnProperty.call(COLLECTIONS, value);
}
