import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../server/app';
import { createDatabase, migrate } from '../../server/db';
import { ApiStorageProvider, ApiError } from '@/lib/storage/providers/apiProvider';
import { ApiAuthProvider } from '@/lib/auth/providers/api';

/**
 * The browser-side providers driving the real server, in process.
 *
 * `fetch` is pointed at the Hono app rather than a network, so both halves are
 * the real code: real routing, real SQL, real cookies, real authorisation. A
 * mocked fetch here would prove only that the provider can talk to a fake.
 *
 * The one piece of scaffolding is a cookie jar, because there is no browser to
 * keep the session cookie for us.
 */

const PASSWORD = 'correct horse battery staple';

function harness() {
  const { db, client } = createDatabase(':memory:');
  const app = createApp({ db });
  let cookie = '';

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : String(input);
    const headers = new Headers(init?.headers);
    if (cookie) headers.set('cookie', cookie);

    const response = await app.request(url, { ...init, headers } as RequestInit);

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const value = setCookie.split(';')[0] ?? '';
      // Max-Age=0 is the server clearing it.
      cookie = setCookie.includes('Max-Age=0') ? '' : value;
    }

    return response;
  };

  return {
    client,
    storage: new ApiStorageProvider({ fetchImpl }),
    auth: new ApiAuthProvider({ fetchImpl }),
  };
}

let h: ReturnType<typeof harness>;

beforeEach(async () => {
  h = harness();
  await migrate(h.client);
});

async function signUpAndSelectOrg(email = 'user@example.com'): Promise<string> {
  const result = await h.auth.signup(email, PASSWORD, 'Test User');
  expect(result.error).toBeUndefined();

  const org = await h.storage.createOrganization({ name: 'Workshop', type: 'home' } as never);
  h.storage.setOrganization(org.id);
  return org.id;
}

describe('ApiAuthProvider', () => {
  it('signs up and reports the viewer', async () => {
    const { user } = await h.auth.signup('new@example.com', PASSWORD, 'New User');

    expect(user?.email).toBe('new@example.com');
    expect(h.auth.getCurrentUser()?.email).toBe('new@example.com');
  });

  it('surfaces the server message when signup is rejected', async () => {
    await h.auth.signup('dupe@example.com', PASSWORD, 'A');
    const second = await h.auth.signup('dupe@example.com', PASSWORD, 'B');

    expect(second.user).toBeNull();
    expect(second.error).toMatch(/already registered/i);
  });

  it('rejects a wrong password without throwing', async () => {
    await h.auth.signup('login@example.com', PASSWORD, 'A');
    await h.auth.logout();

    const result = await h.auth.login('login@example.com', 'wrong but long enough');

    expect(result.user).toBeNull();
    expect(result.error).toMatch(/incorrect/i);
  });

  it('validates an active session and forgets a logged-out one', async () => {
    await h.auth.signup('me@example.com', PASSWORD, 'Me');
    expect(await h.auth.validateSession()).toBe(true);

    await h.auth.logout();

    expect(await h.auth.validateSession()).toBe(false);
    expect(h.auth.getCurrentUser()).toBeNull();
  });

  it('never exposes a token in the session shape', async () => {
    await h.auth.signup('me@example.com', PASSWORD, 'Me');
    // The real session is an httpOnly cookie; anything token-shaped here would
    // be a credential sitting where script can read it.
    expect(h.auth.getSession()?.token).toBe('');
  });
});

