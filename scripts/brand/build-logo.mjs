// Reconstructs the 2026 BRIKK ESTATES identity as SVG from the only available source:
//   instagram/other-posts/2026-08-21_brikk-estates/01.jpg (3072x4096 JPEG, read-only).
// - Symbol: rebuilt from measured geometry (see measure-piece.mjs).
// - Wordmark: vector-traced (potrace) from the cream pixels of the source.
// Output: src/assets/brand/logo-parts.json consumed by src/components/Logo.astro.
// This is a reconstruction. Replace with official vector files when the client supplies them.
import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'node:fs/promises';
import path from 'node:path';

const SRC = '../instagram/other-posts/2026-08-21_brikk-estates/01.jpg';
const OUT = 'src/assets/brand';
await fs.mkdir(OUT, { recursive: true });

// ---- Measured values (source pixels) ----
const PIECE_W = 153.3;            // square body side = piece width
const INNER = 138.9;              // symbol centre -> inner (flat) edge
const CENTRE = { x: 832.56, y: 2048.9 };
const R_APEX = 17, R_BOTTOM = 14.5, R_SHOULDER = 4;

// ---- Symbol path in source-pixel units, centred at (0,0) ----
function roundedPolygon(pts, radii) {
  // pts: array of [x,y], radii per vertex. Returns SVG path with arcs approximated by quadratic-free circular arcs.
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const ang = Math.acos(u1[0] * u2[0] + u1[1] * u2[1]);
    const r = radii[i];
    const tdist = r / Math.tan(ang / 2);
    const a = [p1[0] + u1[0] * tdist, p1[1] + u1[1] * tdist];
    const b = [p1[0] + u2[0] * tdist, p1[1] + u2[1] * tdist];
    const cross = u1[0] * u2[1] - u1[1] * u2[0];
    const sweep = cross < 0 ? 1 : 0;
    d += (i === 0 ? `M${f(a[0])} ${f(a[1])}` : `L${f(a[0])} ${f(a[1])}`) + `A${f(r)} ${f(r)} 0 0 ${sweep} ${f(b[0])} ${f(b[1])}`;
  }
  return d + 'Z';
}
const f = (v) => (Math.round(v * 100) / 100).toString();
const h = PIECE_W / 2;
// top piece, pointing up (y negative is up)
const piece = [
  [0, -(INNER + PIECE_W * 1.5)],       // apex
  [h, -(INNER + PIECE_W)],             // right shoulder
  [h, -INNER],                         // bottom right
  [-h, -INNER],                        // bottom left
  [-h, -(INNER + PIECE_W)],            // left shoulder
];
const pieceRadii = [R_APEX, R_SHOULDER, R_BOTTOM, R_BOTTOM, R_SHOULDER];
const rot = (p, deg) => { const a = (deg * Math.PI) / 180; return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]; };
const piecePaths = [0, 60, 120, 180, 240, 300].map((deg) => roundedPolygon(piece.map((p) => rot(p, deg)), pieceRadii));

// Symbol bbox (geometric, before rounding): vertical +-(INNER+1.5W), horizontal from rotated apex.
const symTop = -(INNER + PIECE_W * 1.5);
const symHalfW = Math.max(...[60, 120].flatMap((deg) => piece.map((p) => Math.abs(rot(p, deg)[0]))));

// ---- Wordmark trace ----
const WM = { x0: 1180, y0: 1740, x1: 2590, y1: 2360 }; // padded crop around measured bbox 1208..2555 x 1768..2327
const SCALE = 2;
const crop = await sharp(SRC)
  .extract({ left: WM.x0, top: WM.y0, width: WM.x1 - WM.x0, height: WM.y1 - WM.y0 })
  .resize((WM.x1 - WM.x0) * SCALE, (WM.y1 - WM.y0) * SCALE, { kernel: 'lanczos3' })
  .extractChannel('red') // cream R=239 vs green R=40: strongest contrast channel
  .negate()              // cream -> dark so potrace fills it
  .png()
  .toBuffer();
const tracePng = path.join(OUT, '.trace-input.png');
await fs.writeFile(tracePng, crop);
const svg = await new Promise((res, rej) =>
  potrace.trace(tracePng, { threshold: 128, turdSize: 20, alphaMax: 0.8, optCurve: true, optTolerance: 0.2, color: '#000', background: 'transparent' }, (err, out) => (err ? rej(err) : res(out))),
);
await fs.unlink(tracePng);
const wmPath = svg.match(/ d="([^"]+)"/)[1];

// Express everything in one coordinate space: source pixels.
// Wordmark path is in (crop px * SCALE); transform = translate(x0,y0) scale(1/SCALE).
const parts = {
  note: 'Reconstruction from 2026-08-21_brikk-estates/01.jpg. Replace with official vector artwork.',
  colours: { green: '#285943', leaf: '#90CA8D', cream: '#EFE8D8' },
  symbol: {
    // centred coordinates
    viewBox: [-symHalfW, symTop, symHalfW * 2, -symTop * 2].map(f).map(Number),
    paths: piecePaths,
  },
  wordmark: {
    transform: { x: WM.x0, y: WM.y0, scale: 1 / SCALE },
    path: wmPath,
  },
  // placement of symbol centre in source px, for the horizontal lockup
  symbolCentre: CENTRE,
  wordmarkBBox: { x0: 1208, y0: 1768, x1: 2556, y1: 2328 },
  rows: { brikk: [1768, 2069], estates: [2116, 2328] },
};
await fs.writeFile(path.join(OUT, 'logo-parts.json'), JSON.stringify(parts, null, 2));
console.log('symbol viewBox', parts.symbol.viewBox, 'wordmark path length', wmPath.length);
