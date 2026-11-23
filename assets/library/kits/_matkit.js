// Shared library helper (browser only: imports three; the leading "_" keeps library.mjs from indexing it).
// Harvested from "The Last Bite" sets_kit.js (materials + instancing) and "The Glass Rain" gr_tex.js (ground shader),
// extended for "The Ropes" (giant wet-stone skin, teeth, cloud, meadow grass, flowers). Kits load it with
//   const { makeKit } = await import('./_matkit.js');   (dynamic: kits must stay importable in Node for their meta)
//
// Why not S.part? Stock Roblox materials tile visibly (4-8 stud tiles) on 1000-stud walls. Here every material is a
// stud-mapped procedural texture (R = albedo, G = height/bump, B = second-colour mask) with a shader overlay that
// breaks the tiling up in WORLD space: low-frequency tone patches, vertical grime streaks, moss on up-facing/recessed
// stone, roughness from height. Parts are instanced per (group, shape, material) so a 100-floor pit stays a few hundred
// draw calls. Everything is deterministic (seeded rng, hash noise, no clocks).
import * as THREE from 'three';
import { rng } from '../../../engine/runtime/core/math.js';
import { hash1, clamp } from '../../../engine/runtime/core/math.js';
import { GEO } from '../../../engine/runtime/world/index.js';
import { studCompile, worldCompile, addWorldUniforms, WORLD_UNIFORMS } from '../../../engine/runtime/world/materials.js';
import { proceduralTexture } from '../../../engine/runtime/world/textures.js';
import { toColor } from '../../../engine/runtime/world/palette.js';

// ------------------------------------------------------------------ procedural textures (R albedo, G height, B mask)
const fract = (x) => x - Math.floor(x);
const sm = (t) => t * t * (3 - 2 * t);
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mod = (a, n) => ((a % n) + n) % n;
const h2 = (x, y, s) => hash1((x * 73856093) ^ (y * 19349663), s);
function vnoise(u, v, p, s, py = p) {
  const x = u * p, y = v * py, ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const x0 = mod(ix, p), x1 = mod(ix + 1, p), y0 = mod(iy, py), y1 = mod(iy + 1, py);
  const a = h2(x0, y0, s), b = h2(x1, y0, s), c = h2(x0, y1, s), d = h2(x1, y1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(u, v, p, s, oct = 4) { let a = 0.5, t = 0, n = 0; for (let o = 0; o < oct; o++) { t += a * vnoise(u, v, p << o, s + o * 17); n += a; a *= 0.5; } return t / n; }
const VO = { f1: 0, f2: 0, id: 0 };
function voronoi(u, v, g, s, jitter = 0.85) {
  const x = u * g, y = v * g, ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = ix + i, cy = iy + j, wx = mod(cx, g), wy = mod(cy, g);
    const px = cx + 0.5 + (h2(wx, wy, s) - 0.5) * jitter, py = cy + 0.5 + (h2(wx, wy, s + 9) - 0.5) * jitter, d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = wx + wy * g; } else if (d < f2) f2 = d;
  }
  VO.f1 = f1; VO.f2 = f2; VO.id = id;
  return VO;
}
// irregular running-bond masonry layout (rows of varying height, blocks of varying width), tile-periodic
function courses(seed, nRows, minH, maxH, minW, maxW) {
  const r = rng(seed), rows = [];
  let hs = Array.from({ length: nRows }, () => minH + r() * (maxH - minH)); const sum = hs.reduce((a, b) => a + b, 0); hs = hs.map((x) => x / sum);
  let v0 = 0;
  for (const hh of hs) {
    let ws = [], tot = 0; while (tot < 1) { const w = minW + r() * (maxW - minW); ws.push(w); tot += w; }
    ws = ws.map((x) => x / tot);
    const blocks = []; let u0 = 0; for (const w of ws) { blocks.push([u0, u0 + w]); u0 += w; }
    rows.push({ v0, v1: v0 + hh, blocks }); v0 += hh;
  }
  return rows;
}
const rowOf = (rows, v) => rows.find((r) => v >= r.v0 && v < r.v1) ?? rows[rows.length - 1];

