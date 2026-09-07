/**
 * The service worker's cache of API reads, and how to throw it away.
 *
 * Reads are cached stale-while-revalidate so the app still answers with no
 * signal. The cache is keyed by URL alone, which is fine while one person is
 * signed in and wrong the moment a second one is: `/api/users` carries the
 * name and address of everybody in your properties, and a cache entry does not
 * know who fetched it.
 *
 * So the cache is emptied whenever the identity behind it changes. Without
 * this, signing out and signing back in as somebody else on a shared machine
 * serves the first person's data to the second, and keeps doing it — a
 * revalidation that comes back 403 is not cacheable, so the stale 200 is never
 * replaced.
 *
 * The name matches `runtimeCaching` in `vite.config.ts`. A service worker
 * cannot import from here, so if you rename it there, rename it here.
 */
const API_CACHE = 'brassworth-api';

/**
 * Empty the API read cache. Safe to call anywhere: the Cache API is missing on
 * insecure origins and in test environments, and there is nothing to clear
 * when no service worker ever ran.
 */
export async function clearApiCache(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    await caches.delete(API_CACHE);
  } catch {
    // Storage can refuse for reasons the caller cannot act on — a private
    // window, or a browser set to block site data. Failing to clear a cache
    // must never be the thing that stops somebody signing out.
  }
}
