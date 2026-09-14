// Measures the six-house symbol in the 2026 identity artwork (read-only source).
import sharp from 'sharp';
const src = '../instagram/other-posts/2026-08-21_brikk-estates/01.jpg';
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
// leaf vs bg: distance to leaf colour smaller than distance to bg colour
const leaf = [144, 202, 141], bg = [40, 89, 67];
const d = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const isLeaf = (p) => d(p, leaf) < d(p, bg) && p[0] < 200;
let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
for (let y = 1500; y < 2600; y++) for (let x = 400; x < 1180; x++) if (isLeaf(px(x, y))) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
console.log('symbol bbox', { minx, miny, maxx, maxy, w: maxx - minx + 1, h: maxy - miny + 1 });
const cx = (minx + maxx + 1) / 2, cy = (miny + maxy + 1) / 2;
console.log('centre', cx, cy);
// top piece: scan rows from miny until gap
const rows = [];
for (let y = miny; y < cy; y++) {
  let l = -1, r = -1;
  for (let x = Math.round(cx - 120); x < Math.round(cx + 120); x++) if (isLeaf(px(x, y))) { if (l < 0) l = x; r = x; }
  rows.push([y - miny, l < 0 ? null : +(l - cx).toFixed(1), r < 0 ? null : +(r + 1 - cx).toFixed(1)]);
}
const filled = rows.filter((r) => r[1] !== null);
console.log('top piece rows', filled.length, 'last filled', filled.at(-1));
for (let i = 0; i < filled.length; i += 6) console.log(filled[i].join('\t'));
console.log(filled.at(-1).join('\t'));
// subpixel: coverage-based edge estimate on a row in body
function edgeCoverage(y) {
  let sum = 0;
  for (let x = Math.round(cx - 120); x < Math.round(cx + 120); x++) {
    const p = px(x, y);
    // fraction along bg->leaf on green channel
    const t = Math.min(1, Math.max(0, (p[1] - bg[1]) / (leaf[1] - bg[1])));
    sum += t;
  }
  return sum;
}
for (const dy of [120, 160, 200]) console.log('coverage width at row', dy, edgeCoverage(miny + dy).toFixed(2));
// vertical coverage down the centre column
let colsum = 0; for (let y = miny - 5; y < cy; y++) { const p = px(Math.round(cx), y); colsum += Math.min(1, Math.max(0, (p[1] - bg[1]) / (leaf[1] - bg[1]))); }
console.log('centre column coverage (piece height)', colsum.toFixed(2));
// bottom of top piece at an off-centre column
let colsum2 = 0; for (let y = miny - 5; y < cy; y++) { const p = px(Math.round(cx + 50), y); colsum2 += Math.min(1, Math.max(0, (p[1] - bg[1]) / (leaf[1] - bg[1]))); }
console.log('column cx+50 coverage', colsum2.toFixed(2));