// fn(u, v, o) writes o.a (albedo), o.h (height), o.m (colour-2 mask). tile = studs per tile.
const GEN = {
  ashlar: () => { // dungeon masonry: big irregular blocks, chipped edges, pits, cracks, per-block tone
    const T = 14, rows = courses(11, 8, 0.7, 1.45, 0.14, 0.34);
    return { N: 1024, tile: [T, T], bump: 0.07, shade: 0.9, fn: (u, v, o) => {
      const row = rowOf(rows, v), b = row.blocks.find((q) => u >= q[0] && u < q[1]) ?? row.blocks[row.blocks.length - 1];
      const id = Math.floor(row.v0 * 977 + b[0] * 131), bu = (u - b[0]) * T, bw = (b[1] - b[0]) * T, bv = (v - row.v0) * T, bh = (row.v1 - row.v0) * T;
      const chip = vnoise(u, v, 96, 5) - 0.5, e = Math.min(bu, bw - bu, bv, bh - bv) + chip * 0.22;
      const n = fbm(u, v, 24, 3, 4), grain = vnoise(u, v, 256, 9), pit = vnoise(u, v, 192, 13), pits = pit > 0.9 ? (pit - 0.9) * 6 : 0;
      const crack = Math.abs(vnoise(u + 0.05 * n, v, 14, 21 + id % 5) - 0.5) < 0.012 ? 0.4 : 0;
      if (e < 0.075) { o.a = 0.32 + 0.1 * n; o.h = 0.05; return; }
      const bevel = c01((e - 0.075) / 0.2), tone = 0.68 + 0.3 * h2(id, 3, 7) + 0.16 * (n - 0.5) + 0.07 * (grain - 0.5);
      o.a = tone * (0.74 + 0.26 * bevel) * (1 - pits * 0.6) * (1 - crack); o.h = (0.5 + 0.38 * bevel) * (0.88 + 0.12 * n) - pits * 0.3 - crack * 0.4;
    } };
  },
  flag: () => ({ N: 1024, tile: [12, 12], bump: 0.07, shade: 1.4, fn: (u, v, o) => { // irregular worn flagstones
    const c = voronoi(u, v, 4, 31, 0.75), e = c.f2 - c.f1, n = fbm(u, v, 20, 33, 4), g = vnoise(u, v, 256, 35);
    if (e < 0.05) { o.a = 0.3 + 0.1 * n; o.h = 0.04; return; }
    const w = c01((e - 0.05) / 0.22), scuff = vnoise(u, v, 40, 37) > 0.78 ? 0.12 : 0;
    o.a = (0.66 + 0.3 * h2(c.id, 1, 39) + 0.2 * (n - 0.5) + 0.07 * (g - 0.5) - scuff) * (0.8 + 0.2 * w); o.h = (0.55 + 0.4 * Math.sqrt(w)) * (0.9 + 0.1 * n);
  } }),
  darkplanks: () => ({ N: 1024, tile: [8, 8], bump: 0.05, fn: (u, v, o) => { // wide worn planks with nails, knots, stains
    const rows = 6, r = Math.floor(v * rows), pv = v * rows - r, off = h2(r, 3, 41), su = (u + off) * 2, p = Math.floor(su), pu = su - p, id = r * 3 + mod(p, 3);
    const gap = Math.min(pu, 1 - pu) < 0.012 || Math.min(pv, 1 - pv) < 0.03;
    const grain = vnoise(u * 0.5 + h2(id, 5, 43), v, 6, 45 + id % 7, 160) * 0.55 + vnoise(u, v, 48, 47, 512) * 0.45;
    const kx = h2(id, 8, 49), ky = 0.3 + 0.4 * h2(id, 9, 51), kd = Math.hypot((pu - kx) * 2.6, (pv - ky) * 1.2), knot = h2(id, 6, 53) > 0.55 ? c01(1 - kd / 0.22) : 0;
    const nail = Math.hypot(Math.min(pu, 1 - pu) * 2.5 - 0.09, pv - 0.5) < 0.03 ? 1 : 0, stain = fbm(u, v, 6, 55, 3);
    o.a = gap ? 0.2 : (0.55 + 0.35 * h2(id, 7, 57) + 0.16 * (grain - 0.5) - 0.2 * knot - 0.18 * Math.max(0, stain - 0.55) * 3 - 0.28 * nail * 0 + 0.0) * (nail ? 0.45 : 1);
    o.h = gap ? 0 : 0.72 + 0.2 * grain - 0.25 * knot + 0.12 * nail;
  } }),
  rug: () => ({ N: 1024, tile: [10, 10], bump: 0.04, fn: (u, v, o) => { // ornate diamond lattice + borders; B = gold motif
    const x = u - 0.5, y = v - 0.5, r = Math.abs(x) + Math.abs(y), rr = Math.max(Math.abs(x), Math.abs(y));
    const fx = fract(u * 5), fy = fract(v * 5), dm = Math.abs(fx - 0.5) + Math.abs(fy - 0.5), weave = vnoise(u, v, 256, 61);
    let m = 0, a = 0.78;
    if (dm < 0.34) { m = 1; a = 0.95; if (dm < 0.17) { m = 0; a = 0.7; if (dm < 0.07) { m = 1; a = 1; } } }
    const band = (rr * 10) % 1;
    if (rr > 0.44) { m = band < 0.5 ? 1 : 0; a = 0.9; } else if (rr > 0.4) { m = 0; a = 0.62; }
    void r;
    o.a = (a + 0.06 * (weave - 0.5)) * (0.94 + 0.06 * fbm(u, v, 12, 63, 3)); o.m = m; o.h = 0.5 + 0.35 * weave;
  } }),
  damask: () => ({ N: 512, tile: [6, 8], bump: 0.02, fn: (u, v, o) => { // wallpaper: vertical stripes + fleur lozenges
    const fx = fract(u * 2) - 0.5, fy = fract(v * 2) - 0.5, ang = Math.atan2(fy, fx), rad = Math.hypot(fx * 1.2, fy), petal = 0.26 + 0.07 * Math.cos(ang * 6);
    const motif = rad < petal && rad > petal - 0.1 ? 1 : (rad < 0.07 ? 1 : 0), stripe = Math.abs(fract(u * 8) - 0.5) < 0.04 ? 1 : 0;
    const d2 = Math.hypot(fract(u * 2 + 0.5) - 0.5, fract(v * 2 + 0.5) - 0.5), small = d2 < 0.09 ? 1 : 0;
    const m = Math.max(motif, stripe * 0.9, small);
    o.m = m; o.a = 0.84 + 0.1 * m + 0.06 * (vnoise(u, v, 64, 65) - 0.5); o.h = 0.4 + 0.4 * m;
  } }),
  marblecheck: () => ({ N: 1024, tile: [8, 8], bump: 0.006, fn: (u, v, o) => { // polished black/white marble squares with veins
    const k = 4, cx = Math.floor(u * k), cy = Math.floor(v * k), dark = (cx + cy) % 2, e = Math.min(fract(u * k), 1 - fract(u * k), fract(v * k), 1 - fract(v * k));
    const w = fbm(u, v, 4, 67 + dark * 5, 5), vein = Math.pow(1 - Math.abs(Math.sin((u * 5 + v * 3 + w * 6) * Math.PI)), 12), cloud = fbm(u, v, 12, 69, 4);
    o.m = dark; o.a = e < 0.008 ? 0.35 : 0.88 - 0.34 * vein - 0.12 * cloud; o.h = e < 0.008 ? 0 : 0.7;
  } }),
  linen: () => ({ N: 512, tile: [4, 4], bump: 0.03, fn: (u, v, o) => { // table cloth weave with faint check and darned stains
    const k = 48, x = u * k, y = v * k, warp = (Math.floor(x) + Math.floor(y)) % 2 === 0, t = warp ? Math.sin(fract(y) * Math.PI) : Math.sin(fract(x) * Math.PI);
    const chk = (Math.floor(u * 4) + Math.floor(v * 4)) % 2 ? 0.04 : 0, st = Math.max(0, fbm(u, v, 5, 71, 4) - 0.6) * 0.9;
    o.a = 0.86 + 0.1 * t + chk - st + 0.04 * (vnoise(u, v, 96, 73) - 0.5); o.h = t * 0.8; o.m = 0;
  } }),
  caverock: () => ({ N: 1024, tile: [22, 22], bump: 0.09, shade: 1.6, fn: (u, v, o) => { // faceted rock with strata + cracks
    const c = voronoi(u, v, 5, 81, 0.95), e = c.f2 - c.f1, n = fbm(u, v, 10, 83, 5), strata = Math.sin((v * 14 + n * 3) * Math.PI * 2) * 0.5 + 0.5;
    const facet = h2(c.id, 3, 85), crack = e < 0.035 ? 0.45 : 1;
    o.a = (0.5 + 0.28 * facet + 0.2 * (n - 0.5) + 0.06 * strata) * crack; o.h = (0.35 + 0.5 * facet + 0.2 * n) * (e < 0.035 ? 0.4 : 1);
  } }),
  skin: () => ({ N: 512, tile: [10, 10], bump: 0.03, shade: 0.5, fn: (u, v, o) => { // pale starved skin: blotches, veins (B = blue vein mask), pores
    const n = fbm(u, v, 6, 91, 5), w = fbm(u, v, 5, 93, 4), vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + w * 4 + v) * Math.PI)), 22), pore = vnoise(u, v, 192, 95);
    o.m = c01(vein * 1.2) * 0.38; o.a = 0.8 + 0.22 * (n - 0.5) - 0.12 * (pore > 0.9 ? 1 : 0) - 0.12 * vein; o.h = 0.5 + 0.2 * n + 0.1 * pore;
  } }),
  chain: () => ({ N: 256, tile: [1.6, 2.6], bump: 0.1, shade: 1.0, fn: (u, v, o) => { // vertical chain links on dark ground
    const ring = (cx, cy, rx, ry) => { const d = Math.hypot((u - cx) / rx, (v - cy) / ry); return d < 1 && d > 0.55; };
    const faceon = ring(0.5, 0.25, 0.34, 0.24) || ring(0.5, 0.75, 0.34, 0.24) && false;
    const edge = Math.abs(u - 0.5) < 0.09 && v > 0.45 && v < 1.0, edge2 = Math.abs(u - 0.5) < 0.09 && (v < 0.03 || v > 0.97);
    const on = faceon || edge || edge2;
    o.a = on ? 0.85 + 0.15 * h2(Math.floor(v * 10), 1, 97) : 0.12; o.h = on ? 0.9 : 0.1;
  } }),
  bone: () => ({ N: 256, tile: [4, 4], bump: 0.02, fn: (u, v, o) => { const n = fbm(u, v, 8, 101, 4), s = vnoise(u, v, 96, 103); o.a = 0.9 + 0.1 * (n - 0.5) - 0.08 * (s > 0.85 ? 1 : 0); o.h = n; } }),
  wetstone: () => ({ N: 1024, tile: [60, 60], bump: 0.08, shade: 1.1, fn: (u, v, o) => { // giant skin: few big stone plates, thin deep cracks, pits, wet mottling
    const c = voronoi(u + 0.06 * (vnoise(u, v, 6, 201) - 0.5), v + 0.04 * (vnoise(u, v, 7, 202) - 0.5), 4, 203, 0.95), e = c.f2 - c.f1, n = fbm(u, v, 10, 205, 5), g = vnoise(u, v, 256, 207);
    const hair = Math.abs(vnoise(u + 0.1 * n, v, 12, 209) - 0.5) < 0.006 && vnoise(u, v, 5, 217) > 0.55 ? 1 : 0, pit = vnoise(u, v, 128, 211), pits = pit > 0.88 ? (pit - 0.88) * 5 : 0;
    const crack = e < 0.015 + 0.009 * vnoise(u, v, 20, 219) ? 1 : 0, rim = c01(1 - Math.abs(e - 0.03) / 0.02) * (1 - crack);
    const tone = 0.7 + 0.14 * h2(c.id, 2, 213) + 0.28 * (n - 0.5) + 0.06 * (g - 0.5);
    o.a = crack ? 0.02 + 0.03 * n : tone * (1 - 0.6 * hair) * (1 - pits * 0.6) * (1 + 0.08 * rim);
    o.h = crack ? 0.05 : (0.6 + 0.25 * c01(e * 8)) * (0.85 + 0.15 * n) - pits * 0.3 - hair * 0.25;
    o.m = c01((fbm(u, v, 4, 215, 3) - 0.5) * 3); // wet dark mottling (colour 2)
  } }),
  enamel: () => ({ N: 512, tile: [6, 10], bump: 0.03, fn: (u, v, o) => { // long old teeth: vertical streaks, chips, stain bands (B)
    const n = fbm(u, v, 6, 221, 4), st = vnoise(u * 0.3, v, 4, 223, 40), band = Math.abs(fract(v * 3 + 0.2 * n) - 0.5) < 0.04 ? 1 : 0;
    o.a = 0.86 + 0.12 * (st - 0.5) + 0.06 * (n - 0.5) - 0.2 * band; o.h = 0.6 + 0.2 * st - 0.3 * band; o.m = c01(n * 1.6 - 0.55) + band * 0.6;
  } }),
  crust: () => ({ N: 512, tile: [3, 3], bump: 0.05, fn: (u, v, o) => { // bread / roast skin: blistered, darker in pits
    const c = voronoi(u, v, 10, 105, 1), n = fbm(u, v, 12, 107, 4); o.a = 0.72 + 0.26 * c.f1 * 1.4 + 0.12 * (n - 0.5); o.h = 0.4 + 0.5 * c.f1; o.m = c01(n * 1.3 - 0.35);
  } }),
};

