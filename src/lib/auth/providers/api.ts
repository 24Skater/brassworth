import type { Session, User, UserRole } from '@/types';
import type { AuthProviderInterface, RoleProviderInterface } from '../types';
import { ApiError } from '@/lib/storage/providers/apiProvider';

/**
 * Authentication backed by the Brassworth API.
 *
 * The session is an httpOnly cookie, so there is nothing here that reads or
 * writes a token — the browser attaches it and script cannot touch it. That is
 * the substantive difference from the local tier, where the "session" was a
 * localStorage record anyone could edit.
 *
 * `AuthProviderInterface` has synchronous accessors (`getCurrentUser`,
 * `getSession`, `listUsers`) that a network call cannot satisfy directly, so
 * this provider caches. `validateSession()` is what refreshes the cache, and
 * `AuthContext` already calls it before reading — the shape of the interface
 * happens to fit.
 */

export interface ApiAuthOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class ApiAuthProvider implements AuthProviderInterface {
  private viewer: User | null = null;
  private knownUsers: User[] = [];
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(options: ApiAuthOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
    this.doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.doFetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(response.status, body?.error ?? 'The server rejected that request.');
    }

    return (await response.json()) as T;
  }

  async login(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    try {
      const { user } = await this.request<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      this.viewer = user;
      return { user };
    } catch (error) {
      return { user: null, error: messageFor(error) };
    }
  }

  async signup(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User | null; error?: string }> {
    try {
      const { user } = await this.request<{ user: User }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      this.viewer = user;
      return { user };
    } catch (error) {
      return { user: null, error: messageFor(error) };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      // Clear locally even if the call failed, so the UI cannot keep showing a
      // signed-in state the server has already forgotten.
      this.viewer = null;
      this.knownUsers = [];
    }
  }

  getCurrentUser(): User | null {
    return this.viewer;
  }

  async validateSession(): Promise<boolean> {
    try {
      const { user } = await this.request<{ user: User }>('/api/auth/me');
      this.viewer = user;
      void this.refreshUsers();
      return true;
    } catch {
      this.viewer = null;
      return false;
    }
  }

  async refreshSession(): Promise<boolean> {
    // The server extends nothing on its own; asking who we are is the check.
    return this.validateSession();
  }

  getSession(): Session | null {
    if (!this.viewer) return null;

    // The real session is the httpOnly cookie. This is a shape the existing UI
    // expects, not a credential — deliberately no token in it.
    return {
      userId: this.viewer.id,
      token: '',
      createdAt: '',
      expiresAt: '',
      rememberMe: false,
    };
  }

  listUsers(): User[] {
    return this.knownUsers;
  }

  private async refreshUsers(): Promise<void> {
    try {
      const { users } = await this.request<{ users: User[] }>('/api/users');
      this.knownUsers = users;
    } catch {
      this.knownUsers = [];
    }
  }

  async inviteUser(): Promise<{ user: User | null; error?: string }> {
    // Inviting somebody means emailing them, which needs mail configuration
    // this tier does not have yet. Failing clearly beats pretending.
    return { user: null, error: 'Inviting people is not available yet.' };
  }

  async removeUser(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Removing people is not available yet.' };
  }
}

/**
 * Roles come from the server with the rest of the data.
 *
 * This provider is intentionally read-only and cache-backed: the authoritative
 * role check happens server-side on every request, so anything here is for
 * deciding what to render, never for deciding what is permitted.
 */
export class ApiRoleProvider implements RoleProviderInterface {
  private roles = new Map<string, UserRole>();

  private key(userId: string, organizationId: string): string {
    return `${userId}::${organizationId}`;
  }

  /** Populated from the memberships the API returns. */
  hydrate(assignments: Array<{ userId: string; organizationId: string; role: UserRole }>): void {
    this.roles = new Map(assignments.map((a) => [this.key(a.userId, a.organizationId), a.role]));
  }

  getUserRole(userId: string, organizationId: string): UserRole | null {
    return this.roles.get(this.key(userId, organizationId)) ?? null;
  }

  setUserRole(userId: string, organizationId: string, role: UserRole): void {
    this.roles.set(this.key(userId, organizationId), role);
  }

  removeUserRole(userId: string, organizationId: string): void {
    this.roles.delete(this.key(userId, organizationId));
  }

  getUserRolesInOrg(organizationId: string): Array<{ userId: string; role: UserRole }> {
    const results: Array<{ userId: string; role: UserRole }> = [];
    for (const [key, role] of this.roles) {
      const [userId, org] = key.split('::');
      if (org === organizationId && userId) results.push({ userId, role });
    }
    return results;
  }
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return 'Could not reach the server.';
  return 'Something went wrong.';
}
