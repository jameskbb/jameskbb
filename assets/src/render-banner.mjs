// Renders assets/banner-{light,dark}.png from banner.html.
//
//   npm i -g playwright && npx playwright install chromium
//   node assets/src/render-banner.mjs
//
// Flags:
//   --tagline=<site|builds|none>   which tagline to set (default: site)
//   --revision=<n>                 value for the title block's "revision" row
//   --drawn=<YYYY-MM-DD>           value for the title block's "drawn" row
//   --portrait                     include the photo cutout (off by default)
//   --out=<dir>                    output directory (default: assets/)
//
// With no --revision/--drawn the script reads them from git, so a local render
// matches what CI produces.

import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const has = (k) => process.argv.includes(`--${k}`);
const arg = (k, d) =>
  (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');

const TAGLINES = {
  site:   'Builder. Leader. Writer.',
  builds: 'Builds things to find out whether they work.',
  none:   '',
};

const git = (cmd, fallback) => {
  try {
    return execSync(`git ${cmd}`, { cwd: here, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return fallback;
  }
};

const tagline  = arg('tagline', 'site');
const outDir   = path.resolve(here, arg('out', '..'));
const portrait = has('portrait');
const revision = arg('revision', git('rev-list --count HEAD', '1'));
const drawn    = arg('drawn', git('log -1 --format=%cs', new Date().toISOString().slice(0, 10)));

if (!(tagline in TAGLINES)) throw new Error(`unknown tagline: ${tagline}`);

const portraitSrc = portrait
  ? 'data:image/webp;base64,' + fs.readFileSync(path.join(here, 'portrait.webp')).toString('base64')
  : '';

// Local escape hatch: set CHROMIUM_PATH to a specific Chromium binary. Some
// Playwright builds hang on page.screenshot() under WSL2; pointing at a known
// good build works around it. CI leaves this unset and uses the bundled one.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 320 },
    deviceScaleFactor: 2, // -> 2560x640
  });
  await page.goto('file://' + path.join(here, 'banner.html'), { waitUntil: 'networkidle' });

  await page.evaluate((o) => {
    document.body.dataset.theme = o.theme;
    document.body.dataset.tagline = o.tagline;
    document.body.dataset.portrait = o.portrait ? 'on' : 'off';
    document.getElementById('tagline').textContent = o.text;
    document.getElementById('revision').textContent = o.revision;
    document.getElementById('drawn').textContent = o.drawn;
    if (o.portraitSrc) document.getElementById('portrait').src = o.portraitSrc;
  }, { theme, tagline, text: TAGLINES[tagline], portrait, portraitSrc, revision, drawn });

  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__fit());
  await page.waitForTimeout(250);

  const out = path.join(outDir, `banner-${theme}.png`);
  await page.screenshot({ path: out });
  console.log(`${out}  tagline=${tagline || 'none'} portrait=${portrait} rev=${revision} drawn=${drawn}`);
  await page.close();
}

await browser.close();
