import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { Database } from './db';
import { memberships, organizations, sessions, users } from './db/schema';
import { hashPassword, verifyPassword } from './auth/password';
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  generateSessionToken,
  hashSessionToken,
  isExpired,
  readSessionCookie,
  sessionExpiry,
  SESSION_TTL_HOURS,
} from './auth/session';
import { AccessError, isRole, requireOrgAccess, type Role } from './auth/access';
import { COLLECTIONS, isCollection } from './routes/collections';

export interface AppOptions {
  db: Database;
  /** Cookies are only marked Secure when the deployment is actually on HTTPS. */
  secureCookies?: boolean;
}

interface Viewer {
  id: string;
  email: string;
  name: string;
}

type Env = { Variables: { viewer: Viewer | null } };

const credentials = z.object({
  email: z.string().trim().min(3).max(320).email(),
  password: z.string().min(12).max(1024),
});

const signup = credentials.extend({
  name: z.string().trim().min(1).max(200),
});

const orgInput = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(['home', 'church', 'small_business', 'other']).default('home'),
  address: z.string().trim().max(500).optional(),
});

const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function createApp({ db, secureCookies = false }: AppOptions) {
  const app = new Hono<Env>();

  const lookupRole = async (userId: string, organizationId: string): Promise<Role | null> => {
    const [row] = await db
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
      .limit(1);

    return row && isRole(row.role) ? row.role : null;
  };

  /** Resolve the session cookie into a viewer, or null. Never throws. */
  app.use('*', async (c, next) => {
    c.set('viewer', null);

    const token = readSessionCookie(c.req.header('cookie'));
    if (!token) return next();

    const [row] = await db
      .select({
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        email: users.email,
        name: users.name,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.tokenHash, hashSessionToken(token)))
      .limit(1);

    if (!row) return next();

    if (isExpired(row.expiresAt)) {
      // Clean up rather than leaving dead rows to accumulate.
      await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
      return next();
    }

    c.set('viewer', { id: row.userId, email: row.email, name: row.name });
    return next();
  });

  app.onError((error, c) => {
    if (error instanceof AccessError) {
      return c.json({ error: error.message }, error.status);
    }
    console.error('Unhandled error:', error);
    return c.json({ error: 'Something went wrong.' }, 500);
  });

  app.get('/api/health', (c) => c.json({ ok: true }));

  // --- Authentication ---

  app.post('/api/auth/signup', async (c) => {
    const parsed = signup.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json(
        { error: 'Enter a name, an email address, and a password of at least 12 characters.' },
        400
      );
    }

    const email = normaliseEmail(parsed.data.email);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      // Deliberately the same wording a caller cannot use to enumerate accounts
      // beyond what a signup form inevitably reveals.
      return c.json({ error: 'That email address is already registered.' }, 409);
    }

    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    });

    const token = await startSession(userId);
    c.header('Set-Cookie', buildSessionCookie(token, cookieOptions()));
    return c.json({ user: { id: userId, email, name: parsed.data.name } }, 201);
  });

  app.post('/api/auth/login', async (c) => {
    const parsed = credentials.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: 'Enter your email address and password.' }, 400);
    }

    const email = normaliseEmail(parsed.data.email);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Hash even when the account does not exist, so a missing account and a
    // wrong password take the same time.
    const hash = user?.passwordHash ?? (await placeholderHash());
    const valid = await verifyPassword(parsed.data.password, hash);

    if (!user || !valid) {
      return c.json({ error: 'Email address or password is incorrect.' }, 401);
    }

    const token = await startSession(user.id);
    c.header('Set-Cookie', buildSessionCookie(token, cookieOptions()));
    return c.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post('/api/auth/logout', async (c) => {
    const token = readSessionCookie(c.req.header('cookie'));
    if (token) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
    }
    c.header('Set-Cookie', buildClearedSessionCookie(secureCookies));
    return c.json({ ok: true });
  });

  app.get('/api/auth/me', (c) => {
    const viewer = c.get('viewer');
    if (!viewer) return c.json({ error: 'Not signed in.' }, 401);
    return c.json({ user: viewer });
  });

  // --- Organisations ---

  app.get('/api/orgs', async (c) => {
    const viewer = c.get('viewer');
    if (!viewer) return c.json({ error: 'Sign in to continue.' }, 401);

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        type: organizations.type,
        address: organizations.address,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(eq(memberships.userId, viewer.id));

    return c.json({ organizations: rows });
  });

  app.post('/api/orgs', async (c) => {
    const viewer = c.get('viewer');
    if (!viewer) return c.json({ error: 'Sign in to continue.' }, 401);

    const parsed = orgInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Give the property a name.' }, 400);

    const id = randomUUID();
    await db.insert(organizations).values({
      id,
      name: parsed.data.name,
      type: parsed.data.type,
      address: parsed.data.address ?? null,
    });
    // The creator is its administrator; without this they could not see what
    // they just made.
    await db.insert(memberships).values({
      id: randomUUID(),
      userId: viewer.id,
      organizationId: id,
      role: 'ADMIN',
    });

    return c.json({ organization: { id, name: parsed.data.name, type: parsed.data.type } }, 201);
  });

  app.patch('/api/orgs/:orgId', async (c) => {
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, 'canManageOrganization');

    const parsed = orgInput.partial().safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'That update is not valid.' }, 400);

    await db
      .update(organizations)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(organizations.id, orgId));

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    return c.json({ organization });
  });

  app.delete('/api/orgs/:orgId', async (c) => {
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, 'canManageOrganization');

    // Cascades take the memberships, items, events and everything else with it.
    await db.delete(organizations).where(eq(organizations.id, orgId));
    return c.json({ ok: true });
  });

  // --- Memberships and users ---
  //
  // Both are scoped to organisations the caller belongs to. Returning every
  // membership row would let anyone enumerate the whole install.

  app.get('/api/memberships', async (c) => {
    const viewer = c.get('viewer');
    if (!viewer) return c.json({ error: 'Sign in to continue.' }, 401);

    const mine = await db
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(eq(memberships.userId, viewer.id));

    const orgIds = mine.map((row) => row.organizationId);
    if (orgIds.length === 0) return c.json({ memberships: [] });

    const rows = await db
      .select()
      .from(memberships)
      .where(inArray(memberships.organizationId, orgIds));

    return c.json({ memberships: rows });
  });

  app.get('/api/users', async (c) => {
    const viewer = c.get('viewer');
    if (!viewer) return c.json({ error: 'Sign in to continue.' }, 401);

    const mine = await db
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(eq(memberships.userId, viewer.id));

    const orgIds = mine.map((row) => row.organizationId);
    if (orgIds.length === 0) return c.json({ users: [] });

    const rows = await db
      .selectDistinct({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .where(inArray(memberships.organizationId, orgIds));

    // Password hashes never leave the server, not even to an admin.
    return c.json({ users: rows });
  });

  // --- Tenant-scoped collections ---
  //
  // One router for every collection. The guard is applied here, once, rather
  // than repeated across eleven near-identical route sets where it could be
  // forgotten in exactly one of them.

  const resolveCollection = (name: string) => {
    if (!isCollection(name)) throw new AccessError(404, 'Unknown collection.');
    return COLLECTIONS[name];
  };

  app.get('/api/orgs/:orgId/:collection', async (c) => {
    const spec = resolveCollection(c.req.param('collection'));
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, spec.read);

    const rows = await db.select().from(spec.table).where(eq(spec.table.organizationId, orgId));
    return c.json({ rows });
  });

  app.post('/api/orgs/:orgId/:collection', async (c) => {
    const spec = resolveCollection(c.req.param('collection'));
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, spec.write);

    const parsed = spec.schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'That record is not valid.' }, 400);

    // Records created offline arrive with an id already; ones created through a
    // plain POST do not.
    const id = typeof parsed.data.id === 'string' ? parsed.data.id : randomUUID();

    // organizationId comes from the verified path, never the body.
    await db
      .insert(spec.table)
      .values({ ...parsed.data, id, organizationId: orgId } as never)
      .onConflictDoNothing();

    const [row] = await db
      .select()
      .from(spec.table)
      .where(and(eq(spec.table.id, id), eq(spec.table.organizationId, orgId)))
      .limit(1);

    return c.json({ row }, 201);
  });

  app.patch('/api/orgs/:orgId/:collection/:id', async (c) => {
    const spec = resolveCollection(c.req.param('collection'));
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, spec.write);

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object')
      return c.json({ error: 'That update is not valid.' }, 400);

    // id and organizationId are never taken from an update body: one would move
    // a record, the other would move it into somebody else's property.
    const { id: _id, organizationId: _org, ...changes } = body as Record<string, unknown>;

    await db
      .update(spec.table)
      .set(changes as never)
      .where(and(eq(spec.table.id, c.req.param('id')), eq(spec.table.organizationId, orgId)));

    const [row] = await db
      .select()
      .from(spec.table)
      .where(and(eq(spec.table.id, c.req.param('id')), eq(spec.table.organizationId, orgId)))
      .limit(1);

    if (!row) return c.json({ error: 'That record does not exist.' }, 404);
    return c.json({ row });
  });

  app.delete('/api/orgs/:orgId/:collection/:id', async (c) => {
    const spec = resolveCollection(c.req.param('collection'));
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, spec.write);

    await db
      .delete(spec.table)
      .where(and(eq(spec.table.id, c.req.param('id')), eq(spec.table.organizationId, orgId)));

    return c.json({ ok: true });
  });

  /** Whole-collection replace, backing the provider's replaceCollection. */
  app.put('/api/orgs/:orgId/:collection', async (c) => {
    const spec = resolveCollection(c.req.param('collection'));
    const orgId = c.req.param('orgId');
    await requireOrgAccess(lookupRole, c.get('viewer')?.id, orgId, spec.write);

    const body = await c.req.json().catch(() => null);
    const parsed = z.array(spec.schema).safeParse((body as { rows?: unknown })?.rows);
    if (!parsed.success) return c.json({ error: 'Those records are not valid.' }, 400);

    // Scoped delete then insert: only this organisation's rows are touched.
    await db.delete(spec.table).where(eq(spec.table.organizationId, orgId));
    if (parsed.data.length > 0) {
      await db.insert(spec.table).values(
        parsed.data.map((row) => ({
          ...row,
          id: typeof row.id === 'string' ? row.id : randomUUID(),
          organizationId: orgId,
        })) as never
      );
    }

    return c.json({ ok: true, count: parsed.data.length });
  });

  function cookieOptions() {
    return { secure: secureCookies, maxAgeSeconds: SESSION_TTL_HOURS * 60 * 60 };
  }

  async function startSession(userId: string): Promise<string> {
    const token = generateSessionToken();
    await db.insert(sessions).values({
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: sessionExpiry(),
    });
    return token;
  }

  return app;
}

let cachedPlaceholder: string | undefined;

/** A real hash to compare against when no account matched, for constant time. */
async function placeholderHash(): Promise<string> {
  cachedPlaceholder ??= await hashPassword(randomUUID());
  return cachedPlaceholder;
}
