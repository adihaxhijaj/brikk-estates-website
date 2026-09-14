import sharp from 'sharp';
const src = 'C:/Users/AdiH/Desktop/Brikk-Estates/instagram/other-posts/2026-08-21_brikk-estates/01.jpg';
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
console.log(W, H, C);
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[s.length >> 1]; };
function regionMedian(x0, y0, x1, y1, pred = () => true) {
  const r = [], g = [], b = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = px(x, y); if (pred(p)) { r.push(p[0]); g.push(p[1]); b.push(p[2]); } }
  return [median(r), median(g), median(b), r.length];
}
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const bg = regionMedian(100, 100, 900, 900);
console.log('bg', hex(bg), bg);
// classify
const isLeaf = (p) => p[1] > 170 && p[0] < 180 && p[2] < 180 && p[1] - p[0] > 30;
const isCream = (p) => p[0] > 200 && p[1] > 200 && p[2] > 180;
const leaf = regionMedian(400, 1600, 1250, 2500, isLeaf);
console.log('leaf', hex(leaf), leaf);
const cream = regionMedian(1150, 1650, 2650, 2450, isCream);
console.log('cream', hex(cream), cream);
// bounding boxes
function bbox(pred, x0, y0, x1, y1) {
  let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (pred(px(x, y))) { if (x < minx) minx = x; if (y < miny) miny = y; if (x > maxx) maxx = x; if (y > maxy) maxy = y; }
  return { minx, miny, maxx, maxy, w: maxx - minx + 1, h: maxy - miny + 1 };
}
const leafB = bbox(isLeaf, 0, 1200, 3072, 2900);
console.log('symbol bbox', leafB);
const creamB = bbox(isCream, 1100, 1200, 3072, 2900);
console.log('wordmark bbox', creamB);
// top piece: column profile within top region
const cx = (leafB.minx + leafB.maxx) / 2, cy = (leafB.miny + leafB.maxy) / 2;
console.log('symbol centre', cx, cy);
// top piece extent (x near cx, from miny)
const topB = bbox(isLeaf, Math.round(cx - 150), leafB.miny, Math.round(cx + 150), Math.round(cy - 50));
console.log('top piece bbox', topB);
// row widths of top piece
for (let y = topB.miny; y <= topB.maxy; y += 8) {
  let l = -1, r = -1;
  for (let x = topB.minx - 5; x <= topB.maxx + 5; x++) if (isLeaf(px(x, y))) { if (l < 0) l = x; r = x; }
  console.log('row', y - topB.miny, 'L', l - topB.minx, 'R', r - topB.minx, 'w', r - l + 1);
}
// wordmark split BRIKK / ESTATES rows
let rows = [];
for (let y = creamB.miny; y <= creamB.maxy; y++) { let c = 0; for (let x = creamB.minx; x <= creamB.maxx; x++) if (isCream(px(x, y))) c++; rows.push(c); }
let segs = [], inS = false, s0 = 0;
rows.forEach((c, i) => { if (c > 0 && !inS) { inS = true; s0 = i; } if (c === 0 && inS) { inS = false; segs.push([s0 + creamB.miny, i - 1 + creamB.miny]); } });
if (inS) segs.push([s0 + creamB.miny, creamB.maxy]);
console.log('wordmark row segments', segs);

