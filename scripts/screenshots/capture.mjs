/**
 * Captures the README screenshots and the demo recording.
 *
 * Run it with the dev server already up:
 *
 *     npm run dev
 *     node scripts/screenshots/capture.mjs
 *
 * Everything it produces lands in `docs/assets/screenshots/`. The app is driven
 * as a real user would drive it — the account is created through the actual
 * signup form so the password hashing is real — and only the bulk data is
 * written straight to storage, because clicking twenty-eight items into
 * existence would take ten minutes and prove nothing.
 *
 * Nothing here runs in CI. It is a tool for regenerating documentation images
 * when the interface changes.
 */

import { chromium } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoData, DEMO_USER } from './demoData.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const OUT = path.join(REPO, 'docs', 'assets', 'screenshots');
const VIDEO_DIR = path.join(OUT, '.video');

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:8080';

/**
 * A 2x capture at this width lands at 2560 CSS pixels of detail, which stays
 * sharp when GitHub scales it down to the ~830px a README column actually gets.
 */
const VIEWPORT = { width: 1280, height: 860 };
const SCALE = 2;

const THEME_KEY = 'home-asset-keeper-theme';

/** Small helper: give the app a beat to settle after a route change. */
async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

/**
 * Hides the things that make a screenshot look like a screenshot rather than a
 * product: focus rings left over from scripted clicks, and the toast stack.
 */
