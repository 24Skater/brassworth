import { z } from 'zod';
import {
  categories,
  documents,
  itemEvents,
  items,
  locations,
  photos,
  tags,
  userRoles,
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

const userRoleSchema = z.object({
  id: z.string().min(1).optional(),
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER']),
});

export interface CollectionSpec {
  table:
    | typeof items
    | typeof itemEvents
    | typeof locations
    | typeof categories
    | typeof tags
    | typeof photos
    | typeof documents
    | typeof userRoles;
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
