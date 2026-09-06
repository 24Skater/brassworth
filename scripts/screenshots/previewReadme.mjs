/**
 * Renders README.md the way GitHub will and screenshots it, in both themes.
 *
 *     node scripts/screenshots/previewReadme.mjs
 *
 * The markup is rendered by GitHub's own markdown API rather than a local
 * library, because the whole risk in a visual README is GitHub's HTML
 * sanitiser: it strips inline SVG, drops most attributes, and is the reason
 * icons have to be committed files referenced by `<img>`. A local renderer
 * would happily show you a page GitHub will not produce.
 *
 * Output goes to the scratchpad, not into the repository.
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.env.PREVIEW_OUT ?? path.join(REPO, '.readme-preview');

/** A cut-down approximation of GitHub's own README styling. */
const SHELL = (body, dark) => `<!doctype html><html data-theme="${dark ? 'dark' : 'light'}">
<head><meta charset="utf-8"><style>
  :root {
    --fg: ${dark ? '#e6edf3' : '#1f2328'};
    --bg: ${dark ? '#0d1117' : '#ffffff'};
    --muted: ${dark ? '#8b949e' : '#59636e'};
    --border: ${dark ? '#3d444d' : '#d1d9e0'};
    --code-bg: ${dark ? '#151b23' : '#f6f8fa'};
    --link: ${dark ? '#4493f8' : '#0969da'};
  }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .wrap { max-width: 1012px; margin: 0 auto; padding: 32px; }
  .box { border: 1px solid var(--border); border-radius: 6px; padding: 32px; }
  a { color: var(--link); text-decoration: none; }
  h1, h2, h3 { border-bottom: 0; margin: 24px 0 16px; line-height: 1.25; }
  h1 { font-size: 2em; } h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: .3em; }
  hr { height: .25em; background: var(--border); border: 0; margin: 24px 0; }
  img { max-width: 100%; }
  table { border-collapse: collapse; margin: 16px 0; display: block; overflow: auto; }
  table th, table td { border: 1px solid var(--border); padding: 6px 13px; }
  table tr:nth-child(2n) { background: var(--code-bg); }
  pre { background: var(--code-bg); padding: 16px; border-radius: 6px; overflow: auto; }
  code { background: var(--code-bg); padding: .2em .4em; border-radius: 6px; font-size: 85%; }
  pre code { background: none; padding: 0; }
  sub { color: var(--muted); }
  details { margin: 16px 0; } summary { cursor: pointer; font-weight: 600; }
  blockquote { border-left: .25em solid var(--border); color: var(--muted); padding: 0 1em; margin: 0 0 16px; }
</style></head>
<body><div class="wrap"><div class="box">${body}</div></div></body></html>`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const markdown = await readFile(path.join(REPO, 'README.md'), 'utf8');

  // GitHub's renderer, so the sanitiser in play is the real one.
  const html = execFileSync(
    'gh',
    ['api', '--method', 'POST', '/markdown', '-f', 'mode=gfm', '-f', `text=${markdown}`],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );

  // Relative asset paths have to resolve from the repo root when we open the
  // page from a temporary file elsewhere.
  const rooted = html.replace(
    /(src|srcset|href)="(?!https?:|#|mailto:)([^"]+)"/g,
    (_, attr, value) => `${attr}="file:///${path.join(REPO, value).replace(/\\/g, '/')}"`
  );

  const browser = await chromium.launch();
  for (const dark of [false, true]) {
    const file = path.join(OUT, `readme-${dark ? 'dark' : 'light'}.html`);
    await writeFile(file, SHELL(rooted, dark));

    const page = await browser.newPage({
      viewport: { width: 1100, height: 1400 },
      deviceScaleFactor: 1,
      colorScheme: dark ? 'dark' : 'light',
    });
    await page.goto(`file:///${file.replace(/\\/g, '/')}`);
    await page.waitForTimeout(1200);
    const shot = path.join(OUT, `readme-${dark ? 'dark' : 'light'}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    await page.close();
    console.log(`  ${path.relative(REPO, shot)}`);
  }
  await browser.close();

  // A cheap check for the failure mode that matters: an icon that did not load.
  console.log('\nIf any feature row shows a broken image, the icon path is wrong.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
