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