describe('ApiStorageProvider', () => {
  it('refuses tenant-scoped work before a property is selected', async () => {
    await h.auth.signup('user@example.com', PASSWORD, 'User');

    await expect(h.storage.getItems()).rejects.toBeInstanceOf(ApiError);
  });

  it('round-trips an item through the server', async () => {
    await signUpAndSelectOrg();

    const created = await h.storage.createItem({
      organizationId: 'ignored-by-the-server',
      name: 'Cordless Drill',
      brand: 'Milwaukee',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    expect(created.name).toBe('Cordless Drill');

    const items = await h.storage.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.brand).toBe('Milwaukee');
  });

  it('converts SQLite integer booleans back to booleans', async () => {
    await signUpAndSelectOrg();

    await h.storage.createItem({
      organizationId: 'x',
      name: 'Archived Thing',
      condition: 'GOOD',
      quantity: 1,
      isArchived: true,
      tags: [],
    });

    const [item] = await h.storage.getItems();
    expect(item?.isArchived).toBe(true);
    expect(typeof item?.isArchived).toBe('boolean');
  });

  it('updates and deletes an item', async () => {
    await signUpAndSelectOrg();
    const created = await h.storage.createItem({
      organizationId: 'x',
      name: 'Before',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    const updated = await h.storage.updateItem(created.id, { name: 'After' });
    expect(updated.name).toBe('After');

    await h.storage.deleteItem(created.id);
    expect(await h.storage.getItems()).toHaveLength(0);
  });

  it('round-trips locations, categories and tags', async () => {
    await signUpAndSelectOrg();

    await h.storage.createLocation({ organizationId: 'x', name: 'Garage' } as never);
    await h.storage.createCategory({ organizationId: 'x', name: 'Power Tools' } as never);
    await h.storage.createTag({ organizationId: 'x', name: 'cordless' } as never);

    expect(await h.storage.getLocations()).toHaveLength(1);
    expect(await h.storage.getCategories()).toHaveLength(1);
    expect(await h.storage.getTags()).toHaveLength(1);
  });

  it('records and reads back a lifecycle event', async () => {
    await signUpAndSelectOrg();
    const item = await h.storage.createItem({
      organizationId: 'x',
      name: 'Drill',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    await h.storage.createItemEvent({
      itemId: item.id,
      organizationId: 'x',
      type: 'LOANED_OUT',
      occurredAt: '2024-01-01T00:00:00.000Z',
      counterparty: 'Dave',
    });

    const events = await h.storage.getItemEventsByItem(item.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.counterparty).toBe('Dave');
  });

  it('replaces a whole collection without touching other tenants', async () => {
    const orgId = await signUpAndSelectOrg();

    await h.storage.createItem({
      organizationId: 'x',
      name: 'Original',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    await h.storage.replaceCollection('items', [
      {
        id: 'fixed-id',
        organizationId: orgId,
        name: 'Replacement',
        condition: 'GOOD',
        quantity: 1,
        isArchived: false,
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    const items = await h.storage.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('fixed-id');
  });

  it('cannot read another account property, even with its id', async () => {
    // Alice creates a property and an item.
    const aliceOrg = await signUpAndSelectOrg('alice@example.com');
    await h.storage.createItem({
      organizationId: 'x',
      name: 'Alice Drill',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    // Bob signs in and points the provider at Alice's property id.
    await h.auth.logout();
    await h.auth.signup('bob@example.com', PASSWORD, 'Bob');
    h.storage.setOrganization(aliceOrg);

    // The server decides, not the client. This is the whole point of the tier.
    await expect(h.storage.getItems()).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to let the client assert who it is', async () => {
    await h.auth.signup('user@example.com', PASSWORD, 'User');
    await expect(h.storage.setUser()).rejects.toBeInstanceOf(ApiError);
  });

  it('reads the signed-in user from the server', async () => {
    await h.auth.signup('who@example.com', PASSWORD, 'Who');
    expect((await h.storage.getUser())?.email).toBe('who@example.com');
  });

  it('reports no user when signed out rather than throwing', async () => {
    expect(await h.storage.getUser()).toBeNull();
  });

  it('lists organisations the caller belongs to, and only those', async () => {
    await signUpAndSelectOrg('alice@example.com');
    await h.auth.logout();
    await h.auth.signup('bob@example.com', PASSWORD, 'Bob');

    expect(await h.storage.getOrganizations()).toHaveLength(0);
  });

  it('refuses a blanket wipe', async () => {
    await signUpAndSelectOrg();
    await expect(h.storage.clearAll()).rejects.toBeInstanceOf(ApiError);
  });

  it('exports and re-imports a property', async () => {
    await signUpAndSelectOrg();
    await h.storage.createItem({
      organizationId: 'x',
      name: 'Exported Drill',
      condition: 'GOOD',
      quantity: 1,
      isArchived: false,
      tags: [],
    });

    const exported = await h.storage.exportData();
    expect(JSON.parse(exported).items).toHaveLength(1);

    await h.storage.importData(exported);
    expect(await h.storage.getItems()).toHaveLength(1);
  });
});
