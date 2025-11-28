export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type ItemCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'DISPOSED';

export type PurchaseSource = 'STORE' | 'ONLINE' | 'DONATION' | 'OTHER';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
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
  role: UserRole;
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
