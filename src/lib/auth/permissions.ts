import { UserRole } from '@/types';
import type { Permission } from './types';

export type { Permission };

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'canViewItems',
    'canAddItems',
    'canEditItems',
    'canDeleteItems',
    'canArchiveItems',
    'canManageLocations',
    'canManageCategories',
    'canManageUsers',
    'canManageOrganization',
    'canExportData',
  ],
  MANAGER: [
    'canViewItems',
    'canAddItems',
    'canEditItems',
    'canArchiveItems',
    'canManageLocations',
    'canManageCategories',
    'canExportData',
  ],
  VIEWER: [
    'canViewItems',
    'canExportData',
  ],
  CONTRIBUTOR: [
    'canViewItems',
    'canAddItems',
  ],
};

export function hasPermission(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    VIEWER: 'Viewer',
    CONTRIBUTOR: 'Contributor',
  };
  return labels[role];
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    ADMIN: 'Full control - manage users, delete items, edit settings',
    MANAGER: 'Edit access - add/edit/archive items, manage locations & categories',
    VIEWER: 'Read-only - view items and export data',
    CONTRIBUTOR: 'Add items only - create items and upload photos',
  };
  return descriptions[role];
}
