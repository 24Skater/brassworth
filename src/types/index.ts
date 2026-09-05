export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER' | 'CONTRIBUTOR';

export type ItemCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'DISPOSED';

export type PurchaseSource = 'STORE' | 'ONLINE' | 'DONATION' | 'OTHER';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserWithAuth extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface Session {
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  rememberMe: boolean;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
}

export interface Organization {
  id: string;
  name: string;
  type: 'home' | 'church' | 'small_business' | 'other';
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  parentLocationId?: string;
  notes?: string;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
}

export interface Tag {
  id: string;
  organizationId: string;
  name: string;
}

export interface Item {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentEstimatedValue?: number;
  /** How to estimate current value. Defaults to NONE. */
  depreciationMethod?: DepreciationMethod;
  /** Straight line: months from purchase until it reaches salvage value. */
  usefulLifeMonths?: number;
  /** Declining balance: share of remaining value lost each year, 0-1. */
  declineRatePerYear?: number;
  /** The floor an item does not depreciate below. */
  salvageValue?: number;
  purchaseLocation?: PurchaseSource;
  purchaseSourceName?: string;
  condition: ItemCondition;
  quantity: number;
  notes?: string;
  isArchived: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * How an item's current value is estimated.
 *
 * Deliberately not a separate `Valuation` collection. The roadmap sketched one,
 * but these settings are strictly one-to-one with an item and have no lifecycle
 * of their own — a separate table would buy nothing and cost a join, a
 * migration and a second write path.
 *
 * MARKET_COMPARABLE is also absent: with no price data source behind it, it
 * would produce a number that looks authoritative and is invented.
 */
export type DepreciationMethod = 'NONE' | 'STRAIGHT_LINE' | 'DECLINING_BALANCE' | 'MANUAL';

/**
 * Where an item is in its life. Deliberately separate from `ItemCondition` —
 * a drill can be in GOOD condition *and* lent to someone. They are independent
 * axes and conflating them is why the original model could not express a loan.
 */
export type ItemStatus = 'IN_POSSESSION' | 'LOANED' | 'IN_REPAIR' | 'BROKEN' | 'SOLD' | 'LOST';

export type ItemEventType =
  | 'ACQUIRED'
  | 'LOANED_OUT'
  | 'RETURNED'
  | 'BROKE'
  | 'SENT_FOR_REPAIR'
  | 'REPAIR_COMPLETED'
  | 'SOLD'
  | 'LOST'
  | 'MOVED'
  | 'VALUE_REASSESSED'
  | 'NOTE';

/**
 * An append-only record of something that happened to an item.
 *
 * The log is the source of truth; status and custody are derived from it. That
 * is what makes "what happened to this thing" answerable at all, and it means a
 * mistake is corrected by appending a further event rather than by rewriting
 * history.
 */
export interface ItemEvent {
  id: string;
  itemId: string;
  organizationId: string;
  type: ItemEventType;
  /** When it happened in the real world, which is not always when it was recorded. */
  occurredAt: string;
  note?: string;

  /** Who borrowed it, who is repairing it, or who bought it. */
  counterparty?: string;
  /** For loans and repairs. */
  expectedBackOn?: string;
  /** Purchase price, repair cost, or sale price, depending on the event type. */
  amount?: number;
  /** For MOVED. */
  locationId?: string;

  createdAt: string;
}

export type WishlistPriority = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Something you want but do not own yet.
 *
 * A separate entity rather than an `Item` in a special state. A wishlist entry
 * has no serial number, no condition and no location; modelling it as an item
 * would mean every exhaustive check over owned gear carrying a case that is not
 * gear. On purchase it converts into a real item and keeps a pointer back.
 */
export interface WishlistEntry {
  id: string;
  organizationId: string;
  name: string;
  brand?: string;
  model?: string;
  categoryId?: string;
  /** What you are willing to pay. Also the alert threshold for price watches. */
  targetPrice?: number;
  priority: WishlistPriority;
  notes?: string;
  /** Where you saw it. */
  url?: string;
  /** Set once the entry has become an owned item. */
  purchasedItemId?: string;
  purchasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Money put aside towards a wishlist entry.
 *
 * An append-only log, like `ItemEvent`, rather than a running `savedAmount`
 * field. The total is derived. That keeps one source of truth, makes "where did
 * this number come from" answerable, and means a correction is another row
 * rather than an edit. A negative amount is a withdrawal.
 */
export interface SavingsContribution {
  id: string;
  wishlistEntryId: string;
  organizationId: string;
  amount: number;
  occurredAt: string;
  note?: string;
  createdAt: string;
}

/** Where a price came from. */
export type PriceSource = 'MANUAL' | 'FEED';

/**
 * A price seen at a point in time.
 *
 * Append-only, like every other history in this app. Prices move, and the
 * useful questions — is it cheaper than last month, is it below what I am
 * willing to pay, what is the lowest it has ever been — need the series, not
 * the latest value overwritten in place.
 */
export interface PriceObservation {
  id: string;
  wishlistEntryId: string;
  organizationId: string;
  amount: number;
  currency?: string;
  observedAt: string;
  source: PriceSource;
  url?: string;
  note?: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  itemId: string;
  fileUrl: string;
  caption?: string;
  takenAt: string;
}

export interface Document {
  id: string;
  organizationId: string;
  itemId?: string;
  type: 'RECEIPT' | 'WARRANTY' | 'APPRAISAL' | 'INSURANCE_POLICY' | 'OTHER';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}
