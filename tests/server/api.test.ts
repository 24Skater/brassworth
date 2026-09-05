import { describe, it, expect, beforeEach } from 'vitest';
import type { Hono } from 'hono';
import { createApp } from '../../server/app';
import { createDatabase, migrate } from '../../server/db';

/**
 * Integration tests against the real Hono app and a real (in-memory) database.
 *
 * No mocks: these exercise the actual routing, the actual SQL and the actual
 * cookie handling, because the properties being asserted here — tenant
 * isolation, session handling — are exactly the ones a mock would let through.
 */

const PASSWORD = 'correct horse battery staple';

let app: Hono<{ Variables: { viewer: unknown } }>;

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

function cookieFrom(res: Response): string {
  const header = res.headers.get('set-cookie') ?? '';
  return header.split(';')[0] ?? '';
}

async function signUp(email: string): Promise<string> {
  const res = await app.request('/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, name: 'Test User', password: PASSWORD }),
  });
  expect(res.status).toBe(201);
  return cookieFrom(res);
}

async function createOrg(cookie: string, name = 'Workshop'): Promise<string> {
  const res = await app.request('/api/orgs', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ name, type: 'home' }),
  });
  expect(res.status).toBe(201);
  const body = await json(res);
  return (body.organization as { id: string }).id;
}

beforeEach(async () => {
  const { db, client } = createDatabase(':memory:');
  await migrate(client);
  app = createApp({ db }) as never;
});

describe('health', () => {
  it('reports ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true });
  });
});

describe('signup', () => {
  it('creates an account and issues an httpOnly session cookie', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', name: 'A', password: PASSWORD }),
    });

    expect(res.status).toBe(201);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('refuses a password below the minimum length', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', name: 'A', password: 'short' }),
    });

    expect(res.status).toBe(400);
  });

  it('refuses a duplicate address, case-insensitively', async () => {
    await signUp('dupe@example.com');

    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'DUPE@Example.com', name: 'B', password: PASSWORD }),
    });

    expect(res.status).toBe(409);
  });

  it('rejects a malformed body rather than crashing', async () => {
    const res = await app.request('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    });

    expect(res.status).toBe(400);
  });
});

describe('login and session', () => {
  it('signs in with the right password', async () => {
    await signUp('login@example.com');

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: PASSWORD }),
    });

    expect(res.status).toBe(200);
  });

  it('rejects the wrong password', async () => {
    await signUp('login@example.com');

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'wrong but long enough' }),
    });

    expect(res.status).toBe(401);
  });

  it('gives the same answer for an unknown account as a wrong password', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: PASSWORD }),
    });

    expect(res.status).toBe(401);
    expect((await json(res)).error).toBe('Email address or password is incorrect.');
  });

  it('identifies the signed-in user', async () => {
    const cookie = await signUp('me@example.com');

    const res = await app.request('/api/auth/me', { headers: { cookie } });
    expect(res.status).toBe(200);
    expect((await json(res)).user).toMatchObject({ email: 'me@example.com' });
  });

  it('refuses an unauthenticated caller', async () => {
    expect((await app.request('/api/auth/me')).status).toBe(401);
  });

  it('ignores a forged session cookie', async () => {
    const res = await app.request('/api/auth/me', {
      headers: { cookie: 'brassworth_session=made-up-token' },
    });

    expect(res.status).toBe(401);
  });

  it('invalidates the session on logout', async () => {
    const cookie = await signUp('out@example.com');
    expect((await app.request('/api/auth/me', { headers: { cookie } })).status).toBe(200);

    await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } });

    // The very same cookie must now be worthless — this is what an opaque
    // server-side session buys over a JWT.
    expect((await app.request('/api/auth/me', { headers: { cookie } })).status).toBe(401);
  });
});

describe('organisations', () => {
  it('makes the creator an admin of what they created', async () => {
    const cookie = await signUp('owner@example.com');
    await createOrg(cookie);

    const res = await app.request('/api/orgs', { headers: { cookie } });
    const body = await json(res);

    expect(body.organizations).toHaveLength(1);
    expect((body.organizations as Array<{ role: string }>)[0]?.role).toBe('ADMIN');
  });

  it('lists only the caller own organisations', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    await createOrg(alice, 'Alice Workshop');

    const res = await app.request('/api/orgs', { headers: { cookie: bob } });
    expect((await json(res)).organizations).toHaveLength(0);
  });

  it('refuses anonymous creation', async () => {
    const res = await app.request('/api/orgs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });

    expect(res.status).toBe(401);
  });
});

describe('tenant isolation', () => {
  it('lets a member read their own items', async () => {
    const cookie = await signUp('member@example.com');
    const orgId = await createOrg(cookie);

    await app.request(`/api/orgs/${orgId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ name: 'Cordless Drill', brand: 'Milwaukee' }),
    });

    const res = await app.request(`/api/orgs/${orgId}/items`, { headers: { cookie } });
    expect(res.status).toBe(200);
    expect((await json(res)).rows).toHaveLength(1);
  });

  it('hides another account items behind a 404', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    const aliceOrg = await createOrg(alice);

    await app.request(`/api/orgs/${aliceOrg}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: alice },
      body: JSON.stringify({ name: 'Alice Drill' }),
    });

    // 404 rather than 403: Bob should not learn that this organisation exists.
    const res = await app.request(`/api/orgs/${aliceOrg}/items`, { headers: { cookie: bob } });
    expect(res.status).toBe(404);
  });

  it('refuses a write into an organisation the caller does not belong to', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    const aliceOrg = await createOrg(alice);

    const res = await app.request(`/api/orgs/${aliceOrg}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: bob },
      body: JSON.stringify({ name: 'Bob Sneaks In' }),
    });

    expect(res.status).toBe(404);

    const check = await app.request(`/api/orgs/${aliceOrg}/items`, { headers: { cookie: alice } });
    expect((await json(check)).rows).toHaveLength(0);
  });

  it('ignores an organizationId smuggled in the request body', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    const aliceOrg = await createOrg(alice);
    const bobOrg = await createOrg(bob, 'Bob Workshop');

    // Bob posts to his own organisation but claims Alice's in the body.
    await app.request(`/api/orgs/${bobOrg}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: bob },
      body: JSON.stringify({ name: 'Smuggled', organizationId: aliceOrg }),
    });

    const aliceItems = await app.request(`/api/orgs/${aliceOrg}/items`, {
      headers: { cookie: alice },
    });
    expect((await json(aliceItems)).rows).toHaveLength(0);

    const bobItems = await app.request(`/api/orgs/${bobOrg}/items`, { headers: { cookie: bob } });
    expect((await json(bobItems)).rows).toHaveLength(1);
  });

  it('refuses an anonymous read', async () => {
    const cookie = await signUp('member@example.com');
    const orgId = await createOrg(cookie);

    expect((await app.request(`/api/orgs/${orgId}/items`)).status).toBe(401);
  });
});
