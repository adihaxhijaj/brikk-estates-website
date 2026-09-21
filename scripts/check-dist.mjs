// Post-build checks on dist/: internal links and assets resolve, one <h1> per page, title/description/canonical/hreflang
// present and unique, JSON-LD parses, contact links are well-formed, no dead href="#", listings present without JS.
// node scripts/check-dist.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
// Contact addresses come from the site config, so this check follows any change made there.
const siteConfig = fs.readFileSync('src/config/site.ts', 'utf8');
const emails = [...siteConfig.matchAll(/email\w*:\s*'([^']+@[^']+)'/g)].map((m) => m[1]);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mailtoOk = new RegExp(`^mailto:(${emails.map(escapeRe).join('|')})(\\?|$)`);
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
})(DIST);

const problems = [];
const titles = new Map();
const descriptions = new Map();
let links = 0, jsonld = 0;
const exists = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split('#')[0].split('?')[0]);
  if (!clean || clean === '/') return fs.existsSync(path.join(DIST, 'index.html'));
  const f = path.join(DIST, clean);
  return fs.existsSync(f) && fs.statSync(f).isFile() ? true : fs.existsSync(path.join(f, 'index.html'));
};

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = '/' + path.relative(DIST, file).replace(/\\/g, '/');
  const is404 = rel === '/404.html';
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) problems.push(`${rel}: ${h1} <h1> elements`);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!title) problems.push(`${rel}: missing <title>`);
  if (!desc) problems.push(`${rel}: missing meta description`);
  if (!is404) {
    if (titles.has(title)) problems.push(`${rel}: duplicate title with ${titles.get(title)}`); else titles.set(title, rel);
    if (descriptions.has(desc)) problems.push(`${rel}: duplicate description with ${descriptions.get(desc)}`); else descriptions.set(desc, rel);
    if (!/<link rel="canonical" href="https:\/\/www\.brikkestates\.com\//.test(html)) problems.push(`${rel}: canonical missing`);
    for (const hl of ['sq', 'en', 'x-default']) if (!html.includes(`hreflang="${hl}"`)) problems.push(`${rel}: hreflang ${hl} missing`);
  }
  if (!/<html lang="(sq|en)"/.test(html)) problems.push(`${rel}: html lang missing`);
  if (/href="#"/.test(html)) problems.push(`${rel}: dead href="#"`);
  if (/lorem ipsum|TODO|placeholder text/i.test(html.replace(/placeholder="[^"]*"/g, ''))) problems.push(`${rel}: placeholder text`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    jsonld++;
    try { JSON.parse(m[1]); } catch { problems.push(`${rel}: invalid JSON-LD`); }
  }
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (u.startsWith('/') && !u.startsWith('//')) {
      links++;
      if (!exists(u)) problems.push(`${rel}: broken internal link ${u}`);
    } else if (u.startsWith('tel:') && u !== 'tel:+38345667705') problems.push(`${rel}: unexpected tel ${u}`);
    else if (u.startsWith('https://wa.me/') && !u.startsWith('https://wa.me/38345667705')) problems.push(`${rel}: unexpected WhatsApp ${u}`);
    else if (u.startsWith('viber:') && u !== 'viber://chat?number=%2B38345667705') problems.push(`${rel}: unexpected Viber ${u}`);
    else if (u.startsWith('mailto:') && !mailtoOk.test(u)) problems.push(`${rel}: unexpected mailto ${u}`);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('/') && !exists(u)) problems.push(`${rel}: missing srcset image ${u}`);
    }
  }
  // Listing detail pages must carry the ref-specific WhatsApp message in the static HTML.
  const ref = rel.match(/\/(?:prona|en\/properties)\/(b\d{3})-/)?.[1];
  if (ref && !html.includes(`Ref%20${ref.toUpperCase()}`)) problems.push(`${rel}: WhatsApp message missing Ref ${ref.toUpperCase()}`);
}

const listingPagesSq = pages.filter((p) => /[\\/]prona[\\/]b\d{3}-/.test(p)).length;
const listingPagesEn = pages.filter((p) => /[\\/]en[\\/]properties[\\/]b\d{3}-/.test(p)).length;
const allIndex = fs.readFileSync(path.join(DIST, 'prona', 'index.html'), 'utf8');
const cardsInHtml = (allIndex.match(/<li[^>]* data-ref="B\d{3}"/g) ?? []).length;

console.log(`${pages.length} HTML pages, ${links} internal links/assets, ${jsonld} JSON-LD blocks`);
console.log(`listing pages: sq ${listingPagesSq}, en ${listingPagesEn}; cards in static /prona/ HTML: ${cardsInHtml}`);
for (const f of ['sitemap.xml', 'robots.txt', 'favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'og-default.jpg']) {
  if (!fs.existsSync(path.join(DIST, f))) problems.push(`missing ${f}`);
}
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
console.log(`sitemap URLs: ${(sitemap.match(/<loc>/g) ?? []).length}`);
console.log(problems.length ? `\n${problems.length} problem(s):\n` + problems.slice(0, 80).join('\n') : '\nNo problems found.');
process.exit(problems.length ? 1 : 0);