const texCache = new Map();
let aniso = 8;
function renderTex(spec) {
  const N = spec.N, canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
  const A = new Float32Array(N * N), H = new Float32Array(N * N), M = new Float32Array(N * N), o = { a: 1, h: 0.5, m: 0 };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { o.a = 1; o.h = 0.5; o.m = 0; spec.fn((x + 0.5) / N, (y + 0.5) / N, o); A[y * N + x] = o.a; H[y * N + x] = o.h; M[y * N + x] = o.m; }
  const sh = spec.shade ?? 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; let a = A[i];
    if (sh) a *= 1 + sh * (H[mod(y - 1, N) * N + mod(x - 1, N)] - H[mod(y + 1, N) * N + mod(x + 1, N)]) * (N / 512);
    d[i * 4] = c01(a) * 255; d[i * 4 + 1] = c01(H[i]) * 255; d[i * 4 + 2] = c01(M[i]) * 255; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
function texFor(gen) {
  if (!texCache.has(gen)) {
    let canvas, tile, bump;
    if (GEN[gen]) { const s = GEN[gen](); canvas = renderTex(s); tile = s.tile; bump = s.bump; } else { const p = proceduralTexture(gen); canvas = p.canvas; tile = p.tile; bump = p.bump; }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.userData = { tile, bump };
    texCache.set(gen, t);
  }
  return texCache.get(gen);
}

// ------------------------------------------------------------------ shader overlay
const NOISE_GLSL = /* glsl */`
varying vec3 vSP; varying vec3 vWN;
uniform float uVar, uMoss, uGrime, uUse2; uniform vec3 uColor2, uMossCol;
float hTex = 0.5; float tlbMoss = 0.0;
float tH(vec3 p){ p = fract(p*0.3183099+vec3(0.1)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float tN(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(tH(i),tH(i+vec3(1,0,0)),f.x),mix(tH(i+vec3(0,1,0)),tH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(tH(i+vec3(0,0,1)),tH(i+vec3(1,0,1)),f.x),mix(tH(i+vec3(0,1,1)),tH(i+vec3(1,1,1)),f.x),f.y),f.z); }
`;
const MAP_FRAG = /* glsl */`
#ifdef USE_MAP
{
	vec4 tx = texture2D( map, vMapUv );
	hTex = tx.g;
	vec3 base = diffuseColor.rgb;
	vec3 c1 = base * tx.r;
	vec3 c2 = uColor2 * tx.r;
	#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
		c2 /= max( vColor.rgb, vec3( 0.03 ) ); // instance colour is multiplied later (color_fragment); keep colour 2 untinted
	#endif
	diffuseColor.rgb = mix( c1, c2, tx.b * uUse2 );
	vec3 q = vSP;
	float lo = tN( q * 0.035 ) * 0.6 + tN( q * 0.11 ) * 0.4;
	diffuseColor.rgb *= mix( 1.0, 0.55 + 0.95 * lo, uVar );
	diffuseColor.rgb *= vec3( 1.0 + 0.1 * ( tN( q * 0.07 + 3.1 ) - 0.5 ), 1.0, 1.0 - 0.1 * ( tN( q * 0.07 + 3.1 ) - 0.5 ) );
	float gr = tN( vec3( q.x * 0.9, q.y * 0.045, q.z * 0.9 ) ) * 0.65 + tN( vec3( q.x * 0.2, q.y * 0.02, q.z * 0.2 ) ) * 0.35;
	diffuseColor.rgb *= 1.0 - uGrime * smoothstep( 0.42, 0.78, gr ) * 0.62;
	float ms = tN( q * 0.15 ) * 0.7 + tN( q * 0.6 ) * 0.3;
	tlbMoss = smoothstep( 0.52, 0.74, ms + vWN.y * 0.22 + ( 0.5 - hTex ) * 0.4 ) * uMoss;
	diffuseColor.rgb = mix( diffuseColor.rgb, uMossCol * ( 0.65 + 0.7 * tN( q * 1.8 ) ), tlbMoss );
}
#endif
`;
function tlbCompile(shader) {
  studCompile.call(this, shader);
  const u = this.userData;
  Object.assign(shader.uniforms, { uVar: { value: u.v }, uMoss: { value: u.moss }, uGrime: { value: u.grime }, uUse2: { value: u.color2 ? 1 : 0 },
    uColor2: { value: u.color2 ?? new THREE.Color(0, 0, 0) }, uMossCol: { value: u.mossCol } });
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSP; varying vec3 vWN;')
    .replace('suv /= studTile;', `suv /= studTile; vSP = sp; vec3 wn_ = objectNormal;
		#ifdef USE_INSTANCING
			wn_ = mat3( instanceMatrix ) * wn_;
		#endif
		vWN = normalize( mat3( modelMatrix ) * wn_ );`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE_GLSL)
    .replace('#ifdef USE_MAP\n\tdiffuseColor.rgb *= texture2D( map, vMapUv ).r;\n#endif', MAP_FRAG)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = clamp( roughnessFactor * ( 0.78 + 0.5 * ( 1.0 - hTex ) ) + tlbMoss * 0.12, 0.04, 1.0 );');
}

// name: { gen, rough, metal, color (default / uncoloured), v (tone variation 0..1), moss, grime, tile (stud-tile scale), bump (scale), color2 }
export const MATS = {
  stone: { gen: 'ashlar', rough: 0.86, color: '#a39a88', v: 0.7, moss: 0.08, grime: 0.45 },
  stoneMoss: { gen: 'ashlar', rough: 0.82, color: '#8f9283', v: 0.75, moss: 0.6, grime: 0.7 },
  stoneWet: { gen: 'ashlar', rough: 0.5, color: '#6f776e', v: 0.8, moss: 0.95, grime: 0.9 },
  marble: { gen: 'marblecheck', rough: 0.22, color: '#f2efe6', color2: '#23222a', v: 0.25, moss: 0, grime: 0.12 },
  marbleWhite: { gen: 'marble', rough: 0.25, color: '#efece4', v: 0.3, moss: 0, grime: 0.1 },
  flag: { gen: 'flag', rough: 0.88, color: '#8e877a', v: 0.8, moss: 0.3, grime: 0.7 },
  flagClean: { gen: 'flag', rough: 0.6, color: '#b6ab98', v: 0.5, moss: 0, grime: 0.25 },
  planks: { gen: 'darkplanks', rough: 0.72, color: '#7a6247', v: 0.6, moss: 0, grime: 0.55 },
  planksClean: { gen: 'darkplanks', rough: 0.55, color: '#9a7a52', v: 0.4, moss: 0, grime: 0.2 },
  wood: { gen: 'wood', rough: 0.7, color: '#6a4a30', v: 0.4, moss: 0, grime: 0.3 },
  beam: { gen: 'wood', rough: 0.8, color: '#3c2a1c', v: 0.5, moss: 0, grime: 0.5, tile: 2 },
  rust: { gen: 'corroded', rough: 0.72, metal: 0.45, color: '#8a5a3a', v: 0.9, moss: 0, grime: 0.6 },
  iron: { gen: 'corroded', rough: 0.55, metal: 0.7, color: '#3a3c40', v: 0.6, moss: 0, grime: 0.5 },
  steel: { gen: 'metal', rough: 0.4, metal: 0.75, color: '#8a8f94', v: 0.3, moss: 0, grime: 0.3 },
  gold: { gen: 'metal', rough: 0.22, metal: 0.85, color: '#e0b04a', v: 0.15, moss: 0, grime: 0.0 },
  brass: { gen: 'metal', rough: 0.35, metal: 0.8, color: '#b88a3a', v: 0.4, moss: 0, grime: 0.3 },
  linkIron: { gen: 'metal', rough: 0.6, metal: 0.0, color: '#9a9a9e', v: 0.4, moss: 0, grime: 0.4 },
  chain: { gen: 'chain', rough: 0.45, metal: 0.8, color: '#a8a8ae', v: 0.3, moss: 0, grime: 0.4 },
  cloth: { gen: 'fabric', rough: 0.92, color: '#a09080', v: 0.5, moss: 0, grime: 0.25 },
  linen: { gen: 'linen', rough: 0.9, color: '#efe9da', v: 0.2, moss: 0, grime: 0.12 },
  linenOld: { gen: 'linen', rough: 0.95, color: '#c9bfa6', v: 0.5, moss: 0, grime: 0.5 },
  velvet: { gen: 'carpet', rough: 0.98, color: '#7a1f2c', v: 0.35, moss: 0, grime: 0.08 },
  rug: { gen: 'rug', rough: 0.95, color: '#7a1c28', color2: '#e0b24a', v: 0.25, moss: 0, grime: 0.15 },
  rugWorn: { gen: 'rug', rough: 0.98, color: '#5a3a30', color2: '#8a7048', v: 0.6, moss: 0, grime: 0.5 },
  damask: { gen: 'damask', rough: 0.7, color: '#8a1f2d', color2: '#e8c35a', v: 0.15, moss: 0, grime: 0.05 },
  damaskCream: { gen: 'damask', rough: 0.7, color: '#f1e6cd', color2: '#d8b45e', v: 0.15, moss: 0, grime: 0.05 },
  plaster: { gen: 'plaster', rough: 0.95, color: '#cdbf9f', v: 0.75, moss: 0.05, grime: 0.7 },
  leather: { gen: 'leather', rough: 0.55, color: '#5a3a24', v: 0.4, moss: 0, grime: 0.3 },
  rock: { gen: 'caverock', rough: 0.9, color: '#5c6068', v: 0.85, moss: 0.1, grime: 0.6 },
  rockWet: { gen: 'caverock', rough: 0.4, color: '#3c4350', v: 0.85, moss: 0.35, grime: 0.8 },
  skin: { gen: 'skin', rough: 0.88, color: '#a2a6ae', color2: '#6a7490', v: 0.5, moss: 0, grime: 0.3, bump: 0.7 },
  bone: { gen: 'bone', rough: 0.45, color: '#e4d9bb', v: 0.4, moss: 0, grime: 0.35 },
  crust: { gen: 'crust', rough: 0.5, color: '#b0703a', color2: '#6a3a18', v: 0.3, moss: 0, grime: 0 },
  bread: { gen: 'crust', rough: 0.8, color: '#c8944e', color2: '#8a5a28', v: 0.4, moss: 0, grime: 0 },
  ceramic: { gen: 'plastic', rough: 0.18, color: '#f3f0e8', v: 0.1, moss: 0, grime: 0.1 },
  clay: { gen: 'concrete', rough: 0.8, color: '#9a5a3a', v: 0.6, moss: 0, grime: 0.3 },
  food: { gen: 'plastic', rough: 0.55, color: '#c0a060', v: 0.3, moss: 0, grime: 0 },
  glassy: { gen: 'plastic', rough: 0.08, color: '#9fb4c0', v: 0, moss: 0, grime: 0, kind: 'glass' },
  dirt: { gen: 'ground', rough: 0.95, color: '#5a4a38', v: 0.8, moss: 0.2, grime: 0.5 },
  paint: { gen: 'plaster', rough: 0.6, color: '#e8e0d0', v: 0.15, moss: 0, grime: 0.1 },
  // --- The Ropes: giant + village
  giantSkin: { gen: 'wetstone', rough: 0.42, color: '#868b92', color2: '#4c535c', v: 0.55, moss: 0.12, grime: 0.55, bump: 1.2 },
  giantSkinDark: { gen: 'wetstone', rough: 0.36, color: '#5f656e', color2: '#363c45', v: 0.5, moss: 0.08, grime: 0.6, bump: 1.2, tile: 0.6 },
  knuckle: { gen: 'caverock', rough: 0.5, color: '#7a8088', v: 0.7, moss: 0.2, grime: 0.6 },
  tooth: { gen: 'enamel', rough: 0.38, color: '#d9cfae', color2: '#8a7a4a', v: 0.35, moss: 0, grime: 0.35 },
  nail: { gen: 'enamel', rough: 0.3, color: '#b8a878', color2: '#5a4a2a', v: 0.4, moss: 0, grime: 0.4 },
  gum: { gen: 'skin', rough: 0.35, color: '#3a1a1e', color2: '#1a0a0c', v: 0.3, moss: 0, grime: 0.2 },
  maw: { gen: 'plaster', rough: 0.9, color: '#120708', v: 0.2, moss: 0, grime: 0 },
  eyeball: { gen: 'skin', rough: 0.22, color: '#d8cfae', color2: '#9a3a2a', v: 0.25, moss: 0, grime: 0.25 },
  rag: { gen: 'fabric', rough: 0.95, color: '#4a4038', v: 0.6, moss: 0, grime: 0.6, tile: 3 },
  petal: { gen: 'plastic', rough: 0.6, color: '#ffffff', v: 0.1, moss: 0, grime: 0 },
  leaf: { gen: 'grass', rough: 0.8, color: '#4f7a30', v: 0.5, moss: 0, grime: 0.1 },
  soil: { gen: 'ground', rough: 0.95, color: '#5a4230', v: 0.6, moss: 0.05, grime: 0.3 },
  thatch: { gen: 'wood', rough: 0.95, color: '#b49a5c', v: 0.5, moss: 0.2, grime: 0.5, tile: 0.5 },
  rope: { gen: 'fabric', rough: 0.92, color: '#cdb88e', v: 0.3, moss: 0, grime: 0.3, tile: 0.4 },
  plasterOld: { gen: 'plaster', rough: 0.95, color: '#d9ccb0', v: 0.7, moss: 0.1, grime: 0.6 },
};

// ------------------------------------------------------------------ the kit
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
const D2R = Math.PI / 180;
const LB = new THREE.SphereGeometry(0.5, 14, 10), HB = new THREE.SphereGeometry(0.5, 40, 26);
const Z90 = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
const GEOS = { block: GEO.block, wedge: GEO.wedge, cornerwedge: GEO.cornerwedge, cylinder: GEO.cylinder, vcyl: GEO.cylinder, ball: LB, hball: HB };

export function makeKit(S) {
  aniso = Math.min(16, S.renderer.capabilities.getMaxAnisotropy());
  const mats = new Map(), batches = new Map(), frames = [new THREE.Matrix4()], parents = [S.root];
  const mossCol = new THREE.Color('#4f6a34');

  function material(name, { fog = true } = {}) {
    const key = name + (fog ? '' : '|nofog');
    if (mats.has(key)) return mats.get(key);
    let m;
    if (name === 'halo') { // soft additive light pool (fake bounce light round torches/lamps); colour x gain = intensity
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      m = new THREE.MeshBasicMaterial({ map: t, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
      m.onBeforeCompile = worldCompile;
    } else if (name === 'neon' || name === 'neonEyes') {
      m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: name === 'neon' });
      m.onBeforeCompile = worldCompile;
    } else {
      const d = MATS[name];
      if (!d) throw new Error(`kit: unknown material "${name}"`);
      const tex = texFor(d.gen);
      m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: d.rough, metalness: d.metal ?? 0, map: tex, bumpMap: tex, bumpScale: (tex.userData.bump || 0.03) * 10 * (d.bump ?? 1),
        envMapIntensity: 0.6 + (d.metal ?? 0) * 0.8, fog });
      if (d.kind === 'glass') { m.transparent = true; m.opacity = 0.38; m.depthWrite = false; m.envMapIntensity = 1.6; }
      m.defines = { STUD_MAP: '' };
      m.userData = { studTile: new THREE.Vector2(tex.userData.tile[0] * (d.tile ?? 1), tex.userData.tile[1] * (d.tile ?? 1)), v: d.v ?? 0.5, moss: d.moss ?? 0, grime: d.grime ?? 0,
        color2: d.color2 ? toColor(d.color2) : null, mossCol };
      m.onBeforeCompile = tlbCompile;
      m.customProgramCacheKey = () => 'tlb-v1';
      m.name = `tlb:${name}`;
    }
    mats.set(key, m);
    return m;
  }

  const X = {
    S, rng, mat: material, MATS,
    // --- frames / groups
    // X.at([x,y,z], yawDeg, fn): local frame for parts built inside fn (also lights/texts via X.w()).
    at(pos, yaw, fn) {
      const f = frames[frames.length - 1].clone().multiply(tmpM.compose(tmpV.set(...pos), tmpQ.setFromAxisAngle(tmpS.set(0, 1, 0), (yaw ?? 0) * D2R), tmpS.set(1, 1, 1)));
      frames.push(f);
      try { return fn(); } finally { frames.pop(); }
    },
    w(p) { return tmpV.set(...p).applyMatrix4(frames[frames.length - 1]).toArray(); }, // local -> set coordinates
    // animatable group: pivot in set coordinates (the frame's origin when built inside X.at is ignored for pivot: pass absolute)
    group(name, opts, build) {
      if (typeof opts === 'function') { build = opts; opts = {}; }
      const pivot = opts.pivot ? X.w(opts.pivot) : [0, 0, 0];
      return S.group(name, { ...opts, pivot, parent: opts.parent }, (outer) => {
        parents.push(outer.userData.inner);
        try { build?.(outer); } finally { parents.pop(); }
      });
    },
    cur: () => parents[parents.length - 1],
    // --- parts
    p(o) {
      const shape = o.shape ?? 'block', mat = o.mat ?? 'stone';
      const geo = GEOS[shape];
      if (!geo) throw new Error(`kit: bad shape ${shape}`);
      const [sx, sy, sz] = o.size ?? [1, 1, 1];
      let sc;
      if (shape === 'cylinder') sc = [sx, Math.min(sy, sz), Math.min(sy, sz)];
      else if (shape === 'vcyl') sc = [sy, Math.min(sx, sz), Math.min(sx, sz)];
      else if (shape === 'ball' || shape === 'hball') sc = [sx, sy, sz]; // ellipsoids allowed
      else sc = [sx, sy, sz];
      const r = o.rot ?? [0, 0, 0], pos = o.pos ?? [0, 0, 0];
      if (![...pos, ...r, ...sc].every(Number.isFinite)) throw new Error(`kit: non-finite part ${JSON.stringify(o)}`);
      tmpE.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ');
      const M = new THREE.Matrix4().compose(tmpV.set(...pos), tmpQ.setFromEuler(tmpE), tmpS.set(...sc)).premultiply(frames[frames.length - 1]);
      if (shape === 'vcyl') { // cylinder axis X -> Y
        const Mv = new THREE.Matrix4().compose(tmpV.set(...pos), tmpQ.setFromEuler(tmpE), tmpS.set(1, 1, 1));
        M.copy(frames[frames.length - 1]).multiply(Mv).multiply(tmpM.makeRotationZ(Math.PI / 2)).multiply(tmpM.makeScale(sc[0], sc[1], sc[2]));
      }
      const parent = o.parent ?? parents[parents.length - 1], key = `${parent.uuid}|${shape}|${mat}|${o.fog === false ? 0 : 1}|${o.shadow === false ? 0 : 1}`;
      if (!batches.has(key)) batches.set(key, { geo, mat: material(mat, { fog: o.fog !== false }), parent, M: [], C: [], cast: o.shadow !== false && mat !== 'neon' && mat !== 'glassy' && mat !== 'halo' });
      const b = batches.get(key);
      const col = toColor(o.color ?? (MATS[mat]?.color ?? '#ffffff'));
      if (mat === 'neon' || mat === 'neonEyes' || mat === 'halo') col.multiplyScalar(o.gain ?? 4.5);
      b.M.push(M); b.C.push(col);
    },
    // box helper (most things): X.b(mat, [sx,sy,sz], [x,y,z], color, rot)
    b(mat, size, pos, color, rot) { X.p({ mat, size, pos, color, rot }); },
    flush() {
      for (const b of batches.values()) {
        const im = new THREE.InstancedMesh(b.geo, b.mat, b.M.length);
        b.M.forEach((M, i) => { im.setMatrixAt(i, M); im.setColorAt(i, b.C[i]); });
        im.castShadow = b.cast; im.receiveShadow = true; im.computeBoundingSphere(); im.computeBoundingBox?.();
        b.parent.add(im);
      }
      batches.clear();
    },
    // per-frame hook (global time t; pure). Runs inside world.updateSet before the shot's own update().
    onFrame(fn) { S.texts.push({ update: fn }); },
    // lights handle (set coordinates; rides with the current group)
    light(o) { return S.light({ type: 'point', ...o, pos: X.w(o.pos ?? [0, 0, 0]) }); },
    text(o) { // frame yaw is added so text on rotated sides faces the right way
      const m = frames[frames.length - 1], yaw = (Math.atan2(m.elements[8], m.elements[0]) * 180) / Math.PI, r = o.rot ?? [0, 0, 0];
      return S.text({ px: 64, ...o, pos: X.w(o.pos), rot: [r[0], r[1] + yaw, r[2]] });
    },
  };
  return X;
}

