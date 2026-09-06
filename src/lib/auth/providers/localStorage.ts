import { User, UserWithAuth, UserRole, Session } from '@/types';
import { AuthProviderInterface, RoleProviderInterface } from '../types';
import { recordFailedAttempt, recordSuccessfulLogin, isLocked } from '../rateLimiter';
import { validatePasswordStrength } from '../passwordValidation';

const STORAGE_KEYS = {
  USERS: 'brassworth_all_users',
  CURRENT_USER: 'brassworth_user',
  USER_ROLES: 'brassworth_user_roles',
  SESSION: 'brassworth_session',
};

// Session configuration (in hours)
// Can be overridden via environment variables
const SESSION_EXPIRY_HOURS_REMEMBER = parseInt(
  import.meta.env.VITE_SESSION_EXPIRY_HOURS_REMEMBER || '720',
  10
); // 30 days if "remember me"
const SESSION_EXPIRY_HOURS_SHORT = parseInt(
  import.meta.env.VITE_SESSION_EXPIRY_HOURS_SHORT || '24',
  10
); // 24 hours if not "remember me"

// PBKDF2 configuration - secure key derivation
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const SALT_LENGTH = 16; // 128 bits

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt(): string {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a password using PBKDF2 with the provided salt
 * This is significantly more secure than plain SHA-256 as it:
 * - Uses a unique salt per user (prevents rainbow table attacks)
 * - Uses key stretching with many iterations (slows down brute force)
 */
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = hexToUint8Array(salt);

  // Import password as a key
  const keyMaterial = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, [
    'deriveBits',
  ]);

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Verify a password against a stored hash and salt
 */
