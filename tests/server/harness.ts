import { createApp } from '../../server/app';
import { createDatabase, migrate } from '../../server/db';
import { ApiStorageProvider } from '@/lib/storage/providers/apiProvider';
import { ApiAuthProvider } from '@/lib/auth/providers/api';

/**
 * The browser-side providers wired to the real server, in process.
 *
 * `fetch` is pointed at the Hono app rather than a network, so both halves are
 * real code: real routing, real SQL, real cookies, real authorisation. A mocked
 * fetch would prove only that the provider can talk to a fake.
 *
 * The one piece of scaffolding is a cookie jar, because there is no browser
 * here to hold the session cookie.
 */

export const PASSWORD = 'correct horse battery staple';

export interface Harness {
  storage: ApiStorageProvider;
  auth: ApiAuthProvider;
  ready: Promise<void>;
}

export function createHarness(): Harness {
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
    storage: new ApiStorageProvider({ fetchImpl }),
    auth: new ApiAuthProvider({ fetchImpl }),
    ready: migrate(client),
  };
}

/** Sign up, create a property, and point the provider at it. */
export async function signUpAndSelectOrg(h: Harness, email = 'user@example.com'): Promise<string> {
  await h.auth.signup(email, PASSWORD, 'Test User');
  const org = await h.storage.createOrganization({ name: 'Workshop', type: 'home' } as never);
  h.storage.setOrganization(org.id);
  return org.id;
}

/** A minimal valid item, for tests that only care about one field. */
export function itemInput(name: string, overrides: Record<string, unknown> = {}) {
  return {
    organizationId: 'set-by-the-server',
    name,
    condition: 'GOOD' as const,
    quantity: 1,
    isArchived: false,
    tags: [],
    ...overrides,
  };
}
