import { describe, it, expect } from 'vitest';
import { hashPassword, needsRehash, verifyPassword } from '../../server/auth/password';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  generateSessionToken,
  hashSessionToken,
  isExpired,
  readSessionCookie,
  sessionExpiry,
  SESSION_COOKIE,
} from '../../server/auth/session';
import {
  AccessError,
  requireOrgAccess,
  ROLE_PERMISSIONS,
  roleHasPermission,
  type Role,
} from '../../server/auth/access';
import { ROLE_PERMISSIONS as CLIENT_PERMISSIONS } from '@/lib/auth/permissions';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('Correct horse battery staple', hash)).toBe(false);
  });

  it('salts, so the same password hashes differently every time', async () => {
    const a = await hashPassword('correct horse battery staple');
    const b = await hashPassword('correct horse battery staple');
    expect(a).not.toBe(b);
  });

  it('never stores the password itself', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
  });

  it('records its own parameters, so they can change later', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash.split('$')[0]).toBe('scrypt');
    expect(hash.split('$')).toHaveLength(6);
  });

  it('rejects a malformed stored hash rather than throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
    expect(await verifyPassword('anything', 'scrypt$1$2$3$$')).toBe(false);
  });

  it('rejects a hash from an unknown algorithm', async () => {
    expect(await verifyPassword('anything', 'bcrypt$1$2$3$c2FsdA==$aGFzaA==')).toBe(false);
  });

  it('treats unicode-equivalent passwords as the same', async () => {
    // Composed vs decomposed forms of the same string.
    const hash = await hashPassword('passwordé-is-long');
    expect(await verifyPassword('passwordé-is-long', hash)).toBe(true);
  });

  it('flags a hash with weaker parameters for rehashing', async () => {
    expect(needsRehash('scrypt$1024$8$1$c2FsdA==$aGFzaA==')).toBe(true);
    expect(needsRehash(await hashPassword('correct horse battery staple'))).toBe(false);
  });
});

describe('session tokens', () => {
  it('generates unguessable, unique tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateSessionToken));
    expect(tokens.size).toBe(50);
    expect([...tokens][0]!.length).toBeGreaterThanOrEqual(32);
  });

  it('stores only a hash of the token', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64);
    // Same token always hashes the same, so lookup works.
    expect(hashSessionToken(token)).toBe(hash);
  });

  it('treats a past expiry as expired', () => {
    const now = new Date('2024-06-01T00:00:00.000Z');
    expect(isExpired('2024-01-01T00:00:00.000Z', now)).toBe(true);
    expect(isExpired('2024-12-01T00:00:00.000Z', now)).toBe(false);
  });

  it('treats an unparseable expiry as expired, failing closed', () => {
    expect(isExpired('not a date')).toBe(true);
  });

  it('builds an expiry in the future', () => {
    const from = new Date('2024-01-01T00:00:00.000Z');
    expect(Date.parse(sessionExpiry(from, 24))).toBe(from.getTime() + 24 * 3600 * 1000);
  });
});

describe('session cookie', () => {
  it('is httpOnly and SameSite, so script cannot read it', () => {
    const cookie = buildSessionCookie('abc', { secure: true, maxAgeSeconds: 3600 });

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
  });

  it('omits Secure when not served over HTTPS, or local dev loses its session', () => {
    const cookie = buildSessionCookie('abc', { secure: false, maxAgeSeconds: 3600 });
    expect(cookie).not.toContain('Secure');
  });

  it('clears with an immediate expiry', () => {
    expect(buildClearedSessionCookie(false)).toContain('Max-Age=0');
  });

  it('reads its own cookie back out of a header', () => {
    const header = `other=1; ${SESSION_COOKIE}=the-token; another=2`;
    expect(readSessionCookie(header)).toBe('the-token');
  });

  it('is undefined when absent, empty or headerless', () => {
    expect(readSessionCookie(undefined)).toBeUndefined();
    expect(readSessionCookie('')).toBeUndefined();
    expect(readSessionCookie('other=1')).toBeUndefined();
    expect(readSessionCookie(`${SESSION_COOKIE}=`)).toBeUndefined();
  });
});

describe('permission matrix', () => {
  it('stays in step with the browser copy', () => {
    // The two are deliberately separate modules — one decides what to show, the
    // other decides what is allowed — but they must agree.
    for (const role of Object.keys(ROLE_PERMISSIONS) as Role[]) {
      expect([...ROLE_PERMISSIONS[role]].sort()).toEqual([...CLIENT_PERMISSIONS[role]].sort());
    }
  });

  it('gives only admins the destructive permissions', () => {
    expect(roleHasPermission('ADMIN', 'canDeleteItems')).toBe(true);
    expect(roleHasPermission('MANAGER', 'canDeleteItems')).toBe(false);
    expect(roleHasPermission('CONTRIBUTOR', 'canDeleteItems')).toBe(false);
    expect(roleHasPermission('VIEWER', 'canDeleteItems')).toBe(false);
  });

  it('denies everything to no role at all', () => {
    expect(roleHasPermission(null, 'canViewItems')).toBe(false);
    expect(roleHasPermission(undefined, 'canViewItems')).toBe(false);
  });
});

describe('requireOrgAccess', () => {
  const member = async (_userId: string, _orgId: string): Promise<Role | null> => 'MANAGER';
  const stranger = async (): Promise<Role | null> => null;

  it('returns the role when the member is allowed', async () => {
    await expect(requireOrgAccess(member, 'u1', 'org1', 'canEditItems')).resolves.toBe('MANAGER');
  });

  it('rejects an anonymous caller with 401', async () => {
    await expect(requireOrgAccess(member, null, 'org1', 'canViewItems')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('gives a non-member 404, not 403, so it cannot be used to enumerate', async () => {
    // 403 would confirm the organisation exists to someone with no business
    // knowing that.
    await expect(
      requireOrgAccess(stranger, 'u1', 'secret-org', 'canViewItems')
    ).rejects.toMatchObject({ status: 404 });
  });

  it('gives a member lacking the permission 403', async () => {
    await expect(requireOrgAccess(member, 'u1', 'org1', 'canDeleteItems')).rejects.toMatchObject({
      status: 403,
    });
  });

  it('throws an AccessError the error handler can map to a status', async () => {
    await expect(requireOrgAccess(member, null, 'org1', 'canViewItems')).rejects.toBeInstanceOf(
      AccessError
    );
  });
});
