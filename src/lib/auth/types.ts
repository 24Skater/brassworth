import { User, UserRole, Session } from '@/types';

export interface AuthProviderInterface {
  login(
    email: string,
    password: string,
    rememberMe?: boolean
  ): Promise<{ user: User | null; error?: string }>;
  signup(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User | null; error?: string }>;
  logout(): Promise<void>;
  getCurrentUser(): User | null;
  validateSession(): Promise<boolean>;
  refreshSession(): Promise<boolean>;
  getSession(): Session | null;
  listUsers(): User[];
  inviteUser(
    email: string,
    name: string,
    organizationId: string,
    role: UserRole
  ): Promise<{ user: User | null; error?: string }>;
  removeUser(userId: string, organizationId: string): Promise<{ success: boolean; error?: string }>;
}

export interface RoleProviderInterface {
  getUserRole(userId: string, organizationId: string): UserRole | null;
  setUserRole(userId: string, organizationId: string, role: UserRole): void;
  removeUserRole(userId: string, organizationId: string): void;
  getUserRolesInOrg(organizationId: string): Array<{ userId: string; role: UserRole }>;
}

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
