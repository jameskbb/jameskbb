// Renders assets/activity-{light,dark}.png ("sheet 2") from activity.html.
//
//   node assets/src/render-activity.mjs --data=contributions.json
//
// The JSON is what scripts/fetch-contributions.mjs writes:
//   { login, total, from, to, weeks: [ [ { date, count }, ... ], ... ] }
//
// Flags: --data=<file>  --out=<dir>

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) =>
  (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');

const dataPath = path.resolve(arg('data', path.join(here, 'contributions.json')));
const outDir = path.resolve(here, arg('out', '..'));

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const days = data.weeks.flat().filter((d) => d && d.date);

// ---- derived stats -------------------------------------------------------
const counts = days.map((d) => d.count);
const nonzero = counts.filter((c) => c > 0).sort((a, b) => a - b);
const q = (p) => (nonzero.length ? nonzero[Math.min(nonzero.length - 1, Math.floor(nonzero.length * p))] : 0);
const t1 = q(0.25), t2 = q(0.5), t3 = q(0.8);

const level = (c) => (c === 0 ? 0 : c <= t1 ? 1 : c <= t2 ? 2 : c <= t3 ? 3 : 4);

let peak = days[0] || { date: '', count: 0 };
for (const d of days) if (d.count > peak.count) peak = d;

let streak = 0, best = 0;
for (const d of days) {
  if (d.count > 0) { streak += 1; best = Math.max(best, streak); } else streak = 0;
}

const fmt = (iso) => {
  const [y, m, dd] = iso.split('-');
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${+dd}, ${y}`;
};

const view = {
  weeks: data.weeks.map((w) => w.map((d) => (d && d.date ? { l: level(d.count), peak: d.date === peak.date } : null))),
  months: (() => {
    const out = [];
    for (const w of data.weeks) {
      const first = w.find((d) => d && d.date);
      const m = first ? first.date.slice(0, 7) : null;
      if (out.length && out[out.length - 1].m === m) out[out.length - 1].n += 1;
      else out.push({ m, n: 1 });
    }
    // drop a leading stub so labels line up with whole months
    return out.map((o, i) => ({
      label: o.m && (i === 0 ? o.n >= 2 : o.n >= 2)
        ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+o.m.slice(5) - 1]
        : '',
      n: o.n,
    }));
  })(),
  total: data.total.toLocaleString('en-US'),
  range: `${fmt(data.from)}  →  ${fmt(data.to)}`,
  dimlabel: `${data.weeks.length} weeks`,
  peak: `${peak.count} on ${fmt(peak.date)}`,
  streak: `${best} day${best === 1 ? '' : 's'}`,
};

// ---- render --------------------------------------------------------------
// Local escape hatch: set CHROMIUM_PATH to a specific Chromium binary. Some
// Playwright builds hang on page.screenshot() under WSL2; pointing at a known
// good build works around it. CI leaves this unset and uses the bundled one.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 380 },
    deviceScaleFactor: 2, // -> 2560x760
  });
  await page.goto('file://' + path.join(here, 'activity.html'), { waitUntil: 'networkidle' });

  await page.evaluate((v) => {
    document.body.dataset.theme = v.theme;

    const weeks = document.getElementById('weeks');
    weeks.innerHTML = '';
    for (const w of v.weeks) {
      const col = document.createElement('div');
      col.className = 'week';
      for (const d of w) {
        const cell = document.createElement('div');
        cell.className = d === null ? 'day empty' : `day l${d.l}${d.peak ? ' peak' : ''}`;
        col.appendChild(cell);
      }
      weeks.appendChild(col);
    }

    const months = document.getElementById('months');
    months.innerHTML = '';
    for (const m of v.months) {
      const s = document.createElement('span');
      s.style.width = m.n * 20 + 'px';   // 17px cell + 3px gap
      s.textContent = m.label;
      months.appendChild(s);
    }

    document.getElementById('range').textContent = v.range;
    document.getElementById('dimlabel').textContent = v.dimlabel;
    document.getElementById('total').textContent = v.total;
    document.getElementById('peak').textContent = v.peak;
    document.getElementById('streak').textContent = v.streak;

    // the callout measures the plotted weeks, like the banner's measures the wordmark
    const grid = document.getElementById('weeks').getBoundingClientRect();
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const dim = document.getElementById('dim');
    dim.style.marginLeft = Math.round(grid.left - stage.left - 58) + 'px';
    dim.style.width = Math.round(grid.width) + 'px';
  }, { ...view, theme });

  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(250);

  const out = path.join(outDir, `activity-${theme}.png`);
  // explicit clip + animations:disabled so the capture can never wait on stability
  await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: 1280, height: 380 },
    animations: 'disabled',
    timeout: 60000,
  });
  console.log(`${out}  total=${view.total} peak=${view.peak} streak=${view.streak}`);
  await page.close();
}

await browser.close();
