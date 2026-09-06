/**
 * Checks the documentation for the three things that silently rot:
 * broken relative links, unrenderable Mermaid, and emoji.
 *
 *     node scripts/screenshots/checkDocs.mjs
 *
 * Mermaid is checked by actually running Mermaid over each diagram in a real
 * browser, because the only syntax that matters is the syntax GitHub's renderer
 * accepts. Eyeballing a fenced block catches nothing.
 */

import { chromium } from '@playwright/test';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MERMAID = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js';

/**
 * Emoji, roughly: the pictographic blocks plus the variation selector and the
 * dingbats that render in colour. Deliberately does not flag ordinary symbols
 * such as arrows or the section sign.
 */
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

async function markdownFiles() {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.md')) found.push(full);
    }
  }
  await walk(REPO);
  return found;
}

/** Relative link and image targets that do not resolve to a file on disk. */
async function checkLinks(file, text) {
  const problems = [];
  const dir = path.dirname(file);
  const patterns = [
    /\]\(([^)\s]+)\)/g, // markdown links and images
    /(?:src|srcset)="([^"]+)"/g, // html img and source
    /href="([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const [, target] of text.matchAll(pattern)) {
      if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
      const clean = target.split('#')[0];
      if (!clean) continue;
      // srcset/src in this repo is always repo-relative for README, else file-relative.
      const candidates = [path.resolve(dir, clean), path.resolve(REPO, clean)];
      let ok = false;
      for (const candidate of candidates) {
        try {
          await access(candidate);
          ok = true;
          break;
        } catch {
          /* try the next candidate */
        }
      }
      if (!ok) problems.push(`missing link target: ${target}`);
    }
  }
  return [...new Set(problems)];
}

function checkEmoji(text) {
  const hits = [...new Set(text.match(EMOJI) ?? [])];
  return hits.length ? [`emoji present: ${hits.join(' ')}`] : [];
}

function mermaidBlocks(text) {
  return [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
}

async function main() {
  const files = await markdownFiles();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<div id="out"></div>');
  await page.addScriptTag({ url: MERMAID });
  await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false }));

  let failures = 0;

  for (const file of files) {
    const rel = path.relative(REPO, file);
    const text = await readFile(file, 'utf8');
    const problems = [...(await checkLinks(file, text)), ...checkEmoji(text)];

    const blocks = mermaidBlocks(text);
    for (const [index, source] of blocks.entries()) {
      const error = await page.evaluate(
        async ([src, id]) => {
          try {
            await window.mermaid.render(`d${id}`, src);
            return null;
          } catch (e) {
            return String(e.message ?? e).split('\n')[0];
          }
        },
        [source, `${rel.replace(/\W/g, '')}${index}`]
      );
      if (error) problems.push(`mermaid block ${index + 1} failed: ${error}`);
    }

    if (problems.length) {
      failures += problems.length;
      console.log(`\n${rel}`);
      for (const problem of problems) console.log(`  - ${problem}`);
    }
  }

  await browser.close();

  if (failures === 0) {
    console.log(`\nChecked ${files.length} markdown files. No problems found.`);
  } else {
    console.log(`\n${failures} problem(s) across ${files.length} files.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
