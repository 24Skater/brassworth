import * as client from 'openid-client';
import { randomBytes } from 'node:crypto';

/**
 * OpenID Connect sign-in.
 *
 * Uses `openid-client` rather than a hand-rolled flow. Email and password with
 * server-side sessions is a well-trodden pattern worth writing out; OAuth is
 * not — the redirect dance, state, nonce and PKCE all have to be right, and
 * getting one of them wrong is a login bypass rather than a bug.
 *
 * Off unless configured. A self-hoster who wants local accounts only simply
 * does not set these variables, and the routes report themselves unavailable.
 */

export interface OidcSettings {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Shown on the sign-in button, e.g. "Google". */
  label: string;
  /** Stable key for the provider, used when linking accounts. */
  provider: string;
}

export function readOidcSettings(env: NodeJS.ProcessEnv = process.env): OidcSettings | null {
  const issuer = env.OIDC_ISSUER;
  const clientId = env.OIDC_CLIENT_ID;
  const clientSecret = env.OIDC_CLIENT_SECRET;
  const redirectUri = env.OIDC_REDIRECT_URI;

  if (!issuer || !clientId || !clientSecret || !redirectUri) return null;

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    label: env.OIDC_LABEL ?? 'your identity provider',
    provider: env.OIDC_PROVIDER ?? 'oidc',
  };
}

/**
 * The short-lived state of one sign-in attempt.
 *
 * Held in memory deliberately: it lives for the seconds between the redirect
 * out and the redirect back, and a restart losing it just means the person
 * clicks the button again. Putting it in the database would add a table and a
 * cleanup job to store something disposable.
 */
interface PendingLogin {
  codeVerifier: string;
  nonce: string;
  createdAt: number;
}

const PENDING_TTL_MS = 10 * 60 * 1000;

export class LoginAttemptStore {
  private readonly attempts = new Map<string, PendingLogin>();

  create(codeVerifier: string, nonce: string, now = Date.now()): string {
    this.prune(now);
    const state = randomBytes(32).toString('base64url');
    this.attempts.set(state, { codeVerifier, nonce, createdAt: now });
    return state;
  }

  /** Single use: an attempt is consumed whether or not it turns out valid. */
  take(state: string, now = Date.now()): PendingLogin | null {
    this.prune(now);
    const attempt = this.attempts.get(state);
    if (!attempt) return null;

    this.attempts.delete(state);
    if (now - attempt.createdAt > PENDING_TTL_MS) return null;

    return attempt;
  }

  get size(): number {
    return this.attempts.size;
  }

  private prune(now: number): void {
    for (const [state, attempt] of this.attempts) {
      if (now - attempt.createdAt > PENDING_TTL_MS) this.attempts.delete(state);
    }
  }
}

export interface OidcIdentity {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

/** Pull the bits we need out of the token claims, tolerating absent ones. */
export function identityFromClaims(claims: Record<string, unknown>): OidcIdentity {
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;

  return {
    subject: String(claims.sub ?? ''),
    email,
    // Absent means unverified. Some providers send the string "true".
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name:
      (typeof claims.name === 'string' && claims.name) ||
      (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
      null,
  };
}

/**
 * How an identity from the provider maps onto a local account.
 *
 * Linking is by `sub`, never by email alone. An email address can change hands
 * — a provider that does not verify addresses would otherwise let somebody
 * claim an existing account by asserting its address. Auto-linking to an
 * existing account happens only when the provider says the address is verified;
 * otherwise a separate account is created and the two can be merged
 * deliberately later.
 */
export type LinkOutcome =
  | { action: 'existing-link'; userId: string }
  | { action: 'link-to-email'; userId: string }
  | { action: 'create'; email: string | null; name: string | null }
  | { action: 'refuse'; reason: string };

export function decideLink(
  identity: OidcIdentity,
  existingLinkUserId: string | null,
  userIdForEmail: string | null
): LinkOutcome {
  if (!identity.subject) {
    return { action: 'refuse', reason: 'Your identity provider did not identify you.' };
  }

  if (existingLinkUserId) {
    return { action: 'existing-link', userId: existingLinkUserId };
  }

  if (identity.email && userIdForEmail) {
    if (!identity.emailVerified) {
      return {
        action: 'refuse',
        reason:
          'An account already uses that email address, and your identity provider has not verified it.',
      };
    }
    return { action: 'link-to-email', userId: userIdForEmail };
  }

  return { action: 'create', email: identity.email, name: identity.name };
}

/** Discovery is cached: it is a network round-trip that rarely changes. */
let configuration: Promise<client.Configuration> | null = null;

export async function getConfiguration(settings: OidcSettings): Promise<client.Configuration> {
  configuration ??= client.discovery(
    new URL(settings.issuer),
    settings.clientId,
    settings.clientSecret
  );
  return configuration;
}

/** Test seam, so a cached discovery does not leak between cases. */
export function resetConfiguration(): void {
  configuration = null;
}

export interface AuthorizationRequest {
  url: string;
  state: string;
}

export async function buildAuthorizationUrl(
  settings: OidcSettings,
  attempts: LoginAttemptStore
): Promise<AuthorizationRequest> {
  const config = await getConfiguration(settings);

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const nonce = client.randomNonce();
  const state = attempts.create(codeVerifier, nonce);

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: settings.redirectUri,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  return { url: url.href, state };
}
