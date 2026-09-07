import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearApiCache } from '@/lib/storage/apiCache';

function stubCaches(value: unknown) {
  Object.defineProperty(globalThis, 'caches', { configurable: true, value });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis as Record<string, unknown>, 'caches');
  vi.restoreAllMocks();
});

describe('clearApiCache', () => {
  it('deletes the cache the service worker fills', async () => {
    const del = vi.fn().mockResolvedValue(true);
    stubCaches({ delete: del });

    await clearApiCache();

    // The name is duplicated in vite.config.ts, because a service worker
    // cannot import it. Pinning it here means a rename that misses one side
    // fails a test rather than silently leaving a stale cache behind.
    expect(del).toHaveBeenCalledWith('brassworth-api');
  });

  it('does nothing where the Cache API does not exist', async () => {
    await expect(clearApiCache()).resolves.toBeUndefined();
  });

  it('never lets a storage failure stop a sign-out', async () => {
    stubCaches({
      delete: vi.fn().mockRejectedValue(new Error('site data is blocked')),
    });

    await expect(clearApiCache()).resolves.toBeUndefined();
  });
});
