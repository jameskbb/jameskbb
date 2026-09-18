// Rewrites the generated regions of README.md in place.
//
//   node scripts/update-readme.mjs [--dry]
//
// Two regions, each delimited by HTML comments so the hand-written prose around
// them is never touched:
//
//   <!-- BEGIN:repos -->   every public repo that isn't featured above or ignored
//   <!-- BEGIN:writing --> latest posts from jameskrape.com, once it has a feed
//
// A repo is "featured" if it is linked anywhere above the repos marker, so
// adding a hand-written block is all it takes to promote something out of the
// generated list. Names in .github/readme-ignore.txt are dropped entirely.

import fs from 'node:fs';
import path from 'node:path';

const LOGIN = 'jameskbb';
const SITE = 'https://jameskrape.com';
const FEEDS = ['/rss.xml', '/feed.xml', '/atom.xml', '/index.xml'];
const dry = process.argv.includes('--dry');

const root = process.cwd();
const readmePath = path.join(root, 'README.md');
const ignorePath = path.join(root, '.github', 'readme-ignore.txt');

const readIgnore = () => {
  if (!fs.existsSync(ignorePath)) return new Set();
  return new Set(
    fs.readFileSync(ignorePath, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean)
      .map((n) => n.toLowerCase()),
  );
};

const replaceRegion = (text, name, body) => {
  const begin = `<!-- BEGIN:${name} -->`;
  const end = `<!-- END:${name} -->`;
  const i = text.indexOf(begin);
  const j = text.indexOf(end);
  if (i === -1 || j === -1 || j < i) throw new Error(`README is missing the ${name} markers`);
  return text.slice(0, i + begin.length) + '\n' + body.trim() + '\n' + text.slice(j);
};

const gh = async (url) => {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'jameskbb-profile-readme' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
  return res.json();
};

// ---- repos ---------------------------------------------------------------
const buildRepos = async (readme) => {
  const ignore = readIgnore();
  const above = readme.slice(0, readme.indexOf('<!-- BEGIN:repos -->'));
  const featured = new Set(
    [...above.matchAll(/github\.com\/jameskbb\/([A-Za-z0-9_.-]+)/g)].map((m) => m[1].toLowerCase()),
  );

  const repos = await gh(`https://api.github.com/users/${LOGIN}/repos?per_page=100&sort=pushed`);
  const rows = repos
    .filter((r) => !r.fork && !r.private && !r.archived)
    .filter((r) => r.name.toLowerCase() !== LOGIN)
    .filter((r) => !featured.has(r.name.toLowerCase()))
    .filter((r) => !ignore.has(r.name.toLowerCase()))
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

  if (!rows.length) return '_Everything public is featured above. Anything new lands here on its own._';

  return rows
    .map((r) => {
      const bits = [`**[${r.name}](${r.html_url})**`];
      if (r.description) bits.push(r.description.replace(/\s+/g, ' ').trim());
      const tail = [r.language, `updated ${r.pushed_at.slice(0, 10)}`].filter(Boolean).join(' · ');
      return `- ${bits.join(': ')}<br><sub>${tail}</sub>`;
    })
    .join('\n');
};

// ---- writing -------------------------------------------------------------
const PLACEHOLDER =
  `I write at **[jameskrape.com](${SITE})**: notes on systems, analytics and whatever I'm building.\n\n` +
  `<sub>This section fills itself in once the site publishes a feed.</sub>`;

const buildWriting = async () => {
  for (const p of FEEDS) {
    try {
      const res = await fetch(SITE + p, { headers: { 'User-Agent': 'jameskbb-profile-readme' } });
      if (!res.ok) continue;
      const body = await res.text();
      // the site is an SPA that answers every path with index.html, so require real feed markup
      if (!/<(rss|feed)[\s>]/i.test(body)) continue;

      const items = [...body.matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)]
        .slice(0, 3)
        .map((m) => {
          const block = m[0];
          const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]
            .replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          const link =
            (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] ||
            (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [, ''])[1].trim();
          const date = (block.match(/<(?:pubDate|updated|published)[^>]*>([\s\S]*?)<\/(?:pubDate|updated|published)>/i) || [, ''])[1].trim();
          const when = date ? new Date(date) : null;
          const stamp = when && !isNaN(when) ? when.toISOString().slice(0, 10) : '';
          return { title, link, stamp };
        })
        .filter((i) => i.title && i.link);

      if (!items.length) continue;
      return (
        items.map((i) => `- **[${i.title}](${i.link})**${i.stamp ? `<br><sub>${i.stamp}</sub>` : ''}`).join('\n') +
        `\n\n<sub>More at **[jameskrape.com](${SITE})**.</sub>`
      );
    } catch {
      // try the next candidate
    }
  }
  return PLACEHOLDER;
};

// ---- main ----------------------------------------------------------------
const readme = fs.readFileSync(readmePath, 'utf8');
const repos = await buildRepos(readme);
const writing = await buildWriting();

let out = replaceRegion(readme, 'repos', repos);
out = replaceRegion(out, 'writing', writing);

if (out === readme) {
  console.log('README unchanged');
} else if (dry) {
  console.log('--- would write ---\n' + out);
} else {
  fs.writeFileSync(readmePath, out);
  console.log('README updated');
}
