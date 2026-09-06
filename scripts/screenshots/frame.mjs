/**
 * Wraps a raw screenshot in browser chrome and a drop shadow.
 *
 *     node scripts/screenshots/frame.mjs
 *
 * Two things matter here and are easy to get wrong.
 *
 * First, the framing is a second pass over a finished PNG rather than a wrapper
 * injected into the running app. Injecting one contaminates the DOM, can trip
 * the app's own resize handling, and would have to be repeated at every capture
 * site. A post-process touches nothing.
 *
 * Second, the shadow lives in the alpha channel. A shadow composited onto a
 * white plate turns into a visible pale rectangle for every reader on dark
 * GitHub, which is exactly the bug this project's icon palette is also written
 * to avoid.
 *
 * The chrome is deliberately not macOS traffic lights. This is a self-hosted web
 * app; borrowed Apple furniture would claim a platform it does not run on.
 */

import { chromium } from '@playwright/test';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, '..', '..', 'docs', 'assets', 'screenshots');

const PAD = 56;

/** The address shown in the chrome, per screenshot. */
const ROUTES = {
  timeline: 'localhost:8080/items',
  dashboard: 'localhost:8080/dashboard',
  items: 'localhost:8080/items',
  wishlist: 'localhost:8080/wishlist',
  locations: 'localhost:8080/locations',
};

/**
 * The chrome adopts the app's own sidebar graphite in both themes rather than
 * flipping with them. It is the product's colour, so it reads as part of the
 * app either way, and a theme-flipping frame would double the work for nothing.
 */
const page = (dataUri, width, height, url) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: transparent; }
  .stage { padding: ${PAD}px; width: max-content; }
  .frame {
    width: ${width}px;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(87, 83, 78, 0.45);
    box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.28);
    font: 400 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .bar {
    height: 34px; background: #1A1A1A;
    display: flex; align-items: center; gap: 7px; padding: 0 12px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #57534E; flex: none; }
  .pill {
    flex: 1; margin: 0 6px 0 10px; height: 21px; border-radius: 5px;
    background: #26231F; color: #8C857D;
    display: flex; align-items: center; padding: 0 10px;
  }
  .shot { display: block; width: ${width}px; height: ${height}px; }
</style></head><body>
  <div class="stage"><div class="frame">
    <div class="bar">
      <i class="dot"></i><i class="dot"></i><i class="dot"></i>
      <div class="pill">${url}</div>
    </div>
    <img class="shot" src="${dataUri}">
  </div></div>
</body></html>`;

async function main() {
  const files = (await readdir(SHOTS)).filter(
    (f) => f.endsWith('.png') && !f.endsWith('.framed.png')
  );
  if (files.length === 0) {
    console.error('No screenshots found. Run capture.mjs first.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    for (const file of files) {
      const source = path.join(SHOTS, file);
      const bytes = await readFile(source);

      // The captures are 2x, so halve them back to CSS pixels for the layout.
      const probe = await browser.newPage();
      await probe.setContent(
        `<img id="i" src="data:image/png;base64,${bytes.toString('base64')}">`
      );
      const { w, h } = await probe.evaluate(async () => {
        const img = document.getElementById('i');
        await img.decode();
        return { w: img.naturalWidth / 2, h: img.naturalHeight / 2 };
      });
      await probe.close();

      const key = file.replace(/-(light|dark)\.png$/, '');
      const url = ROUTES[key] ?? 'localhost:8080';

      const view = await browser.newPage({
        viewport: {
          width: Math.ceil(w + PAD * 2),
          height: Math.ceil(h + 34 + PAD * 2 + 4),
        },
        deviceScaleFactor: 2,
      });
      await view.setContent(
        page(`data:image/png;base64,${bytes.toString('base64')}`, w, h, url),
        { waitUntil: 'load' }
      );
      const framed = await view.locator('.stage').screenshot({ omitBackground: true });
      await view.close();

      await writeFile(source, framed);
      console.log(`  framed ${file}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
