import { describe, it, expect, beforeEach } from 'vitest';
import {
  LoginAttemptStore,
  decideLink,
  identityFromClaims,
  readOidcSettings,
  type OidcIdentity,
} from '../../server/auth/oidc';
import { createApp } from '../../server/app';
import { createDatabase, migrate } from '../../server/db';

describe('readOidcSettings', () => {
  const complete = {
    OIDC_ISSUER: 'https://accounts.example.com',
    OIDC_CLIENT_ID: 'client',
    OIDC_CLIENT_SECRET: 'secret',
    OIDC_REDIRECT_URI: 'https://app.example.com/api/auth/oidc/callback',
  };

  it('is null when nothing is configured, so sign-on stays off by default', () => {
    expect(readOidcSettings({})).toBeNull();
  });

  it('is null when only some of it is configured', () => {
    // Half-configured is a misconfiguration, not a feature to half-enable.
    for (const key of Object.keys(complete)) {
      const partial = { ...complete } as Record<string, string>;
      delete partial[key];
      expect(readOidcSettings(partial)).toBeNull();
    }
  });

  it('reads a complete configuration', () => {
    const settings = readOidcSettings(complete);
    expect(settings?.issuer).toBe('https://accounts.example.com');
    expect(settings?.provider).toBe('oidc');
  });

  it('takes a label and provider key when given them', () => {
    const settings = readOidcSettings({
      ...complete,
      OIDC_LABEL: 'Google',
      OIDC_PROVIDER: 'google',
    });

    expect(settings?.label).toBe('Google');
    expect(settings?.provider).toBe('google');
  });
});

describe('identityFromClaims', () => {
  it('reads subject, email and name', () => {
    const identity = identityFromClaims({
      sub: 'abc123',
      email: 'Person@Example.com',
      email_verified: true,
      name: 'A Person',
    });

    expect(identity.subject).toBe('abc123');
    // Compared lowercased, like every other address in the system.
    expect(identity.email).toBe('person@example.com');
    expect(identity.emailVerified).toBe(true);
    expect(identity.name).toBe('A Person');
  });

  it('treats an absent email_verified as unverified', () => {
    expect(identityFromClaims({ sub: 'x', email: 'a@b.com' }).emailVerified).toBe(false);
  });

  it('accepts the string "true", which some providers send', () => {
    expect(identityFromClaims({ sub: 'x', email_verified: 'true' }).emailVerified).toBe(true);
  });

  it('does not accept other truthy-looking values', () => {
    expect(identityFromClaims({ sub: 'x', email_verified: 'yes' }).emailVerified).toBe(false);
    expect(identityFromClaims({ sub: 'x', email_verified: 1 }).emailVerified).toBe(false);
  });

  it('falls back to preferred_username for a name', () => {
    expect(identityFromClaims({ sub: 'x', preferred_username: 'pers' }).name).toBe('pers');
  });

  it('copes with a provider that sends almost nothing', () => {
    const identity = identityFromClaims({ sub: 'x' });
    expect(identity.email).toBeNull();
    expect(identity.name).toBeNull();
  });
});

describe('decideLink', () => {
  const identity = (overrides: Partial<OidcIdentity> = {}): OidcIdentity => ({
    subject: 'sub-1',
    email: 'person@example.com',
    emailVerified: true,
    name: 'A Person',
    ...overrides,
  });

  it('uses an existing link, ignoring the email entirely', () => {
    // The subject is the identity. An address change must not orphan an account.
    const outcome = decideLink(identity({ email: 'changed@example.com' }), 'user-1', 'user-2');
    expect(outcome).toEqual({ action: 'existing-link', userId: 'user-1' });
  });

  it('links to an existing account when the provider verified the address', () => {
    expect(decideLink(identity(), null, 'user-2')).toEqual({
      action: 'link-to-email',
      userId: 'user-2',
    });
  });

  it('REFUSES to link to an existing account on an unverified address', () => {
    // This is the account-takeover case: a provider that lets anyone claim any
    // address would otherwise hand over somebody else's account.
    const outcome = decideLink(identity({ emailVerified: false }), null, 'victim');

    expect(outcome.action).toBe('refuse');
    expect(outcome).toMatchObject({ reason: expect.stringContaining('not verified') });
  });

  it('creates an account when the address is new', () => {
    expect(decideLink(identity(), null, null)).toEqual({
      action: 'create',
      email: 'person@example.com',
      name: 'A Person',
    });
  });

  it('creates an account when the provider sends no address at all', () => {
    const outcome = decideLink(identity({ email: null }), null, null);
    expect(outcome).toMatchObject({ action: 'create', email: null });
  });

  it('refuses an identity with no subject', () => {
    expect(decideLink(identity({ subject: '' }), null, null).action).toBe('refuse');
  });
});

