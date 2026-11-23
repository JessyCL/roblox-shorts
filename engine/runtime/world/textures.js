// Procedural, tileable material textures drawn in-canvas (deterministic, seeded; no image files).
// Each texture packs two grey channels: R = albedo multiplier (near-neutral, part colour tints it, like Roblox's
// 2022 colour maps) and G = height (used as a bump map). `tile` is the tile size in studs, so textures keep a fixed
// stud scale on any part size (see materials.js stud mapping). Generated lazily on first use and cached.
import { hash1 } from '../core/math.js';

const fract = (x) => x - Math.floor(x);
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mod = (a, n) => ((a % n) + n) % n;
const h2 = (x, y, s) => hash1((x * 73856093) ^ (y * 19349663), s);

// Tileable value noise in [0,1): (u,v) in tile units [0,1), `p` lattice cells per tile.
function vnoise(u, v, p, s, py = p) {
  const x = u * p, y = v * py, ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const x0 = mod(ix, p), x1 = mod(ix + 1, p), y0 = mod(iy, py), y1 = mod(iy + 1, py);
  const a = h2(x0, y0, s), b = h2(x1, y0, s), c = h2(x0, y1, s), d = h2(x1, y1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(u, v, p, s, oct = 4) {
  let a = 0.5, t = 0, n = 0;
  for (let o = 0; o < oct; o++) { t += a * vnoise(u, v, p << o, s + o * 17); n += a; a *= 0.5; }
  return t / n;
}
// Tileable voronoi with `g` cells per tile (optionally gy rows): F1, F2 (cell units) and nearest cell id.
const VO = { f1: 0, f2: 0, id: 0, cx: 0, cy: 0 };
function voronoi(u, v, g, s, gy = g, jitter = 0.9) {
  const x = u * g, y = v * gy, ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0, cx = 0, cy = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cxi = ix + i, cyj = iy + j, wx = mod(cxi, g), wy = mod(cyj, gy);
    const px = cxi + 0.5 + (h2(wx, wy, s) - 0.5) * jitter, py = cyj + 0.5 + (h2(wx, wy, s + 9) - 0.5) * jitter;
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = wx + wy * g; cx = px; cy = py; } else if (d < f2) f2 = d;
  }
  VO.f1 = f1; VO.f2 = f2; VO.id = id; VO.cx = cx; VO.cy = cy;
  return VO;
}

