// River valley between two lands (from "The TINY War"): smooth terrain that is flat (y = 0) inside `flat`, rising into
// forested hills and far snowy mountains outside it; a straight river channel along Z at x = riverX with water; a
// big volcano cone upstream with a crater of glowing lava; patchwork farm fields; pine forests on the hills and
// leafy trees on the plain. Trees are giant-human scale (size 6-11) so tiny people read tiny next to them.
import pineTree from '../props/pine_tree.js';
import oakTree from '../props/oak_tree.js';
import { rng } from '../../../engine/runtime/core/math.js';

export const meta = {
  id: 'river_valley', tags: ['valley', 'river', 'volcano', 'mountains', 'terrain', 'landscape', 'fields', 'farms', 'forest', 'hills', 'aerial', 'fantasy'],
  description: 'Big landscape: flat plain (y 0) with dirt patches and roads, cut by a straight river with water, forested hills and snowy mountains around it, a volcano cone with a glowing lava crater upstream, patchwork farm fields and trees. Kingdoms go on the flat plain.',
  options: { roads: '[{ pts: [[x, z], ...], w }] dirt roads painted into the terrain', carts: '[[x, z, yaw], ...] hay carts', rocks: 'count (180)', bushes: 'count (260)', stumps: 'count (50)', flowers: 'count (500)', flat: 'flat rectangle [x0, z0, x1, z1] at y 0 ([-2000, -1700, 2000, 1500])', riverX: 'river centre x (0)', riverW: 'river width (90)', volcano: '[x, z] volcano centre ([0, -2600]) or false',
    avoid: '[[x0, z0, x1, z1], ...] rectangles kept free of trees and fields', fields: 'number of farm fields (40)', trees: 'number of trees (500)', size: 'terrain size [w, d] ([7600, 7000])', center: 'terrain centre [x, z] ([0, -1000])', seed: 'seed' },
  anchors: { volcanoTop: 'crater centre', volcano: 'volcano mid-slope', riverMid: 'river surface at z 0' },
};

const B = (S, p) => S.part({ batch: true, ...p });
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function noise(seed) {
  const h = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const v = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), w = fz * fz * (3 - 2 * fz);
    return (h(ix, iz) * (1 - u) + h(ix + 1, iz) * u) * (1 - w) + (h(ix, iz + 1) * (1 - u) + h(ix + 1, iz + 1) * u) * w; };
  return (x, z, oct = 4) => { let a = 0, f = 1, amp = 1, tot = 0; for (let i = 0; i < oct; i++) { a += v(x * f, z * f) * amp; tot += amp; f *= 2; amp *= 0.5; } return a / tot; };
}

