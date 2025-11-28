import { User, UserWithAuth, UserRole } from '@/types';
import { AuthProviderInterface, RoleProviderInterface } from '../types';

const STORAGE_KEYS = {
  USERS: 'inventory_all_users',
  CURRENT_USER: 'inventory_user',
  USER_ROLES: 'inventory_user_roles',
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export class LocalStorageAuthProvider implements AuthProviderInterface {
  async login(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    const users = this.getAllUsers();
    const userWithAuth = users.find(u => u.email === email);
    
    if (!userWithAuth) {
      return { user: null, error: 'Invalid email or password' };
    }

    const isValid = await verifyPassword(password, userWithAuth.passwordHash);
    if (!isValid) {
      return { user: null, error: 'Invalid email or password' };
    }

    const user: User = {
      id: userWithAuth.id,
      email: userWithAuth.email,
      name: userWithAuth.name,
      createdAt: userWithAuth.createdAt,
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { user };
  }

  async signup(email: string, password: string, name: string): Promise<{ user: User | null; error?: string }> {
    const users = this.getAllUsers();
    
    if (users.some(u => u.email === email)) {
      return { user: null, error: 'User with this email already exists' };
    }

    const passwordHash = await hashPassword(password);
    const newUser: UserWithAuth = {
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { user };
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  async validateSession(): Promise<boolean> {
    return this.getCurrentUser() !== null;
  }

  listUsers(): User[] {
    return this.getAllUsers().map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
    }));
  }

  async inviteUser(email: string, name: string, organizationId: string, role: UserRole): Promise<{ user: User | null; error?: string }> {
    const users = this.getAllUsers();
    
    if (users.some(u => u.email === email)) {
      return { user: null, error: 'User with this email already exists' };
    }

    // For prototype: generate a default password (in production, this would send an invite email)
    const defaultPassword = crypto.randomUUID().substring(0, 8);
    const passwordHash = await hashPassword(defaultPassword);

    const newUser: UserWithAuth = {
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Assign role
    const roleProvider = new LocalStorageRoleProvider();
    roleProvider.setUserRole(newUser.id, organizationId, role);

    const user: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
    };

    return { user };
  }

  async removeUser(userId: string, organizationId: string): Promise<{ success: boolean; error?: string }> {
    const users = this.getAllUsers();
    const filteredUsers = users.filter(u => u.id !== userId);
    
    if (filteredUsers.length === users.length) {
      return { success: false, error: 'User not found' };
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));

    // Remove role
    const roleProvider = new LocalStorageRoleProvider();
    roleProvider.removeUserRole(userId, organizationId);

    return { success: true };
  }

  private getAllUsers(): UserWithAuth[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }
}

export class LocalStorageRoleProvider implements RoleProviderInterface {
  getUserRole(userId: string, organizationId: string): UserRole | null {
    const roles = this.getAllRoles();
    const userRole = roles.find(r => r.userId === userId && r.organizationId === organizationId);
    return userRole?.role ?? null;
  }

  setUserRole(userId: string, organizationId: string, role: UserRole): void {
    const roles = this.getAllRoles();
    const existingIndex = roles.findIndex(r => r.userId === userId && r.organizationId === organizationId);
    
    if (existingIndex >= 0) {
      roles[existingIndex].role = role;
    } else {
      roles.push({
        id: crypto.randomUUID(),
        userId,
        organizationId,
        role,
      });
    }

    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(roles));
  }

  removeUserRole(userId: string, organizationId: string): void {
    const roles = this.getAllRoles();
    const filteredRoles = roles.filter(r => !(r.userId === userId && r.organizationId === organizationId));
    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(filteredRoles));
  }

  getUserRolesInOrg(organizationId: string): Array<{ userId: string; role: UserRole }> {
    const roles = this.getAllRoles();
    return roles
      .filter(r => r.organizationId === organizationId)
      .map(r => ({ userId: r.userId, role: r.role }));
  }

  private getAllRoles(): Array<{ id: string; userId: string; organizationId: string; role: UserRole }> {
    const data = localStorage.getItem(STORAGE_KEYS.USER_ROLES);
    return data ? JSON.parse(data) : [];
  }
}
