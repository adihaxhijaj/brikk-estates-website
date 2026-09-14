// Generates favicon set and default Open Graph image from the reconstructed logo parts.
// Run after build-logo.mjs:  node scripts/brand/export-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';

const parts = JSON.parse(await fs.readFile('src/assets/brand/logo-parts.json', 'utf8'));
const { green, leaf, cream } = parts.colours;
const [sx, sy, sw, sh] = parts.symbol.viewBox;
const symbolGroup = (fill) => `<g fill="${fill}">${parts.symbol.paths.map((d) => `<path d="${d}"/>`).join('')}</g>`;

// Horizontal lockup geometry in source px
const c = parts.symbolCentre, t = parts.wordmark.transform;
const hx0 = c.x + sx, hy0 = c.y + sy, hx1 = parts.wordmarkBBox.x1;
const horizontal = (sym, word) => `<g transform="translate(${c.x} ${c.y})">${symbolGroup(sym)}</g><g transform="translate(${t.x} ${t.y}) scale(${t.scale})" fill="${word}" fill-rule="evenodd"><path d="${parts.wordmark.path}"/></g>`;

await fs.mkdir('public', { recursive: true });

// SVG favicon: leaf symbol on brand green, small radius square
const pad = sh * 0.14;
const side = sh + pad * 2;
const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sx - (side - sw) / 2} ${sy - pad} ${side} ${side}"><rect x="${sx - (side - sw) / 2}" y="${sy - pad}" width="${side}" height="${side}" rx="${side * 0.12}" fill="${green}"/>${symbolGroup(leaf)}</svg>`;
await fs.writeFile('public/favicon.svg', favSvg);
const png32 = await sharp(Buffer.from(favSvg)).resize(32, 32).png().toBuffer();
await fs.writeFile('public/favicon-32.png', png32);
// apple-touch: full-bleed square (iOS rounds corners itself)
const appleSvg = favSvg.replace(/rx="[^"]+"/, 'rx="0"');
await sharp(Buffer.from(appleSvg)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// favicon.ico containing a single 32px PNG
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18);
await fs.writeFile('public/favicon.ico', Buffer.concat([ico, png32]));

// Open Graph 1200x630: horizontal lockup centred on green
const lw = hx1 - hx0, lh = sh;
const ogW = 1200, ogH = 630;
const scale = 760 / lw;
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}" viewBox="0 0 ${ogW} ${ogH}">
<rect width="${ogW}" height="${ogH}" fill="${green}"/>
<g transform="translate(${(ogW - lw * scale) / 2} ${(ogH - lh * scale) / 2}) scale(${scale}) translate(${-hx0} ${-hy0})">${horizontal(leaf, cream)}</g>
</svg>`;
await sharp(Buffer.from(ogSvg)).jpeg({ quality: 90 }).toFile('public/og-default.jpg');
console.log('favicons + og written');
