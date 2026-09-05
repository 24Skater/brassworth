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
  /**
   * The make and model this item is an instance of, when it has been matched
   * to a gear profile. Specs stay on the profile rather than being copied onto
   * the item, so correcting a spec fixes every item that shares the model.
   */
  gearProfileId?: string;
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

/**
 * Where a gear profile came from.
 *
 * CATALOGUE records are read-only: they ship with the app or come from a
 * catalogue source, and editing one locally would silently fork it and then
 * lose the edit on the next catalogue update. USER records are the
 * organisation's own and are fully editable.
 */
export type GearProfileSource = 'CATALOGUE' | 'USER';

/**
 * One labelled fact about a make and model.
 *
 * Deliberately a label/value pair rather than a typed record with `voltage`,
 * `weight` and so on. A cordless drill, a network switch and a camera body
 * share almost no spec fields, and the roadmap is explicit that this is *one
 * generic* profile feature — a typed record would grow a new optional field for
 * every product type anyone ever added, which is a vendor module wearing a
 * different hat.
 */
export interface GearSpec {
  label: string;
  value: string;
  /** Rendered after the value, e.g. `18` + `V`. */
  unit?: string;
}

/**
 * A make and model described once, reusable by every item that is one.
 *
 * Brand is a string on this record, never a module. That is the whole reason
 * Milwaukee, DeWalt, Makita, Ryobi and Festool all work on day one without the
 * project carrying anyone else's trademark in a directory name.
 */
export interface GearProfile {
  id: string;
  /** Brand as published, e.g. `DeWalt`. Matching normalises it; display does not. */
  brand: string;
  model: string;
  /** What kind of thing it is, e.g. `Cordless drill`. Free text from the catalogue. */
  productType?: string;
  specs: GearSpec[];
  manualUrl?: string;
  partsUrl?: string;
  productUrl?: string;
  source: GearProfileSource;
  /**
   * The licence the record was published under. Catalogue records carry it so
   * the terms travel with the data rather than living only in a README.
   */
  licence?: string;
  /** Which catalogue source supplied it. Absent on USER records. */
  sourceName?: string;
  /** Set only on USER records — catalogue records are not tenant-scoped. */
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}