const CAPTURE_CSS = `
  *:focus-visible { outline: none !important; }
  [data-sonner-toaster] { display: none !important; }
  /* Freeze anything that would blur mid-capture. */
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

async function signUpAndSeed(page) {
  // Start from a genuinely empty origin.
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      await Promise.all(
        dbs.map(
          (db) =>
            db.name &&
            new Promise((resolve) => {
              const request = window.indexedDB.deleteDatabase(db.name);
              request.onsuccess = request.onerror = request.onblocked = () => resolve();
            })
        )
      );
    }
  });

  // Create the account through the real form, so the stored credential record
  // is whatever the app actually writes rather than something we invented.
  await page.goto(`${BASE_URL}/auth`);
  await page.getByRole('tab', { name: /sign up/i }).click();
  await page.locator('#signup-name').fill(DEMO_USER.name);
  await page.locator('#signup-email').fill(DEMO_USER.email);
  await page.locator('#signup-password').fill(DEMO_USER.password);
  await page.locator('#signup-password-confirm').fill(DEMO_USER.password);
  await page.getByRole('button', { name: /^sign up$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  const userId = await page.evaluate(() => {
    const raw = localStorage.getItem('inventory_user');
    return raw ? JSON.parse(raw).id : null;
  });
  if (!userId) throw new Error('Signup did not leave a user in storage.');

  const data = buildDemoData(userId);
  await page.evaluate((payload) => {
    for (const [key, value] of Object.entries(payload)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, data);

  await page.reload();
  await settle(page);
  return userId;
}

async function setTheme(page, theme) {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [THEME_KEY, theme]
  );
  await page.reload();
  await settle(page);
}

/**
 * The bounding box that encloses every card whose heading matches one of
 * `headings`, padded a little. Used to frame a shot on the part of a page that
 * is actually the point, instead of whatever the viewport happened to contain.
 */
async function cardsClip(page, headings, pad = 20) {
  const box = await page.evaluate(
    ([wanted, padding]) => {
      const cards = Array.from(document.querySelectorAll('div.rounded-lg.border'));
      const matched = cards.filter((card) => {
        const heading = card.querySelector('h1, h2, h3, h4');
        return heading && wanted.some((w) => heading.textContent.trim().startsWith(w));
      });
      if (matched.length === 0) return null;

      const rects = matched.map((el) => el.getBoundingClientRect());
      const left = Math.min(...rects.map((r) => r.left)) - padding;
      const top = Math.min(...rects.map((r) => r.top)) - padding;
      const right = Math.max(...rects.map((r) => r.right)) + padding;
      const bottom = Math.max(...rects.map((r) => r.bottom)) + padding;
      return {
        x: Math.max(0, left),
        y: Math.max(0, top),
        width: right - Math.max(0, left),
        height: bottom - Math.max(0, top),
      };
    },
    [headings, pad]
  );
  return box;
}

/** One capture of a route, at the current theme. */
async function shoot(page, { route, name, theme, fullPage = false, prepare, clipCards }) {
  await page.goto(`${BASE_URL}${route}`);
  await settle(page);
  if (prepare) await prepare(page);
  await page.addStyleTag({ content: CAPTURE_CSS });

  // A cursor left over the grid leaves a hover state on one card, which reads
  // as an accident rather than a design.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);

  const options = { path: path.join(OUT, `${name}-${theme}.png`), fullPage };
  if (clipCards) {
    const clip = await cardsClip(page, clipCards);
    if (clip) {
      options.clip = clip;
      delete options.fullPage;
    }
  }

  await page.screenshot(options);
  console.log(`  captured ${name}-${theme}.png`);
}

/** The routes worth a still. Ordered as the README uses them. */
const SHOTS = [
  {
    // The hero shot. The timeline is the product; a dashboard is every product.
    // The mower is the one with a complete broke-repaired-back-in-service arc.
    route: '/items/itm-mower',
    name: 'timeline',
    clipCards: ['Value', 'History'],
    prepare: async (page) => {
      await page.getByText('History', { exact: true }).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    },
  },
  { route: '/dashboard', name: 'dashboard' },
  { route: '/items', name: 'items' },
  { route: '/wishlist', name: 'wishlist' },
  { route: '/locations', name: 'locations' },
];

async function captureStills(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  await signUpAndSeed(page);

  for (const theme of ['light', 'dark']) {
    console.log(`\n${theme} theme:`);
    await setTheme(page, theme);
    for (const shot of SHOTS) {
      await shoot(page, { ...shot, theme });
    }
  }

  await context.close();
}

/**
 * Records a short tour for the animated demo. Playwright writes webm; the
 * companion script turns it into a GIF, because GitHub markdown will not play
 * a video but will happily loop a GIF.
 */
async function captureTour(browser, theme) {
  console.log(`\nrecording ${theme} tour:`);
  const dir = path.join(VIDEO_DIR, theme);
  await rm(dir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 700 },
    deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: 1100, height: 700 } },
  });
  const page = await context.newPage();
  await signUpAndSeed(page);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [THEME_KEY, theme]);

  const beat = (ms = 1500) => page.waitForTimeout(ms);

  /** Go somewhere and re-apply the capture styles the navigation just dropped. */
  const visit = async (route) => {
    await page.goto(`${BASE_URL}${route}`);
    await settle(page, 400);
    await page.addStyleTag({ content: CAPTURE_CSS });
    await page.mouse.move(0, 0);
  };

  /** Scroll smoothly, so the recording reads as browsing rather than jump-cuts. */
  const glideTo = async (selectorText) => {
    await page.evaluate((text) => {
      const heading = Array.from(document.querySelectorAll('h1, h2, h3, h4')).find((h) =>
        h.textContent.trim().startsWith(text)
      );
      heading?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, selectorText);
    await beat(1400);
  };

  // The tour follows the pitch in order: what you own, what happened to it,
  // what it cost you, and what you are saving for next.

  // 1. The grid, where the status badges do the talking: overdue, loaned, in repair.
  await visit('/items');
  await beat(3000);

  // 2. One item's history — the thing no other inventory app has.
  await visit('/items/itm-mower');
  await beat(600);
  await glideTo('History');
  await beat(2600);
  await glideTo('Value');
  await beat(2200);

  // 3. The dashboard: who has your stuff, and where the value sits.
  await visit('/dashboard');
  await beat(2800);
  await glideTo('Where the value is');
  await beat(2400);

  // 4. The wishlist, closing on the half of the arc that happens before you buy.
  await visit('/wishlist');
  await beat(3200);

  await context.close();
  console.log(`  wrote raw ${theme} recording`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    await captureStills(browser);
    // One recording per theme, so the README can show the reader the theme they
    // are already in rather than a bright rectangle on a dark page.
    await captureTour(browser, 'light');
    await captureTour(browser, 'dark');
  } finally {
    await browser.close();
  }
  console.log(`\nDone. Output in ${path.relative(REPO, OUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
