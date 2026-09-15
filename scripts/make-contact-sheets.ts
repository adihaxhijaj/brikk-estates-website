// Builds one numbered contact sheet per listing (data/import-draft/sheets/<REF>.jpg) for human/visual image review.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';

const SOURCE = path.resolve('..', 'instagram', 'listings');
const OUT = path.join('data', 'import-draft', 'sheets');
const CELL = 420, COLS = 4, PAD = 8, LABEL = 34;
await fs.mkdir(OUT, { recursive: true });

for (const dir of (await fs.readdir(SOURCE)).sort()) {
  const ref = dir.split('_')[1];
  const files = (await fs.readdir(path.join(SOURCE, dir))).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const rows = Math.ceil(files.length / COLS);
  const W = COLS * (CELL + PAD) + PAD, H = rows * (CELL + LABEL + PAD) + PAD;
  const composites: OverlayOptions[] = [];
  for (const [i, f] of files.entries()) {
    const x = PAD + (i % COLS) * (CELL + PAD), y = PAD + Math.floor(i / COLS) * (CELL + LABEL + PAD);
    const thumb = await sharp(path.join(SOURCE, dir, f)).rotate().resize(CELL, CELL, { fit: 'contain', background: '#222' }).toBuffer();
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${LABEL}"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="25" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#000">${f}</text></svg>`);
    composites.push({ input: label, left: x, top: y }, { input: thumb, left: x, top: y + LABEL });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#888' } }).composite(composites).jpeg({ quality: 80 }).toFile(path.join(OUT, `${ref}.jpg`));
}
console.log('sheets written');