export { GEN as TEXTURE_GENERATORS };

// ================================================================== ground (from "The Glass Rain" gr_tex.js, dry)
// groundMaterial(S, { rect: [x0,z0,x1,z1], macro: (x, z) => [dirt, moss, unused, tintSel] (0..1), tex: 'cobblestone' |
//   'grass' | 'ground' | ..., colA, colB, mud, moss, mud2, bump, edge (ragged edge studs), y, res, parent, tile })
// One big non-tiling plane: 3 rotated samples of the stud texture blended by the macro map + dirt / moss layers and a
// ragged discard edge (put it 0.2+ studs above any surface it overlaps: never coplanar).
const n2h = (x, y, s) => hash1((x * 73856093) ^ (y * 19349663), s);
export function noise2(x, y, s = 1) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const a = n2h(ix, iy, s), b = n2h(ix + 1, iy, s), c = n2h(ix, iy + 1, s), d = n2h(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm2(x, y, s = 1, oct = 4) {
  let a = 0.5, t = 0, n = 0, f = 1;
  for (let o = 0; o < oct; o++) { t += a * noise2(x * f, y * f, s + o * 31); n += a; a *= 0.5; f *= 2.03; }
  return t / n;
}
export const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function canvasTex(w, h, draw, { srgb = true, repeat = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
export function macroTexture(rect, res, fn) {
  const [x0, z0, x1, z1] = rect, asp = (z1 - z0) / (x1 - x0), W = Math.max(8, Math.round(Math.min(res, 4096 / Math.max(1, asp)))), H = Math.max(8, Math.round(W * asp));
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const v = fn(x0 + ((i + 0.5) / W) * (x1 - x0), z0 + ((j + 0.5) / H) * (z1 - z0));
    for (let k = 0; k < 4; k++) data[(j * W + i) * 4 + k] = Math.max(0, Math.min(255, Math.round(v[k] * 255)));
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}
const GROUND_FRAG_PARS = /* glsl */`
varying vec3 vGW;
uniform sampler2D tCob, tMacro;
uniform vec4 uRect, uBox;
uniform vec2 uTile;
uniform vec3 uColA, uColB, uMud, uMoss;
uniform float uBump, uMud2, uEdge, uFine;
float gHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float gNz( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( gHash( i ), gHash( i + vec2( 1, 0 ) ), f.x ), mix( gHash( i + vec2( 0, 1 ) ), gHash( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float gH, gJoint, gMoss;
`;
const GROUND_MAP = /* glsl */`
vec2 gUv = ( vGW.xz - uRect.xy ) / uRect.zw;
vec4 gM = texture2D( tMacro, gUv );
{
  vec2 q = abs( vGW.xz - uBox.xy ) - uBox.zw;
  float e = max( q.x, q.y ) + ( gM.a - 0.5 ) * uEdge + ( gM.r - 0.5 ) * uEdge * 0.7;
  if ( e > 0.0 ) discard;
}
vec2 gP = vGW.xz / uTile;
vec2 gPB = mat2( 0.8, -0.6, 0.6, 0.8 ) * gP * 1.19 + vec2( 0.37, 0.61 );
vec2 gPC = mat2( 0.0, 1.0, -1.0, 0.0 ) * gP * 0.87 + vec2( 0.71, 0.19 );
vec2 sA = texture2D( tCob, gP ).rg, sB = texture2D( tCob, gPB ).rg, sC = texture2D( tCob, gPC ).rg;
float gSel = gM.a * 2.0;
vec2 gS = mix( sA, sB, smoothstep( 0.46, 0.54, gSel ) );
gS = mix( gS, sC, smoothstep( 1.42, 1.5, gSel ) );
gH = gS.y;
gJoint = 1.0 - smoothstep( 0.12, 0.5, gH );
float gTint = gM.a * 0.6 + gM.g * 0.4 + ( gNz( vGW.xz * 0.21 ) - 0.5 ) * 0.35;
vec3 gStone = mix( uColA, uColB, clamp( smoothstep( 0.2, 0.8, gTint ), 0.0, 1.0 ) ) * ( gS.x * 1.08 );
gStone *= 0.92 + 0.16 * gNz( vGW.xz * uFine );
float gDirt = smoothstep( 0.6, 0.9, gM.r + 0.25 * gJoint );
gMoss = smoothstep( 0.55, 0.78, gM.g + 0.2 * gJoint ) * ( 0.55 + 0.45 * ( 1.0 - gH * 0.5 ) );
vec3 gCol = gStone;
gCol = mix( gCol, uMud * ( 0.75 + 0.45 * gS.x ) * ( 0.85 + 0.3 * gNz( vGW.xz * 1.7 ) ), clamp( gDirt * uMud2 + gJoint * 0.4 * ( 0.3 + gM.r ), 0.0, 1.0 ) );
gCol = mix( gCol, uMoss * ( 0.55 + 0.5 * gS.x ), clamp( gMoss, 0.0, 1.0 ) * 0.75 );
diffuseColor.rgb *= gCol;
`;
const GROUND_ROUGH = /* glsl */`
float roughnessFactor = mix( 0.93, 0.8, gMoss * 0.4 );
`;
const GROUND_NORMAL = /* glsl */`
{
  vec3 dpdx = dFdx( - vViewPosition ), dpdy = dFdy( - vViewPosition );
  float hx = dFdx( gH ) * uBump, hy = dFdy( gH ) * uBump;
  vec3 r1 = cross( dpdy, normal ), r2 = cross( normal, dpdx );
  float det = dot( dpdx, r1 ) * faceDirection;
  normal = normalize( abs( det ) * normal - sign( det ) * ( hx * r1 + hy * r2 ) );
}
`;
export function groundMaterial(S, o) {
  const [x0, z0, x1, z1] = o.rect, pad = (o.edge ?? 6) + 2, mr = [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
  const macro = macroTexture(mr, o.res ?? 1024, o.macro);
  const cob = texFor(o.tex ?? 'cobblestone');
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const U = {
    tCob: { value: cob }, tMacro: { value: macro }, uRect: { value: new THREE.Vector4(mr[0], mr[1], mr[2] - mr[0], mr[3] - mr[1]) },
    uBox: { value: new THREE.Vector4((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2) },
    uTile: { value: new THREE.Vector2(...(o.tile ?? cob.userData.tile)) },
    uColA: { value: toColor(o.colA ?? '#b4aa9a') }, uColB: { value: toColor(o.colB ?? '#9a9486') },
    uMud: { value: toColor(o.mud ?? '#4c3b2b') }, uMoss: { value: toColor(o.moss ?? '#5f7d33') },
    uBump: { value: o.bump ?? 1.5 }, uMud2: { value: o.mud2 ?? 1 }, uEdge: { value: o.edge ?? 6 }, uFine: { value: o.fine ?? 0.9 },
  };
  mat.onBeforeCompile = (sh) => {
    addWorldUniforms(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvGW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + GROUND_FRAG_PARS)
      .replace('#include <map_fragment>', GROUND_MAP)
      .replace('#include <roughnessmap_fragment>', GROUND_ROUGH)
      .replace('#include <normal_fragment_maps>', GROUND_NORMAL);
  };
  mat.customProgramCacheKey = () => 'ropes-ground-v1';
  const geo = new THREE.PlaneGeometry(x1 - x0 + pad * 2, z1 - z0 + pad * 2).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((x0 + x1) / 2, o.y ?? 0, (z0 + z1) / 2);
  mesh.receiveShadow = true; mesh.name = o.name ?? 'ground'; mesh.userData.noShadowFit = true;
  (o.parent ?? S.root).add(mesh);
  return mesh;
}

// ================================================================== instanced grass tufts (3D blades, wind sway)
// grassField(S, { rect, density: (x, z) => 0..1, dry: (x, z) => 0..1, spacing (studs between tufts), height: [min, max],
//   colors: { base, tip, dry }, sway (studs at the tip, mild), seed, chunk (studs per instanced chunk, frustum culling), y })
// Each tuft = 7 tapered, bent blades; colour per instance; a gentle wind wave from worldTime (= global t, deterministic).
let tuftGeo = null;
function makeTuft() {
  const pos = [], us = [], r = rng('tuft');
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2 + r() * 0.6, rad = 0.05 + r() * 0.22, x0 = Math.cos(a) * rad, z0 = Math.sin(a) * rad;
    const h = 0.65 + r() * 0.5, w = 0.07 + r() * 0.05, lean = 0.15 + r() * 0.35, la = a + (r() - 0.5) * 1.2, yaw = r() * Math.PI;
    const ox = Math.cos(yaw) * w, oz = Math.sin(yaw) * w;
    const P = (u) => [x0 + Math.cos(la) * lean * u * u, h * u, z0 + Math.sin(la) * lean * u * u];
    const seg = 3;
    for (let k = 0; k < seg; k++) {
      const u0 = k / seg, u1 = (k + 1) / seg, p0 = P(u0), p1 = P(u1), w0 = 1 - u0 * 0.85, w1 = 1 - u1 * 0.85;
      const A = [p0[0] - ox * w0, p0[1], p0[2] - oz * w0], B2 = [p0[0] + ox * w0, p0[1], p0[2] + oz * w0], C = [p1[0] - ox * w1, p1[1], p1[2] - oz * w1], D = [p1[0] + ox * w1, p1[1], p1[2] + oz * w1];
      pos.push(...A, ...B2, ...D, ...A, ...D, ...C);
      us.push(u0, u0, u1, u0, u1, u1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(us, 1));
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; // up normals: lit like the ground
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}
export function grassField(S, o = {}) {
  tuftGeo ??= makeTuft();
  const [x0, z0, x1, z1] = o.rect, sp = o.spacing ?? 0.9, r = rng(o.seed ?? 'grass'), chunk = o.chunk ?? 40;
  const [hmin, hmax] = o.height ?? [0.5, 1.0];
  const C = o.colors ?? {};
  const dry = toColor(C.dry ?? '#c8b860');
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
  const U = { uBase: { value: toColor(C.base ?? '#2c5420') }, uTip: { value: toColor(C.tip ?? '#93c450') }, uSway: { value: o.sway ?? 0.12 } };
  mat.onBeforeCompile = (sh) => {
    addWorldUniforms(sh);
    Object.assign(sh.uniforms, U, { worldTime: WORLD_UNIFORMS.worldTime });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU;\nvarying float vU;\nuniform float worldTime, uSway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vU = aU;
        vec2 ip = vec2( instanceMatrix[ 3 ].x, instanceMatrix[ 3 ].z );
        float wv = sin( dot( ip, vec2( 0.11, 0.07 ) ) - worldTime * 1.3 ) * 0.6 + sin( dot( ip, vec2( -0.05, 0.13 ) ) - worldTime * 0.8 ) * 0.4;
        float bend = aU * aU * uSway;
        transformed.x += bend * ( 0.6 + 0.4 * wv );
        transformed.z += bend * 0.35 * wv;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vU;\nuniform vec3 uBase, uTip;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= mix( uBase, uTip, smoothstep( 0.0, 1.0, vU ) ) * ( 0.6 + 0.4 * vU );');
  };
  mat.customProgramCacheKey = () => 'ropes-grass-v1';
  const chunks = new Map();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (let z = z0; z < z1; z += sp) for (let x = x0; x < x1; x += sp) {
    const px = x + (r() - 0.5) * sp * 0.95, pz = z + (r() - 0.5) * sp * 0.95, roll = r(), hr = r(), yr = r(), cr = r();
    const d = o.density ? o.density(px, pz) : 1;
    if (roll >= d) continue;
    const key = `${Math.floor(px / chunk)},${Math.floor(pz / chunk)}`;
    if (!chunks.has(key)) chunks.set(key, { M: [], C: [] });
    const h = hmin + (hmax - hmin) * hr * (0.55 + 0.45 * Math.min(1, d)), s = 0.8 + 0.5 * hr;
    M.compose(V.set(px, o.y ?? 0, pz), Q.setFromAxisAngle(Y, yr * Math.PI * 2), Sc.set(s, h, s));
    const ch = chunks.get(key); ch.M.push(M.clone());
    const dd = o.dry ? o.dry(px, pz) : 0.15 * cr;
    ch.C.push(new THREE.Color(1, 1, 1).lerp(dry, Math.min(1, dd)).multiplyScalar(0.8 + 0.35 * cr));
  }
  const group = new THREE.Group(); group.name = o.name ?? 'grass'; group.userData.noShadowFit = true;
  let n = 0;
  for (const ch of chunks.values()) {
    const im = new THREE.InstancedMesh(tuftGeo, mat, ch.M.length);
    ch.M.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, ch.C[i]); });
    im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere();
    group.add(im); n += ch.M.length;
  }
  group.userData.count = n;
  (o.parent ?? S.root).add(group);
  return group;
}
export { WORLD_UNIFORMS, texFor };
