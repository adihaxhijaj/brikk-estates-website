// Verifies WCAG 2.2 contrast for every text/background pair used by the design tokens.
// node scripts/check-contrast.mjs
import fs from 'node:fs';

const css = fs.readFileSync('src/styles/tokens.css', 'utf8');
const tok = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum, usage] — pairs as used in src/styles/*.css and the components.
const pairs = [
  ['ink', 'paper', 4.5, 'body text'],
  ['ink', 'surface', 4.5, 'card and panel text'],
  ['ink-2', 'paper', 4.5, 'secondary text'],
  ['ink-2', 'surface', 4.5, 'card location and specs'],
  ['ink-2', 'surface-2', 4.5, 'AI image note'],
  ['ink-3', 'paper', 4.5, 'notes, breadcrumbs, listing type and ref'],
  ['ink-3', 'surface', 4.5, 'notes and refs in cards and panels'],
  ['ink-3', 'surface-2', 4.5, 'notes on inset panels'],
  ['green-500', 'paper', 4.5, 'section links'],
  ['green-500', 'surface', 4.5, 'links in cards'],
  ['on-green', 'green-500', 4.5, 'text on green sections and header'],
  ['on-green-2', 'green-500', 4.5, 'secondary text and links on green'],
  ['on-green-2', 'green-600', 4.5, 'mobile menu panel'],
  ['cream', 'green-500', 4.5, 'headings on green, primary button label'],
  ['cream', 'green-700', 4.5, 'primary button hover'],
  ['green-700', 'cream', 4.5, 'cream button and header request button'],
  ['leaf-text', 'green-500', 4.5, 'hero eyebrow, footer headings'],
  ['leaf', 'green-500', 3, 'nav underline and graphic accents (non-text)'],
  ['focus-dark', 'paper', 3, 'focus ring on light'],
  ['focus', 'green-500', 3, 'focus ring on green'],
  ['line-control', 'surface', 3, 'form control borders'],
  ['on-label-light', 'label-sale', 4.5, 'sale badge'],
  ['on-label-light', 'label-sold', 4.5, 'sold badge'],
  ['on-label-dark', 'label-rent', 4.5, 'rent badge'],
  ['on-label-dark', 'label-reserved', 4.5, 'reserved badge'],
  ['on-label-dark', 'label-rented', 4.5, 'rented badge'],
];
let fail = 0;
for (const [fg, bg, min, use] of pairs) {
  if (!tok[fg] || !tok[bg]) throw new Error(`Unknown token in pair ${fg} on ${bg}; update scripts/check-contrast.mjs.`);
  const r = ratio(tok[fg], tok[bg]);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bg} — ${use}`);
}
process.exit(fail ? 1 : 0);