export default function riverValley(S, o = {}) {
  const [fx0, fz0, fx1, fz1] = o.flat ?? [-2000, -1700, 2000, 1500], RX = o.riverX ?? 0, RW = o.riverW ?? 90;
  const VO = o.volcano === false ? null : o.volcano ?? [0, -2600], N = noise(7), r = rng(o.seed ?? 'valley');
  const vH = 660, vR = 760, crater = 90;
  const height = (x, z) => {
    const d = Math.max(0, fx0 - x, x - fx1, fz0 - z, z - fz1);
    let y = sm(0, 700, d) * (60 + 260 * N(x / 900, z / 900)) + sm(900, 2000, d) * 1100 * N(x / 1400 + 3, z / 1400, 5);
    const dx = Math.abs(x - RX);
    if (VO && z < fz0) y *= sm(80, 520, dx) * sm(VO[1] + vR * 0.8, VO[1] + vR * 0.4, z) + (1 - sm(VO[1] + vR * 0.8, VO[1] + vR * 0.4, z)); // river valley up to the volcano
    if (VO) { const rv = Math.hypot(x - VO[0], z - VO[1]); const cone = vH * Math.max(0, 1 - rv / vR) ** 1.1; y = Math.max(y, rv < crater ? vH * (1 - crater / vR) ** 1.1 - 45 * (1 - rv / crater) : cone); }
    if (!VO || z > VO[1] + vR * 0.7) y += -14 * (1 - sm(RW * 0.32, RW * 0.62, dx));
    return y;
  };
  const roads = o.roads ?? [];
  const segD = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); };
  const roadW = (x, z) => { let w = 0; for (const rd of roads) for (let i = 1; i < rd.pts.length; i++) w = Math.max(w, 1 - sm(rd.w * 0.35, rd.w * 0.6, segD(x, z, rd.pts[i - 1], rd.pts[i]))); return w; };
  const paint = (x, y, z) => Math.max(roadW(x, z), sm(0.6, 0.72, N(x / 260 + 9, z / 260)) * 0.85, y < 4 && Math.abs(x - RX) < RW * 1.3 ? 0.9 : 0);
  S.terrain({ size: o.size ?? [7600, 7000], center: o.center ?? [0, -1000], height, base: 'Grass', rockSlope: 0.12, snowLine: 700, sand: 'Ground', sandLine: -4, paint,
    colors: { Grass: '#557a38', Rock: '#5a5650', Snow: '#eef2f6', Ground: '#6e5638' } });
  S.water({ level: -3, size: [RW + 40, fz1 - (VO ? VO[1] + vR * 0.7 : fz0) + 900], center: [RX, ((VO ? VO[1] + vR * 0.7 : fz0) + fz1 + 900) / 2], color: '#2a6e9e', shallowColor: '#4a9ab8', waveHeight: 0.5, waveLength: 20, waveSpeed: 1.4 });
  S.anchor('riverMid', [RX, -3, 0]);
  if (VO) {
    const top = vH * (1 - crater / vR) ** 1.1 - 40;
    for (const [x, z, d] of [[0, 0, 90], [-30, 18, 50], [26, -20, 56], [18, 30, 44], [-24, -26, 46]]) B(S, { shape: 'ball', size: [d, d, d], pos: [VO[0] + x, top + d * 0.1, VO[1] + z], material: 'Neon', color: '#ff6a1a' });
    S.light({ type: 'point', pos: [VO[0], top + 80, VO[1]], color: '#ff7a2a', range: 900, brightness: 2.5 });
    S.anchor('volcanoTop', [VO[0], top + 20, VO[1]]); S.anchor('volcano', [VO[0], vH * 0.5, VO[1]]);
  }
  const avoid = o.avoid ?? [];
  const free = (x, z, pad = 0) => !avoid.some((q) => x > q[0] - pad && x < q[2] + pad && z > q[1] - pad && z < q[3] + pad) && Math.abs(x - RX) > RW + pad;
  // farm fields (flat plain only): raised slab, furrow ridges, a rail fence, hay bales / haystacks
  const crops = [['Ground', '#7a5a3a'], ['Grass', '#c8b060'], ['Grass', '#7a9a40'], ['Ground', '#8a6a42'], ['Grass', '#b8a850']];
  const fieldRects = [];
  for (let i = 0, tries = 0; i < (o.fields ?? 40) && tries < 2000; tries++) {
    const w = 180 + r() * 260, d = 140 + r() * 220, x = fx0 + 150 + r() * (fx1 - fx0 - 300), z = fz0 + 150 + r() * (fz1 - fz0 - 300);
    if (![[x - w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2], [x + w / 2, z - d / 2], [x, z]].every(([a, b]) => free(a, b, 30) && roadW(a, b) < 0.05)) continue;
    if (fieldRects.some((q) => x + w / 2 > q[0] - 40 && x - w / 2 < q[2] + 40 && z + d / 2 > q[1] - 40 && z - d / 2 < q[3] + 40)) continue;
    fieldRects.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    const [m, c] = crops[i % crops.length];
    B(S, { size: [w, 1, d], pos: [x, 0.5, z], material: m, color: c });
    for (let k = 1; k < 8; k++) B(S, { size: [w - 6, 1.4, 4], pos: [x, 1.6, z - d / 2 + (k * d) / 8], material: 'Ground', color: '#5e4630' });
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      const x0 = x + ax * (w / 2 + 8), z0 = z + az * (d / 2 + 8), x1 = x + bx * (w / 2 + 8), z1 = z + bz * (d / 2 + 8), L = Math.hypot(x1 - x0, z1 - z0), yaw = (Math.atan2(-(z1 - z0), x1 - x0) * 180) / Math.PI;
      for (let t = 0; t <= L; t += 40) B(S, { size: [2.4, 24, 2.4], pos: [x0 + ((x1 - x0) * t) / L, 12, z0 + ((z1 - z0) * t) / L], material: 'Wood', color: '#6a4a2a' });
      for (const y of [9, 19]) S.within([(x0 + x1) / 2, y, (z0 + z1) / 2], yaw, () => B(S, { size: [L, 1.6, 1.2], pos: [0, 0, 0], material: 'Wood', color: '#7a5634' }));
    }
    if (i % 2) for (let k = 0; k < 4; k++) B(S, { shape: 'cylinder', size: [26, 28, 28], pos: [x - w * 0.3 + k * w * 0.2, 14, z + d * 0.2 * (k % 2 ? 1 : -1)], rot: [0, r() * 90, 0], material: 'Fabric', color: '#d4b45c' });
    else for (let k = 0; k < 3; k++) { const hx = x - w * 0.25 + k * w * 0.25, hz = z; [[60, 30], [44, 30], [24, 24]].forEach(([dd, hh], j) => B(S, { shape: 'cylinder', size: [hh, dd, dd], pos: [hx, 15 + j * 26, hz], rot: [0, 0, 90], material: 'Fabric', color: j ? '#c8a850' : '#b89840' })); }
    i++;
  }
  const clear = (x, z, pad) => free(x, z, pad) && !fieldRects.some((q) => x > q[0] - 20 && x < q[2] + 20 && z > q[1] - 20 && z < q[3] + 20) && roadW(x, z) < 0.1;
  // ground detail: rocks, bushes, stumps, wildflowers (giant-human scale)
  const plain = () => [fx0 + r() * (fx1 - fx0), fz0 + r() * (fz1 - fz0)];
  for (let i = 0; i < (o.rocks ?? 180); i++) { const [x, z] = plain(); if (!clear(x, z, 30)) continue; const s = 10 + r() * 40; B(S, { size: [s, s * 0.6, s * 0.8], pos: [x, s * 0.2, z], rot: [r() * 20, r() * 90, r() * 20], material: 'Rock', color: ['#7a766e', '#6a665e', '#8a857a'][i % 3] }); if (i % 3 === 0) B(S, { size: [s * 0.5, s * 0.4, s * 0.5], pos: [x + s * 0.5, s * 0.12, z + s * 0.3], rot: [r() * 30, r() * 90, 0], material: 'Rock', color: '#6e6a62' }); }
  for (let i = 0; i < (o.bushes ?? 260); i++) { const [x, z] = plain(); if (!clear(x, z, 30)) continue; const s = 18 + r() * 26; for (let k = 0; k < 3; k++) B(S, { size: [s * (1 - k * 0.2), s * 0.7, s * (1 - k * 0.15)], pos: [x + (k - 1) * s * 0.4, s * 0.3 + k * 2, z + (k % 2) * s * 0.3], rot: [0, r() * 90, 0], material: 'LeafyGrass', color: ['#3e6a2e', '#4a7834', '#35602a'][(i + k) % 3] }); }
  for (let i = 0; i < (o.stumps ?? 50); i++) { const [x, z] = plain(); if (!clear(x, z, 30)) continue; B(S, { shape: 'cylinder', size: [10, 16, 16], pos: [x, 5, z], rot: [0, 0, 90], material: 'Wood', color: '#5a3e26' }); B(S, { shape: 'cylinder', size: [0.6, 14, 14], pos: [x, 10.2, z], rot: [0, 0, 90], material: 'WoodPlanks', color: '#a8865a' }); }
  for (let i = 0; i < (o.flowers ?? 500); i++) { const [x, z] = plain(); if (!clear(x, z, 10)) continue; const h = 6 + r() * 8; B(S, { size: [0.8, h, 0.8], pos: [x, h / 2, z], material: 'Grass', color: '#3a6a2a' }); B(S, { shape: 'ball', size: [3, 3, 3], pos: [x, h, z], material: 'Fabric', color: ['#e04a6a', '#f0c030', '#f4f0f8', '#9a5ae0', '#e07a2a'][i % 5] }); }
  for (const c of o.carts ?? []) S.within([c[0], 0, c[1]], c[2] ?? 0, () => { B(S, { size: [70, 14, 130], pos: [0, 30, 0], material: 'WoodPlanks', color: '#7a5030' }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(S, { shape: 'cylinder', size: [6, 46, 46], pos: [sx * 38, 23, sz * 42], material: 'Wood', color: '#5a3a22' }); B(S, { size: [64, 30, 110], pos: [0, 52, 0], rot: [0, 4, 0], material: 'Fabric', color: '#c8a850' }); B(S, { size: [6, 6, 90], pos: [-12, 30, 100], material: 'Wood', color: '#6a4428' }); B(S, { size: [6, 6, 90], pos: [12, 30, 100], material: 'Wood', color: '#6a4428' }); });
  // trees: pines on the hills, leafy trees on the plain
  for (let i = 0, tries = 0; i < (o.trees ?? 500) && tries < 6000; tries++) {
    const [w, d] = o.size ?? [7600, 7000], [ccx, ccz] = o.center ?? [0, -1000];
    const x = ccx - w / 2 + r() * w, z = ccz - d / 2 + r() * d;
    if (!free(x, z, 60) || roadW(x, z) > 0.05 || fieldRects.some((q) => x > q[0] - 40 && x < q[2] + 40 && z > q[1] - 40 && z < q[3] + 40)) continue;
    const y = S.heightAt(x, z), out = Math.max(0, fx0 - x, x - fx1, fz0 - z, z - fz1);
    if (y > 520 || (VO && Math.hypot(x - VO[0], z - VO[1]) < vR * 0.75)) continue;
    if (out > 40) S.within([x, y - 2, z], r() * 90, () => pineTree(S, { size: 6 + r() * 4, snow: y > 380 }));
    else if (r() < 0.45) S.within([x, y - 1, z], r() * 90, () => oakTree(S, { size: 6 + r() * 5, seed: `v${i}` }));
    else continue;
    i++;
  }
  return { anchors: {}, heightAt: S.heightAt };
}