// Renders fn(u, v, o) -> o.a (albedo 0..1), o.h (height 0..1) into an N x N canvas. Optional baked relief shading.
function render(N, fn, { shade = 0 } = {}) {
  const A = new Float32Array(N * N), H = new Float32Array(N * N), o = { a: 1, h: 0.5 };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    o.a = 1; o.h = 0.5;
    fn((x + 0.5) / N, (y + 0.5) / N, o);
    A[y * N + x] = o.a; H[y * N + x] = o.h;
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(N, N), d = img.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    let a = A[i];
    if (shade) { // light from the top-left: brighten up-facing slopes, darken the far side (reads at distance)
      const g = H[mod(y - 1, N) * N + mod(x - 1, N)] - H[mod(y + 1, N) * N + mod(x + 1, N)];
      a *= 1 + shade * g * (N / 512);
    }
    d[i * 4] = clamp01(a) * 255; d[i * 4 + 1] = clamp01(H[i]) * 255; d[i * 4 + 2] = 0; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Generators: (seed) -> { N, tile: [u studs, v studs], bump, shade, fn }. bump < 0 means bright = recessed.
const GEN = {
  plastic: () => ({ N: 256, tile: [8, 8], bump: 0.006, fn: (u, v, o) => { const n = fbm(u, v, 16, 3, 3); o.a = 0.975 + 0.025 * n; o.h = n; } }),
  brick: () => ({ N: 1024, tile: [4.8, 3.6], bump: 0.05, shade: 0, fn: (u, v, o) => {
    const rows = 8, cols = 4, mw = 0.07; // brick 1.2 x 0.45 studs, mortar ~0.07 studs
    const r = Math.floor(v * rows), off = (r % 2) * 0.5, cu = u * cols + off, c = Math.floor(cu);
    const bu = (cu - c) * 1.2, bv = (v * rows - r) * 0.45; // position inside the brick in studs
    const e = Math.min(bu, 1.2 - bu, bv, 0.45 - bv); // distance to the brick edge (studs)
    const id = mod(c, cols) + r * cols, n = fbm(u, v, 32, 5, 3);
    if (e < mw * 0.5) { o.a = 0.93 + 0.05 * n; o.h = 0.05; return; }
    const bevel = clamp01((e - mw * 0.5) / 0.05);
    o.a = (0.7 + 0.16 * h2(id, 1, 7) + 0.1 * (n - 0.5) + 0.06 * (vnoise(u, v, 128, 11) - 0.5)) * (0.9 + 0.1 * bevel);
    o.h = 0.55 + 0.4 * bevel + 0.05 * n;
  } }),
  woodplanks: () => ({ N: 1024, tile: [8, 8], bump: 0.04, fn: (u, v, o) => {
    const rows = 8, r = Math.floor(v * rows), len = 4, off = Math.floor(h2(r, 3, 21) * 4);
    const su = u * 8 + off, p = Math.floor(su / len), pu = su - p * len, pv = (v * rows - r);
    const id = mod(p, 2) + r * 2, gap = Math.min(pu, len - pu) < 0.04 || Math.min(pv, 1 - pv) < 0.035;
    const grain = vnoise(u + h2(id, 5, 2), v, 12, 23 + id, 96) * 0.6 + vnoise(u, v, 64, 29, 384) * 0.4;
    o.a = gap ? 0.42 : 0.74 + 0.16 * h2(id, 7, 31) + 0.14 * (grain - 0.5) - 0.06 * Math.pow(Math.abs(pv - 0.5) * 2, 6);
    o.h = gap ? 0 : 0.75 + 0.15 * grain;
  } }),
  wood: () => ({ N: 512, tile: [4, 8], bump: 0.02, fn: (u, v, o) => {
    const w = fbm(u, v, 4, 41, 3), ring = Math.sin((u * 14 + w * 3) * Math.PI * 2) * 0.5 + 0.5;
    const fine = vnoise(u, v, 128, 43, 16);
    o.a = 0.78 + 0.12 * ring + 0.08 * (fine - 0.5); o.h = 0.5 + 0.3 * ring * fine;
  } }),
  concrete: () => ({ N: 512, tile: [8, 8], bump: 0.025, fn: (u, v, o) => {
    const m = fbm(u, v, 8, 51, 5), pit = vnoise(u, v, 160, 53), pits = pit > 0.86 ? (pit - 0.86) * 4 : 0;
    o.a = 0.9 + 0.12 * (m - 0.5) - pits * 0.5; o.h = 0.6 + 0.2 * m - pits;
  } }),
  cobblestone: () => ({ N: 1024, tile: [6, 6], bump: 0.08, shade: 1.6, fn: (u, v, o) => {
    const c = voronoi(u, v, 6, 61, 6, 0.75), e = c.f2 - c.f1, n = fbm(u, v, 32, 63, 3);
    const stone = clamp01(e / 0.18);
    o.h = Math.sqrt(stone) * (0.8 + 0.2 * n);
    o.a = e < 0.06 ? 0.45 + 0.1 * n : 0.68 + 0.22 * h2(c.id, 1, 65) + 0.1 * (n - 0.5);
  } }),
  pebble: () => ({ N: 1024, tile: [7, 7], bump: 0.07, shade: 2.0, fn: (u, v, o) => { // savanna 'Ground': round pebbles on dirt
    const n = fbm(u, v, 24, 71, 3);
    let a = 0.62 + 0.14 * (n - 0.5) + 0.08 * (vnoise(u, v, 192, 81) - 0.5);
    const c = voronoi(u, v, 18, 73, 18, 0.8), r1 = h2(c.id, 3, 75), size = 0.2 + 0.2 * r1;
    const c2 = voronoi(u, v, 44, 77, 44, 0.9), r2 = h2(c2.id, 5, 79), size2 = 0.16 + 0.12 * r2;
    a *= 1 - 0.18 * clamp01(1 - Math.abs(c.f1 - size - 0.04) / 0.05); // contact darkening round big pebbles
    const s2 = r2 > 0.4 ? clamp01((size2 - c2.f1) / 0.06) : 0, s1 = clamp01((size - c.f1) / 0.07);
    a += (0.62 + 0.4 * h2(c2.id, 11, 85) - a) * s2;
    a += (0.68 + 0.36 * h2(c.id, 9, 83) - a) * s1;
    const d1 = Math.sqrt(Math.max(0, 1 - (c.f1 / size) ** 2)), d2 = Math.sqrt(Math.max(0, 1 - (c2.f1 / size2) ** 2));
    o.a = a; o.h = Math.max(s1 * (0.35 + 0.65 * d1), s2 * 0.5 * d2, 0.12 * n);
  } }),
  ground: () => ({ N: 512, tile: [8, 8], bump: 0.04, shade: 1.2, fn: (u, v, o) => {
    const n = fbm(u, v, 8, 91, 5), c = voronoi(u, v, 20, 93, 20, 1), st = clamp01(((c.f2 - c.f1) - 0.38) / 0.08) * (h2(c.id, 2, 95) > 0.7 ? 1 : 0);
    o.a = 0.78 + 0.2 * (n - 0.5) + st * 0.15; o.h = 0.4 * n + st * 0.5;
  } }),
  grass: () => ({ N: 512, tile: [6, 6], bump: 0.03, shade: 0.8, fn: (u, v, o) => {
    const blades = vnoise(u + 0.13 * vnoise(u, v, 16, 103), v, 160, 101), low = fbm(u, v, 6, 105, 4), mid = vnoise(u, v, 48, 107);
    o.a = 0.8 + 0.22 * (blades - 0.5) + 0.12 * (low - 0.5) + 0.06 * (mid - 0.5); o.h = 0.4 + 0.5 * blades;
  } }),
  sand: () => ({ N: 512, tile: [8, 8], bump: 0.02, fn: (u, v, o) => {
    const g = vnoise(u, v, 128, 111), rip = Math.sin((v * 10 + fbm(u, v, 4, 113, 3) * 2.5) * Math.PI * 2) * 0.5 + 0.5;
    o.a = 0.93 + 0.05 * (g - 0.5) + 0.04 * (fbm(u, v, 16, 115, 3) - 0.5) + 0.03 * rip; o.h = 0.3 * g + 0.5 * rip;
  } }),
  fabric: () => ({ N: 256, tile: [2, 2], bump: 0.03, fn: (u, v, o) => {
    const k = 32, x = u * k, y = v * k, cx = Math.floor(x), cy = Math.floor(y), warp = (cx + cy) % 2 === 0;
    const t = warp ? Math.sin(fract(y) * Math.PI) : Math.sin(fract(x) * Math.PI), n = vnoise(u, v, 64, 121);
    o.a = 0.82 + 0.14 * t + 0.06 * (n - 0.5); o.h = t;
  } }),
  diamondplate: () => ({ N: 512, tile: [2, 2], bump: 0.08, shade: 1.0, fn: (u, v, o) => {
    const k = 6, x = u * k, y = v * k, cx = Math.floor(x), cy = Math.floor(y), fx = fract(x) - 0.5, fy = fract(y) - 0.5;
    const flip = (cx + cy) % 2 === 0, a = flip ? fx + fy : fx - fy, b = flip ? fx - fy : fx + fy;
    const d = Math.abs(a) * 0.35 + Math.abs(b) * 1.4, ridge = clamp01((0.32 - d) / 0.06);
    o.a = 0.86 + 0.1 * ridge + 0.04 * (vnoise(u, v, 64, 131) - 0.5); o.h = ridge;
  } }),
  marble: () => ({ N: 512, tile: [8, 8], bump: 0.004, fn: (u, v, o) => {
    const w = fbm(u, v, 4, 141, 5), vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 2 + w * 5) * Math.PI)), 10);
    o.a = 0.94 - 0.3 * vein - 0.05 * fbm(u, v, 16, 143, 3); o.h = 0.5;
  } }),
  granite: () => ({ N: 512, tile: [4, 4], bump: 0.004, fn: (u, v, o) => {
    const s = vnoise(u, v, 256, 151), s2 = vnoise(u, v, 128, 153);
    o.a = 0.84 + (s > 0.8 ? -0.35 : 0) + (s2 > 0.85 ? 0.12 : 0) + 0.06 * (fbm(u, v, 8, 155, 3) - 0.5); o.h = 0.5;
  } }),
  slate: () => ({ N: 512, tile: [8, 8], bump: 0.05, shade: 1.0, fn: (u, v, o) => {
    const c = voronoi(u, v, 4, 161, 4, 0.8), e = c.f2 - c.f1, layer = vnoise(u + 0.3 * fbm(u, v, 4, 163, 2), v, 24, 165);
    o.a = e < 0.03 ? 0.45 : 0.7 + 0.2 * h2(c.id, 1, 167) + 0.1 * (layer - 0.5); o.h = e < 0.03 ? 0 : 0.6 + 0.3 * layer;
  } }),
  ice: () => ({ N: 512, tile: [8, 8], bump: 0.01, fn: (u, v, o) => {
    const c = voronoi(u, v, 5, 171, 5, 1), crack = (c.f2 - c.f1) < 0.02;
    o.a = crack ? 0.82 : 0.96 + 0.04 * (fbm(u, v, 8, 173, 3) - 0.5); o.h = crack ? 0.2 : 0.6;
  } }),
  foil: () => ({ N: 512, tile: [3, 3], bump: 0.05, fn: (u, v, o) => {
    const c = voronoi(u, v, 14, 181, 14, 1); o.a = 0.84 + 0.16 * h2(c.id, 1, 183); o.h = h2(c.id, 2, 185) * (1 - c.f1 * 0.5);
  } }),
  metal: () => ({ N: 512, tile: [4, 4], bump: 0.004, fn: (u, v, o) => {
    // brushed streaks along u: high frequency across v only (the lattice is stretched by sampling u coarsely)
    const brush = vnoise(u, v, 8, 197, 512) * 0.6 + vnoise(u, v, 32, 199) * 0.4, b = vnoise(u, v, 4, 191);
    o.a = 0.9 + 0.08 * (brush - 0.5) + 0.04 * (b - 0.5); o.h = 0.5;
  } }),
  asphalt: () => ({ N: 512, tile: [6, 6], bump: 0.03, fn: (u, v, o) => {
    const g = vnoise(u, v, 256, 201), s = vnoise(u, v, 128, 203), m = fbm(u, v, 6, 205, 3);
    o.a = 0.8 + 0.16 * (g - 0.5) + (s > 0.88 ? 0.15 : 0) + 0.1 * (m - 0.5); o.h = g;
  } }),
  pavement: () => ({ N: 512, tile: [8, 8], bump: 0.05, fn: (u, v, o) => {
    const k = 4, x = u * k, y = v * k, e = Math.min(fract(x), 1 - fract(x), fract(y), 1 - fract(y)), id = Math.floor(x) + Math.floor(y) * k;
    const n = fbm(u, v, 16, 211, 3);
    o.a = e < 0.025 ? 0.55 : 0.84 + 0.08 * h2(id, 1, 213) + 0.08 * (n - 0.5); o.h = e < 0.025 ? 0 : 0.7 + 0.2 * n;
  } }),
  rock: () => ({ N: 512, tile: [10, 10], bump: 0.08, shade: 1.4, fn: (u, v, o) => {
    const n = fbm(u, v, 6, 221, 5), c = voronoi(u, v, 5, 223, 5, 1), e = c.f2 - c.f1;
    o.h = clamp01(e * 3) * 0.6 + 0.4 * n; o.a = 0.72 + 0.22 * (n - 0.5) + 0.12 * h2(c.id, 1, 225) - (e < 0.04 ? 0.15 : 0);
  } }),
  snow: () => ({ N: 256, tile: [8, 8], bump: 0.02, fn: (u, v, o) => { const n = fbm(u, v, 8, 231, 4); o.a = 0.97 + 0.03 * (n - 0.5); o.h = n; } }),
  mud: () => ({ N: 256, tile: [8, 8], bump: 0.02, fn: (u, v, o) => { const n = fbm(u, v, 6, 241, 5); o.a = 0.8 + 0.16 * (n - 0.5); o.h = n; } }),
  sandstone: () => ({ N: 512, tile: [8, 8], bump: 0.03, shade: 0.8, fn: (u, v, o) => {
    const w = fbm(u, v, 4, 251, 3), band = Math.sin((v * 9 + w * 1.5) * Math.PI * 2) * 0.5 + 0.5, g = vnoise(u, v, 128, 253);
    o.a = 0.84 + 0.1 * band + 0.06 * (g - 0.5); o.h = 0.5 * band + 0.3 * g;
  } }),
  roofshingles: () => ({ N: 512, tile: [4, 4], bump: 0.06, fn: (u, v, o) => {
    const rows = 8, r = Math.floor(v * rows), pv = v * rows - r, cu = u * 4 + (r % 2) * 0.5, c = Math.floor(cu), pu = cu - c;
    const id = mod(c, 4) + r * 4, gap = Math.min(pu, 1 - pu) < 0.03;
    o.a = gap ? 0.5 : (0.72 + 0.16 * h2(id, 1, 261)) * (0.75 + 0.25 * pv) + 0.05 * (vnoise(u, v, 128, 263) - 0.5);
    o.h = gap ? 0 : pv;
  } }),
  clayrooftiles: () => ({ N: 512, tile: [4, 4], bump: 0.07, shade: 0.6, fn: (u, v, o) => {
    const rows = 6, r = Math.floor(v * rows), pv = v * rows - r, cu = u * 5 + (r % 2) * 0.5, pu = fract(cu);
    const arch = Math.sin(pu * Math.PI);
    o.a = (0.74 + 0.1 * h2(Math.floor(cu) + r * 9, 1, 271)) * (0.7 + 0.3 * arch) * (0.8 + 0.2 * pv); o.h = arch * 0.7 + pv * 0.3;
  } }),
  ceramictiles: () => ({ N: 512, tile: [4, 4], bump: 0.04, fn: (u, v, o) => {
    const k = 4, e = Math.min(fract(u * k), 1 - fract(u * k), fract(v * k), 1 - fract(v * k));
    o.a = e < 0.03 ? 0.7 : 0.95 + 0.03 * (vnoise(u, v, 32, 281) - 0.5); o.h = e < 0.03 ? 0 : 0.8;
  } }),
  carpet: () => ({ N: 256, tile: [3, 3], bump: 0.02, fn: (u, v, o) => { const n = vnoise(u, v, 128, 291), m = fbm(u, v, 8, 293, 3); o.a = 0.85 + 0.1 * (n - 0.5) + 0.06 * (m - 0.5); o.h = n; } }),
  plaster: () => ({ N: 256, tile: [8, 8], bump: 0.015, fn: (u, v, o) => { const n = fbm(u, v, 8, 301, 5); o.a = 0.95 + 0.05 * (n - 0.5); o.h = n; } }),
  cardboard: () => ({ N: 256, tile: [3, 3], bump: 0.02, fn: (u, v, o) => { const s = Math.sin(u * 60 * Math.PI) * 0.5 + 0.5, n = vnoise(u, v, 64, 311); o.a = 0.88 + 0.04 * s + 0.06 * (n - 0.5); o.h = s; } }),
  leather: () => ({ N: 256, tile: [3, 3], bump: 0.03, fn: (u, v, o) => { const c = voronoi(u, v, 24, 321, 24, 1); o.a = 0.86 + 0.08 * (c.f1 - 0.3); o.h = c.f1; } }),
  corroded: () => ({ N: 512, tile: [6, 6], bump: 0.04, shade: 0.8, fn: (u, v, o) => { const n = fbm(u, v, 6, 331, 5), s = vnoise(u, v, 96, 333); o.a = 0.75 + 0.3 * (n - 0.5) + 0.08 * (s - 0.5); o.h = n; } }),
  forcefield: () => ({ N: 256, tile: [8, 8], bump: 0, fn: (u, v, o) => { const n = fbm(u, v, 6, 341, 4); o.a = 0.3 + 0.7 * Math.pow(n, 2); o.h = n; } }),
};

const cache = new Map();
// -> { canvas, tile, bump, mean }. `name` is a generator key (see materials.js for the material -> texture map).
export function proceduralTexture(name) {
  if (!cache.has(name)) {
    const g = GEN[name];
    if (!g) throw new Error(`world: no procedural texture "${name}"`);
    const spec = g();
    cache.set(name, { canvas: render(spec.N, spec.fn, { shade: spec.shade ?? 0 }), tile: spec.tile, bump: spec.bump ?? 0 });
  }
  return cache.get(name);
}
export const TEXTURE_NAMES = Object.keys(GEN);
