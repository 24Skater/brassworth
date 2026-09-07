import { expect, type Page } from '@playwright/test';

/**
 * Shared E2E helpers.
 *
 * The app has no server: identity and data live in the browser. Each test
 * therefore starts from a clean origin and signs up its own user, which keeps
 * tests independent and lets them run in parallel without colliding.
 */

// Must satisfy the 12-character minimum in src/lib/auth/passwordValidation.ts.
export const TEST_PASSWORD = 'CorrectHorseBattery12!';

let seq = 0;

/** A unique address per call, so parallel workers never share an account. */
export function uniqueEmail(): string {
  seq += 1;
  return `e2e-${Date.now()}-${seq}-${Math.floor(Math.random() * 100000)}@example.com`;
}

/**
 * Clear all browser-side state so a test starts from a known-empty app.
 *
 * CI runs the E2E suite against a production build (see playwright.config.ts),
 * so a service worker is genuinely installed and can keep serving a cached
 * page -- or a cached API response -- across tests that share an origin.
 * Unregistering it and dropping its caches first keeps tests independent the
 * same way clearing storage does; skipping it would let one test's install
 * leak into the next.
 */
export async function resetAppState(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => {
    if (navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    localStorage.clear();
    sessionStorage.clear();
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      await Promise.all(
        dbs.map(
          (db) =>
            db.name &&
            new Promise((r) => {
              const req = window.indexedDB.deleteDatabase(db.name as string);
              req.onsuccess = req.onerror = req.onblocked = () => r(undefined);
            })
        )
      );
    }
  });
}

/** Register a new account through the real signup form. Lands on /dashboard. */
export async function signUp(
  page: Page,
  options: { email?: string; password?: string; name?: string } = {}
): Promise<{ email: string; password: string; name: string }> {
  const email = options.email ?? uniqueEmail();
  const password = options.password ?? TEST_PASSWORD;
  const name = options.name ?? 'E2E User';

  await page.goto('/auth');
  await page.getByRole('tab', { name: /sign up/i }).click();

  await page.locator('#signup-name').fill(name);
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
  await page.locator('#signup-password-confirm').fill(password);

  await page.getByRole('button', { name: /^sign up$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  return { email, password, name };
}

/** Sign in an existing account through the real login form. */
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth');
  await page.getByRole('tab', { name: /login/i }).click();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

/** Create a property (organization) and leave the app with it selected. */
export async function createProperty(page: Page, name = 'E2E Property'): Promise<string> {
  await page.goto('/organizations');
  await page.getByRole('button', { name: /create property/i }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('#name').fill(name);
  await dialog.getByRole('button', { name: /^create$/i }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(name).first()).toBeVisible();

  return name;
}

/** A signed-up user with one property selected — the usual starting point. */
export async function signUpWithProperty(
  page: Page,
  propertyName = 'E2E Property'
): Promise<{ email: string; password: string; name: string; property: string }> {
  await resetAppState(page);
  const account = await signUp(page);
  const property = await createProperty(page, propertyName);
  return { ...account, property };
}
