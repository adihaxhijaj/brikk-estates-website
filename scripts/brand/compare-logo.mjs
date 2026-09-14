// Overlays the reconstructed logo outlines (magenta) on the source artwork for visual verification.
// Writes comparison crops to docs/logo-compare/.
import sharp from 'sharp';
import fs from 'node:fs/promises';
const SRC = '../instagram/other-posts/2026-08-21_brikk-estates/01.jpg';
const parts = JSON.parse(await fs.readFile('src/assets/brand/logo-parts.json', 'utf8'));
await fs.mkdir('docs/logo-compare', { recursive: true });
const { x, y } = parts.symbolCentre;
const t = parts.wordmark.transform;
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="3072" height="4096">
  <g transform="translate(${x} ${y})" fill="none" stroke="#ff00ff" stroke-width="1.2">${parts.symbol.paths.map((d) => `<path d="${d}"/>`).join('')}</g>
  <g transform="translate(${t.x} ${t.y}) scale(${t.scale})" fill="none" stroke="#ff00ff" stroke-width="${1.2 / t.scale}"><path d="${parts.wordmark.path}"/></g>
</svg>`;
const full = await sharp(SRC).composite([{ input: Buffer.from(overlay), top: 0, left: 0 }]).png().toBuffer();
const crops = {
  'symbol-top-piece-4x': { left: 740, top: 1670, width: 190, height: 260 },
  'symbol-left-pieces-4x': { left: 505, top: 1800, width: 260, height: 500 },
  'wordmark-B-4x': { left: 1200, top: 1760, width: 330, height: 320 },
  'wordmark-S-4x': { left: 1880, top: 2105, width: 330, height: 235 },
  'whole-1x': { left: 480, top: 1650, width: 2120, height: 800 },
};
for (const [name, c] of Object.entries(crops)) {
  const scale = name.endsWith('4x') ? 4 : 0.5;
  await sharp(full).extract(c).resize(Math.round(c.width * scale), Math.round(c.height * scale), { kernel: 'nearest' }).png().toFile(`docs/logo-compare/${name}.png`);
}
console.log('ok');