describe('LoginAttemptStore', () => {
  let store: LoginAttemptStore;

  beforeEach(() => {
    store = new LoginAttemptStore();
  });

  it('round-trips one attempt', () => {
    const state = store.create('verifier', 'nonce');
    expect(store.take(state)).toMatchObject({ codeVerifier: 'verifier', nonce: 'nonce' });
  });

  it('issues unguessable, unique state values', () => {
    const states = new Set(Array.from({ length: 40 }, () => store.create('v', 'n')));
    expect(states.size).toBe(40);
    expect([...states][0]!.length).toBeGreaterThanOrEqual(32);
  });

  it('consumes an attempt, so a state cannot be replayed', () => {
    const state = store.create('verifier', 'nonce');
    expect(store.take(state)).not.toBeNull();
    expect(store.take(state)).toBeNull();
  });

  it('returns nothing for a state it never issued', () => {
    expect(store.take('invented')).toBeNull();
  });

  it('expires an attempt that was never completed', () => {
    const start = 1_000_000;
    const state = store.create('verifier', 'nonce', start);

    expect(store.take(state, start + 11 * 60 * 1000)).toBeNull();
  });

  it('does not accumulate abandoned attempts', () => {
    const start = 1_000_000;
    for (let i = 0; i < 5; i += 1) store.create('v', 'n', start);
    expect(store.size).toBe(5);

    // Creating later prunes what has gone stale.
    store.create('v', 'n', start + 11 * 60 * 1000);
    expect(store.size).toBe(1);
  });
});

describe('OIDC routes when not configured', () => {
  it('reports itself disabled and refuses to start a flow', async () => {
    const { db, client } = createDatabase(':memory:');
    await migrate(client);
    // Explicit null, so the ambient environment cannot switch this on.
    const app = createApp({ db, oidc: null });

    const status = await app.request('/api/auth/oidc/status');
    expect(await status.json()).toEqual({ enabled: false });

    expect((await app.request('/api/auth/oidc/start')).status).toBe(404);
    expect((await app.request('/api/auth/oidc/callback?state=x&code=y')).status).toBe(404);
  });

  it('advertises its label when configured', async () => {
    const { db, client } = createDatabase(':memory:');
    await migrate(client);
    const app = createApp({
      db,
      oidc: {
        issuer: 'https://accounts.example.com',
        clientId: 'c',
        clientSecret: 's',
        redirectUri: 'https://app.example.com/cb',
        label: 'Google',
        provider: 'google',
      },
    });

    expect(await (await app.request('/api/auth/oidc/status')).json()).toEqual({
      enabled: true,
      label: 'Google',
    });
  });

  it('rejects a callback with an unknown state before talking to the provider', async () => {
    const { db, client } = createDatabase(':memory:');
    await migrate(client);
    const app = createApp({
      db,
      oidc: {
        issuer: 'https://accounts.example.com',
        clientId: 'c',
        clientSecret: 's',
        redirectUri: 'https://app.example.com/cb',
        label: 'Google',
        provider: 'google',
      },
    });

    const res = await app.request('/api/auth/oidc/callback?state=never-issued&code=x');
    expect(res.status).toBe(400);
  });
});

describe('password login against a provider-only account', () => {
  it('says the account uses an identity provider rather than "wrong password"', async () => {
    const { db, client } = createDatabase(':memory:');
    await migrate(client);
    const app = createApp({ db, oidc: null });

    // An account with no password, as the OIDC callback creates.
    await client.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, NULL)',
      args: ['u1', 'sso@example.com', 'SSO User'],
    });

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'sso@example.com', password: 'anything long enough' }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/identity provider/i);
  });
});
