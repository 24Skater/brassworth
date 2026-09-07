/**
 * Render the brand mark into the PNG sizes a web app manifest needs.
 *
 *     node scripts/icons/appIcons.mjs
 *
 * Generated rather than committed by hand for the same reason the screenshots
 * are: a hand-exported icon silently stops matching the brand the first time
 * the mark changes.
 *
 * Uses the dark-ground mark (light ink), not the light-mode mark: the
 * manifest's background_color is the same graphite as theme-color, and the
 * light-mode mark is dark ink meant for a pale background -- on graphite it
 * would render invisible.
 */

import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MARK = path.join(REPO, 'docs', 'assets', 'brand', 'brassworth-mark-dark.svg');
const OUT = path.join(REPO, 'public');

// Graphite, matching the theme-color already set in index.html.
const BACKGROUND = '#1a1a1a';

/** Maskable icons need their art inside the safe circle, so it is inset. */
const TARGETS = [
  { file: 'icon-192.png', size: 192, padding: 0.12 },
  { file: 'icon-512.png', size: 512, padding: 0.12 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.22 },
];

const svg = await readFile(MARK, 'utf8');
const browser = await chromium.launch();

await mkdir(OUT, { recursive: true });

for (const { file, size, padding } of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;width:${size}px;height:${size}px;background:${BACKGROUND};display:flex;align-items:center;justify-content:center">
       <div style="width:${Math.round(size * (1 - padding * 2))}px">
         <style>svg{display:block;width:100%;height:auto}</style>
         ${svg}
       </div>
     </body></html>`
  );
  const shot = await page.screenshot({ type: 'png' });
  await writeFile(path.join(OUT, file), shot);
  await page.close();
  console.log(`wrote public/${file}`);
}

await browser.close();
