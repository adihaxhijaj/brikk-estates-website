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

// [foreground, background, minimum, usage]
const pairs = [
  ['ink', 'paper', 4.5, 'body text on listing grids'],
  ['ink', 'white', 4.5, 'card text'],
  ['ink-2', 'paper', 4.5, 'secondary text'],
  ['ink-2', 'white', 4.5, 'card location/specs'],
  ['muted', 'paper', 4.5, 'meta text, availability note'],
  ['muted', 'white', 4.5, 'meta text in cards'],
  ['muted', 'cream-soft', 4.5, 'meta text on cream sections'],
  ['green-ink', 'paper', 4.5, 'links'],
  ['green-ink', 'tint', 4.5, 'rent badge, legal block'],
  ['cream', 'green', 4.5, 'text on green surfaces'],
  ['white', 'green', 4.5, 'primary button label, sale badge'],
  ['cream', 'green-deep', 4.5, 'button hover, action bar'],
  ['leaf', 'green', 3, 'eyebrows (large/UI), focus ring on dark'],
  ['green', 'white', 3, 'focus ring & control borders on light'],
  ['line-strong', 'white', 3, 'form control borders'],
  ['danger', 'white', 4.5, 'form errors'],
  ['green-ink', 'cream', 4.5, 'cream button label'],
  ['white', 'green-deep', 4.5, 'filter badge / hover'],
];
let fail = 0;
for (const [fg, bg, min, use] of pairs) {
  const r = ratio(tok[fg], tok[bg]);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bg} — ${use}`);
}
process.exit(fail ? 1 : 0);
