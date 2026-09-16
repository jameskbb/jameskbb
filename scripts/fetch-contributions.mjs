// Fetches the GitHub contribution calendar and writes the JSON that
// assets/src/render-activity.mjs consumes.
//
//   node scripts/fetch-contributions.mjs --login=jameskbb --out=contributions.json
//
// Two sources, in order:
//   1. the GraphQL API, when GITHUB_TOKEN is set (what CI uses)
//   2. the public /users/<login>/contributions fragment, which needs no auth
//      and is what makes a local render possible
//
// Both produce the same shape:
//   { login, total, from, to, weeks: [ [ { date, count } | null, ... 7 ], ... ] }

import fs from 'node:fs';

const arg = (k, d) =>
  (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');

const login = arg('login', 'jameskbb');
const out = arg('out', 'contributions.json');
const UA = 'jameskbb-profile-readme';

// ---- source 1: GraphQL ---------------------------------------------------
async function viaGraphQL(token) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }`;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ query, variables: { login } }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${await res.text()}`);

  const body = await res.json();
  if (body.errors) throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);

  const cal = body.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error(`no calendar returned for "${login}"`);

  return {
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
  };
}

// ---- source 2: the public HTML fragment ----------------------------------
async function viaPublicHTML() {
  const res = await fetch(`https://github.com/users/${login}/contributions`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  if (!res.ok) throw new Error(`contributions fragment ${res.status}`);
  const html = await res.text();

  // Counts live in the sr-only tooltips ("3 contributions on October 6th."),
  // keyed to each cell by id. Levels alone would lose the real numbers.
  const tips = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g)) {
    const text = m[2].trim();
    tips.set(m[1], /^No\b/i.test(text) ? 0 : parseInt(text.replace(/,/g, ''), 10) || 0);
  }

  // id is contribution-day-component-<weekday>-<week>
  const grid = new Map();
  let maxWeek = -1;
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})"\s+id="([^"]+)"/g)) {
    const [, date, id] = m;
    const idx = id.match(/-(\d+)-(\d+)$/);
    if (!idx) continue;
    const row = +idx[1], week = +idx[2];
    maxWeek = Math.max(maxWeek, week);
    grid.set(`${week}:${row}`, { date, count: tips.get(id) ?? 0 });
  }
  if (maxWeek < 0) throw new Error('could not parse any day cells');

  const weeks = [];
  for (let w = 0; w <= maxWeek; w++) {
    weeks.push(Array.from({ length: 7 }, (_, r) => grid.get(`${w}:${r}`) ?? null));
  }
  const days = weeks.flat().filter(Boolean);
  return { total: days.reduce((a, d) => a + d.count, 0), weeks };
}

// ---- main ----------------------------------------------------------------
let result, source;
try {
  if (process.env.GITHUB_TOKEN) {
    result = await viaGraphQL(process.env.GITHUB_TOKEN);
    source = 'graphql';
  } else {
    result = await viaPublicHTML();
    source = 'public html';
  }
} catch (err) {
  if (process.env.GITHUB_TOKEN) {
    console.warn(`GraphQL failed (${err.message}); falling back to the public fragment.`);
    result = await viaPublicHTML();
    source = 'public html (fallback)';
  } else {
    throw err;
  }
}

const days = result.weeks.flat().filter(Boolean);
const data = {
  login,
  total: result.total,
  from: days[0].date,
  to: days[days.length - 1].date,
  weeks: result.weeks,
};

fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(`${out}: ${data.total} contributions, ${data.weeks.length} weeks, ${data.from} -> ${data.to}  [${source}]`);
