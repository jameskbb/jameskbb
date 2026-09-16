// Renders assets/banner-{light,dark}.png from banner.html.
//
//   npm i -g playwright && npx playwright install chromium
//   node assets/src/render-banner.mjs
//
// Optional: --tagline=<site|builds|none>  --out=<dir>  --preview

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');

const TAGLINES = {
  site:   'Builder. Leader. Writer.',
  builds: 'Builds things to find out whether they work.',
  none:   '',
};

const tagline = arg('tagline', 'site');
const outDir  = path.resolve(here, arg('out', '..'));
if (!(tagline in TAGLINES)) throw new Error(`unknown tagline: ${tagline}`);

const portrait = 'data:image/webp;base64,' +
  fs.readFileSync(path.join(here, 'portrait.webp')).toString('base64');

const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 320 },
    deviceScaleFactor: 2,           // -> 2560x640
  });
  await page.goto('file://' + path.join(here, 'banner.html'), { waitUntil: 'networkidle' });

  await page.evaluate(({ theme, tagline, text, portrait }) => {
    document.body.dataset.theme = theme;
    document.body.dataset.tagline = tagline;
    document.getElementById('tagline').textContent = text;
    document.getElementById('portrait').src = portrait;
  }, { theme, tagline, text: TAGLINES[tagline], portrait });

  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__fit());
  await page.waitForTimeout(250);

  const out = path.join(outDir, `banner-${theme}.png`);
  await page.screenshot({ path: out });
  console.log(`${out}  (tagline: ${tagline || 'none'})`);
  await page.close();
}

await browser.close();
