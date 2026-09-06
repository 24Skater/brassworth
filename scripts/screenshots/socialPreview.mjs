/**
 * Builds the repository's social preview card.
 *
 *     node scripts/screenshots/socialPreview.mjs
 *
 * GitHub serves this as the Open Graph image wherever the repository is linked --
 * Slack, X, Discord, Bluesky, an iMessage unfurl. Without one, GitHub generates a
 * generic card from the repository metadata, which is legible but says nothing the
 * URL did not already say.
 *
 * 1280 by 640 is GitHub's documented size. Everything here is drawn from the
 * Workshop palette, and the type is deliberately large: most of these cards are
 * read at a few hundred pixels wide in a chat client, so anything smaller than
 * about 28px in this space disappears.
 *
 * Uploading it is a web-only action -- the REST API does not expose the social
 * preview field -- so this script writes the file and prints where to drop it.
 */

import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const OUT = path.join(REPO, 'docs', 'assets', 'brand', 'social-preview.png');

const W = 1280;
const H = 640;

const card = (markDataUri) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: system; src: local("Segoe UI"), local("Helvetica Neue"); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    background: #1A1A1A;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
    color: #F5F5F4;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 88px;
    position: relative;
  }
  /* A single signal-red rule down the left edge, the way a stamped plate has one. */
  body::before {
    content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 14px;
    background: #D6301F;
  }
  /* Faint workshop grid, so the ground is not a flat rectangle. */
  body::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(245,245,244,0.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,245,244,0.028) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .row { display: flex; align-items: center; gap: 26px; margin-bottom: 30px; }
  .mark { width: 76px; height: 76px; display: block; }
  .name { font-size: 62px; font-weight: 700; letter-spacing: -1.4px; line-height: 1; }
  .arc {
    font-size: 37px; font-weight: 600; line-height: 1.34; letter-spacing: -0.4px;
    max-width: 1000px;
  }
  .arc .sold { color: #E8503E; }
  .sub {
    margin-top: 34px; font-size: 25px; line-height: 1.45; color: #A8A29C;
    max-width: 940px;
  }
  .foot {
    position: absolute; left: 88px; bottom: 46px;
    font-size: 21px; color: #78716C; letter-spacing: 0.2px;
  }
  .foot b { color: #A8A29C; font-weight: 600; }
</style></head>
<body>
  <div class="row">
    <img class="mark" src="${markDataUri}">
    <div class="name">Brassworth</div>
  </div>

  <div class="arc">
    Wanted, bought, lent, broken,<br>repaired, <span class="sold">sold</span>.
  </div>

  <div class="sub">
    The whole life of every tool, switch and camera you own &mdash; not just what
    is on the shelf today.
  </div>

  <div class="foot">
    <b>Open source</b> &nbsp;&middot;&nbsp; Local-first, nothing uploaded
    &nbsp;&middot;&nbsp; Self-host in one container &nbsp;&middot;&nbsp; MIT
  </div>
</body></html>`;

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });

  const markPath = path.join(REPO, 'docs', 'assets', 'brand', 'brassworth-mark-dark.svg');
  const mark = await readFile(markPath);
  const markDataUri = `data:image/svg+xml;base64,${mark.toString('base64')}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
  });
  await page.setContent(card(markDataUri), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT });
  await browser.close();

  console.log(`Wrote ${path.relative(REPO, OUT)} (${W}x${H} at 2x)`);
  console.log(
    'Upload it at https://github.com/24Skater/brassworth/settings ' +
      '(Social preview -> Edit -> Upload an image). The REST API does not expose this field.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
