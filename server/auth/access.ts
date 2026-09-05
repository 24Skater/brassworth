export type Role = 'ADMIN' | 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';

export type Permission =
  | 'canViewItems'
  | 'canAddItems'
  | 'canEditItems'
  | 'canDeleteItems'
  | 'canArchiveItems'
  | 'canManageLocations'
  | 'canManageCategories'
  | 'canManageUsers'
  | 'canManageOrganization'
  | 'canExportData';

/**
 * The permission matrix, mirroring `src/lib/auth/permissions.ts`.
 *
 * Deliberately duplicated rather than imported. The browser copy decides what
 * to *show*; this copy decides what is *allowed*. Sharing one module would
 * invite the assumption that a client-side check is a control, which is exactly
 * the mistake the local-only tier made. There is a test asserting the two stay
 * in step.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
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
  CONTRIBUTOR: ['canViewItems', 'canAddItems'],
  VIEWER: ['canViewItems', 'canExportData'],
};

export function roleHasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isRole(value: unknown): value is Role {
  return value === 'ADMIN' || value === 'MANAGER' || value === 'CONTRIBUTOR' || value === 'VIEWER';
}

export class AccessError extends Error {
  constructor(
    readonly status: 401 | 403 | 404,
    message: string
  ) {
    super(message);
    this.name = 'AccessError';
  }
}

export interface MembershipLookup {
  (userId: string, organizationId: string): Promise<Role | null>;
}

/**
 * The single gate every tenant-scoped handler goes through.
 *
 * A client-supplied `organizationId` is never trusted. Membership is looked up
 * server-side and the role is checked against the permission being attempted.
 *
 * A non-member gets 404, not 403. Telling a stranger "that organisation exists,
 * you just cannot see it" leaks which organisations exist; a member who lacks
 * the specific permission gets 403, because they already know it exists.
 */
export async function requireOrgAccess(
  lookup: MembershipLookup,
  userId: string | null | undefined,
  organizationId: string,
  permission: Permission
): Promise<Role> {
  if (!userId) {
    throw new AccessError(401, 'Sign in to continue.');
  }

  const role = await lookup(userId, organizationId);
  if (!role) {
    throw new AccessError(404, 'That property does not exist.');
  }

  if (!roleHasPermission(role, permission)) {
    throw new AccessError(403, 'Your role does not allow that.');
  }

  return role;
}
