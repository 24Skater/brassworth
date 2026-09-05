import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Session tokens.
 *
 * Opaque random tokens, not JWTs. A JWT cannot be revoked without keeping a
 * denylist, which is the very database round-trip a JWT is supposed to avoid —
 * so it buys nothing here and costs the ability to log someone out.
 *
 * Only the SHA-256 of a token is stored. A leaked database therefore does not
 * hand over usable sessions. SHA-256 is right here and scrypt would be wrong:
 * the token is 256 bits of entropy we generated, not a guessable secret a human
 * chose, so there is nothing to slow an attacker down over.
 */

const TOKEN_BYTES = 32;

export const SESSION_COOKIE = 'brassworth_session';

/** Default session lifetime, overridable by the deployment. */
export const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS ?? 24 * 7);

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry(from: Date = new Date(), hours = SESSION_TTL_HOURS): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  const at = Date.parse(expiresAt);
  return !Number.isFinite(at) || at <= now.getTime();
}

/** Constant-time comparison for two hex digests of equal length. */
export function tokenHashMatches(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export interface CookieOptions {
  secure: boolean;
  maxAgeSeconds: number;
}

/**
 * Session cookie attributes.
 *
 * httpOnly so script cannot read it — the single most important difference from
 * the localStorage tier, where any injected script could take the session.
 * SameSite=Lax blocks the cross-site form-post shape of CSRF while leaving
 * ordinary top-level navigation working.
 */
export function buildSessionCookie(token: string, options: CookieOptions): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${options.maxAgeSeconds}`,
  ];
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearedSessionCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Pull the session token out of a Cookie header. */
export function readSessionCookie(header: string | undefined | null): string | undefined {
  if (!header) return undefined;

  for (const chunk of header.split(';')) {
    const [name, ...rest] = chunk.trim().split('=');
    if (name === SESSION_COOKIE) {
      const value = rest.join('=');
      return value.length > 0 ? value : undefined;
    }
  }

  return undefined;
}