async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const passwordHash = await hashPasswordWithSalt(password, salt);
  // Use timing-safe comparison to prevent timing attacks
  if (passwordHash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < passwordHash.length; i++) {
    result |= passwordHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Legacy hash function for migrating old users (SHA-256 only)
 * @deprecated Use hashPasswordWithSalt instead
 */
async function legacyHashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class LocalStorageAuthProvider implements AuthProviderInterface {
  async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ user: User | null; error?: string }> {
    // Check if account is locked
    const lockStatus = await isLocked(email);
    if (lockStatus.isLocked) {
      return {
        user: null,
        error: `Account locked due to too many failed attempts. Please try again in ${lockStatus.minutesRemaining} minute(s).`,
      };
    }

    const users = this.getAllUsers();
    const userWithAuth = users.find((u) => u.email === email);

    if (!userWithAuth) {
      // The message must match the wrong-password branch exactly, including the
      // attempts counter. A caller that sees a counter for one address and not
      // another can enumerate which accounts exist.
      const attemptResult = await recordFailedAttempt(email);
      return {
        user: null,
        error: `Invalid email or password. ${attemptResult.remainingAttempts} attempt(s) remaining.`,
      };
    }

    let isValid = false;

    // Check if user has salt (new secure format) or needs migration (legacy format)
    if (userWithAuth.passwordSalt) {
      // New secure verification with PBKDF2 + salt
      isValid = await verifyPassword(
        password,
        userWithAuth.passwordHash,
        userWithAuth.passwordSalt
      );
    } else {
      // Legacy verification for users created before salt was added
      const legacyHash = await legacyHashPassword(password);
      isValid = legacyHash === userWithAuth.passwordHash;

      // If legacy password is valid, migrate to new secure format
      if (isValid) {
        await this.migrateUserPassword(userWithAuth, password);
      }
    }

    if (!isValid) {
      // Record failed attempt
      const attemptResult = await recordFailedAttempt(email);
      if (attemptResult.isLocked) {
        return {
          user: null,
          error: `Too many failed attempts. Account locked for ${Math.ceil((attemptResult.lockedUntil! - Date.now()) / 60000)} minute(s).`,
        };
      }
      return {
        user: null,
        error: `Invalid email or password. ${attemptResult.remainingAttempts} attempt(s) remaining.`,
      };
    }

    // Record successful login (clears failed attempts)
    await recordSuccessfulLogin(email);

    const user: User = {
      id: userWithAuth.id,
      email: userWithAuth.email,
      name: userWithAuth.name,
      createdAt: userWithAuth.createdAt,
    };

    // Create session with expiration
    const session = this.createSession(user.id, rememberMe);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    return { user };
  }

  /**
   * Create a new session with expiration
   */
  private createSession(userId: string, rememberMe: boolean): Session {
    const now = new Date();
    const expiryHours = rememberMe ? SESSION_EXPIRY_HOURS_REMEMBER : SESSION_EXPIRY_HOURS_SHORT;
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    return {
      userId,
      token: crypto.randomUUID(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      rememberMe,
    };
  }

  /**
   * Migrate a user from legacy SHA-256 hash to PBKDF2 with salt
   */
  private async migrateUserPassword(user: UserWithAuth, password: string): Promise<void> {
    const salt = generateSalt();
    const newHash = await hashPasswordWithSalt(password, salt);

    const users = this.getAllUsers();
    const userIndex = users.findIndex((u) => u.id === user.id);
    const stored = users[userIndex];
    if (stored) {
      stored.passwordHash = newHash;
      stored.passwordSalt = salt;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  async signup(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User | null; error?: string }> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return {
        user: null,
        error: `Password is too weak. ${passwordValidation.feedback.join('. ')}`,
      };
    }

    const users = this.getAllUsers();

    if (users.some((u) => u.email === email)) {
      return { user: null, error: 'User with this email already exists' };
    }

    // Generate a unique salt and hash with PBKDF2
    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(password, salt);

    const newUser: UserWithAuth = {
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      passwordSalt: salt,
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

    // Create session for new user (remember me by default for signup)
    const session = this.createSession(user.id, true);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    return { user };
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  getCurrentUser(): User | null {
    // Check if session is still valid before returning user
    const session = this.getSession();
    if (!session || this.isSessionExpired(session)) {
      // Clear expired session data
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }

    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get the current session
   */
  getSession(): Session | null {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Check if a session has expired
   */
  private isSessionExpired(session: Session): boolean {
    const expiresAt = new Date(session.expiresAt);
    return expiresAt <= new Date();
  }

  /**
   * Validate the current session
   */
  async validateSession(): Promise<boolean> {
    const session = this.getSession();
    if (!session) return false;

    if (this.isSessionExpired(session)) {
      // Clear expired session
      await this.logout();
      return false;
    }

    return true;
  }

  /**
   * Refresh the current session to extend its expiration
   * Returns true if successful, false if session is invalid/expired
   */
  async refreshSession(): Promise<boolean> {
    const session = this.getSession();
    if (!session) return false;

    // Don't refresh if already expired
    if (this.isSessionExpired(session)) {
      await this.logout();
      return false;
    }

    // Create a new session with refreshed expiration
    const newSession = this.createSession(session.userId, session.rememberMe);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));

    return true;
  }

  listUsers(): User[] {
    return this.getAllUsers().map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
    }));
  }

  async inviteUser(
    email: string,
    name: string,
    organizationId: string,
    role: UserRole
  ): Promise<{ user: User | null; error?: string }> {
    const users = this.getAllUsers();

    if (users.some((u) => u.email === email)) {
      return { user: null, error: 'User with this email already exists' };
    }

    // For prototype: generate a default password (in production, this would send an invite email)
    const defaultPassword = crypto.randomUUID().substring(0, 8);
    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(defaultPassword, salt);

    const newUser: UserWithAuth = {
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash,
      passwordSalt: salt,
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

  async removeUser(
    userId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const users = this.getAllUsers();
    const filteredUsers = users.filter((u) => u.id !== userId);

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
    const userRole = roles.find((r) => r.userId === userId && r.organizationId === organizationId);
    return userRole?.role ?? null;
  }

  setUserRole(userId: string, organizationId: string, role: UserRole): void {
    const roles = this.getAllRoles();
    const existingIndex = roles.findIndex(
      (r) => r.userId === userId && r.organizationId === organizationId
    );

    const existingRole = roles[existingIndex];
    if (existingRole) {
      existingRole.role = role;
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
    const filteredRoles = roles.filter(
      (r) => !(r.userId === userId && r.organizationId === organizationId)
    );
    localStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(filteredRoles));
  }

  getUserRolesInOrg(organizationId: string): Array<{ userId: string; role: UserRole }> {
    const roles = this.getAllRoles();
    return roles
      .filter((r) => r.organizationId === organizationId)
      .map((r) => ({ userId: r.userId, role: r.role }));
  }

  private getAllRoles(): Array<{
    id: string;
    userId: string;
    organizationId: string;
    role: UserRole;
  }> {
    const data = localStorage.getItem(STORAGE_KEYS.USER_ROLES);
    return data ? JSON.parse(data) : [];
  }
}
