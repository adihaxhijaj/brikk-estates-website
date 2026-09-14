// Column/row coverage profile of the top house piece (subpixel via green-channel interpolation).
import sharp from 'sharp';
const src = '../instagram/other-posts/2026-08-21_brikk-estates/01.jpg';
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const W = info.width, C = info.channels;
const g = (x, y) => data[(y * W + x) * C + 1];
const bgG = 89, leafG = 202;
const t = (x, y) => Math.min(1, Math.max(0, (g(x, y) - bgG) / (leafG - bgG)));
const cx = 832; // approx
// find exact horizontal centre of top piece from row coverage centroid at y=1688+130
function rowProfile(y, x0, x1) { let s = 0, m = 0; for (let x = x0; x < x1; x++) { const v = t(x, y); s += v; m += v * (x + 0.5); } return { width: s, centre: m / s }; }
for (const dy of [100, 130, 160, 190]) console.log('row', dy, rowProfile(1688 + dy, cx - 100, cx + 100));
const pc = rowProfile(1688 + 150, cx - 100, cx + 100).centre;
// column profiles: top edge and bottom edge positions
function colEdges(x) {
  // scan y 1650..2000, find first rising and last falling with subpixel
  let top = null, bottom = null;
  for (let y = 1650; y < 2000; y++) { if (top === null && t(x, y) > 0.5) { top = y - (t(x, y) - 0.5) / Math.max(1e-6, t(x, y) - t(x, y - 1)) + 0.5; } }
  for (let y = 2000; y > 1650; y--) { if (bottom === null && t(x, y) > 0.5) { bottom = y + (t(x, y) - 0.5) / Math.max(1e-6, t(x, y) - t(x, y + 1)) + 0.5; } }
  return [top?.toFixed(1), bottom?.toFixed(1)];
}
for (const off of [-76, -74, -70, -65, -60, -50, -40, -30, -20, -10, -5, 0, 5, 10, 20, 30, 40, 50, 60, 65, 70, 74, 76]) {
  console.log('col', off, colEdges(Math.round(pc + off)));
}
console.log('piece centre x', pc.toFixed(2));
