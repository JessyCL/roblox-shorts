// Walled medieval kingdom (from "The TINY War"): a polygon curtain wall (castle_wall) with round towers at every corner
// (castle_tower), a gatehouse in the middle of the edge facing `gate`, a castle keep, a cobblestone main street from
// the gate, a market square with stalls and banners, and dozens of half-timbered (tudor_house) and stone cottages
// (stone_house) filling the inside on a jittered grid. Everything is batched into the set (no per-house groups).
// Ground is not included (put it on a flat area of terrain / ground at y = 0).
import castleWall from '../props/castle_wall.js';
import castleTower from '../props/castle_tower.js';
import gatehouse from '../props/gatehouse.js';
import castleKeep from '../props/castle_keep.js';
import tudorHouse from '../props/tudor_house.js';
import stoneHouse from '../props/stone_house.js';
import marketStall from '../props/market_stall.js';
import banner from '../props/banner.js';
import wallTorch from '../props/wall_torch.js';
import oakTree from '../props/oak_tree.js';
import { rng } from '../../../engine/runtime/core/math.js';

export const meta = {
  id: 'medieval_kingdom', tags: ['kingdom', 'castle', 'medieval', 'walled city', 'town', 'village', 'fortress', 'wall', 'gate', 'market', 'houses', 'aerial'],
  description: 'Walled medieval kingdom: polygon stone wall with round towers and a gatehouse, a castle keep, cobblestone main street, market square with stalls and banners, and dozens of tudor/stone houses inside. Place on flat ground at y = 0.',
  options: { torches: 'false = no wall torches (default: torches along the outer wall face, one lit per segment)', pos: 'centre [x, z] ([0, 0])', R: 'wall radius (200)', sides: 'wall polygon sides (12)', gate: 'gate direction in degrees, 0 = +X, 90 = +Z (180)', wallH: 'wall height (14)',
    keep: "{ at: [x, z], yaw, w, h } world position of the castle keep, or false", market: '{ at: [x, z], w, d } market square, or false', streetTo: '[x, z] end of the main street (default: centre)',
    houses: 'house count (60)', avoid: '[[x0, z0, x1, z1], ...] world rectangles kept free of houses', banner: 'banner colour (#c42a2a)', roofs: 'roof colours', stone: 'wall stone colour', seed: 'layout seed', name: 'anchor prefix (kingdom)' },
  anchors: { '<name>_gate': 'outside the gate', '<name>_gateIn': 'inside the gate', '<name>_keep': 'keep door', '<name>_market': 'market centre', '<name>_wall<i>': 'wall walkway midpoints (y = wallH)', '<name>_tower<i>': 'tower bases' },
};

const B = (S, p) => S.part({ batch: true, ...p });
const inRect = (x, z, r, pad = 0) => x > r[0] - pad && x < r[2] + pad && z > r[1] - pad && z < r[3] + pad;
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - t * dx, pz - az - t * dz); };

export default async function medievalKingdom(S, o = {}) {
  const [cx, cz] = o.pos ?? [0, 0], R = o.R ?? 200, n = o.sides ?? 12, H = o.wallH ?? 14, name = o.name ?? 'kingdom';
  const r = rng(o.seed ?? name), ban = o.banner ?? '#c42a2a', stone = o.stone ?? '#8c877d';
  const roofs = o.roofs ?? ['#7a3b2e', '#5a4a3a', '#8a4a2a', '#4a4e5a', '#6a3a34'];
  const walls = ['#efe3c8', '#f2e8d4', '#e8d8b8', '#e6dcc4', '#d8ccb0'];
  const A = (k, p) => S.anchor(`${name}_${k}`, p);
  const g = ((o.gate ?? 180) * Math.PI) / 180, step = (2 * Math.PI) / n;
  const V = Array.from({ length: n }, (_, i) => { const a = g + (i + 0.5) * step; return [cx + Math.cos(a) * R, cz + Math.sin(a) * R]; });
  const anchors = {};
  for (let i = 0; i < n; i++) {
    const [ax, az] = V[(i + n - 1) % n], [bx, bz] = V[i];
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az);
    let yaw = (Math.atan2(-(bz - az), bx - ax) * 180) / Math.PI;
    const fy = (yaw * Math.PI) / 180;
    if (Math.sin(fy) * (mx - cx) + Math.cos(fy) * (mz - cz) < 0) yaw += 180; // front (+Z) faces outward
    const fx = Math.sin((yaw * Math.PI) / 180), fz = Math.cos((yaw * Math.PI) / 180);
    if (i === 0) { // gate edge: gatehouse in the middle, two shorter wall pieces
      S.within([mx, 0, mz], yaw, () => gatehouse(S, { h: H + 2, banner: ban, color: stone }));
      const half = (L - 32) / 2;
      for (const s of [-1, 1]) S.within([mx + s * (16 + half / 2) * Math.cos((yaw * Math.PI) / 180), 0, mz - s * (16 + half / 2) * Math.sin((yaw * Math.PI) / 180)], yaw, () => castleWall(S, { len: half + 1, h: H, color: stone }));
      anchors.gate = A('gate', [mx + fx * 14, 0, mz + fz * 14]); anchors.gateIn = A('gateIn', [mx - fx * 14, 0, mz - fz * 14]);
    } else S.within([mx, 0, mz], yaw, () => castleWall(S, { len: L + 1, h: H, color: stone }));
    if (o.torches !== false) { // torches along the outer face (one lit per segment, two lit at the gate)
      const run = i === 0 ? [-(L / 2) + 6, -22, 22, L / 2 - 6] : ((n) => Array.from({ length: n }, (_, k) => -L / 2 + (k + 0.5) * (L / n)))(Math.max(2, Math.floor(L / 18)));
      run.forEach((x, k) => S.within([mx + x * Math.cos((yaw * Math.PI) / 180), H - 5, mz - x * Math.sin((yaw * Math.PI) / 180)], yaw, () => S.within([0, 0, 3.05], 0, () => wallTorch(S, { light: i === 0 ? (k === 1 || k === 2) : k === Math.floor(run.length / 2), range: 44 }))));
    }
    A(`wall${i}`, [mx - fx * 0.5, H, mz - fz * 0.5]);
    S.within([bx, 0, bz], 0, () => castleTower(S, { r: 7, h: H + 9, color: stone, banner: i % 2 ? ban : '#e0b030' }));
    A(`tower${i}`, [bx, 0, bz]);
  }
  // keep, street, market
  const keep = o.keep === false ? null : { at: [cx + R * 0.45 * Math.cos(g + Math.PI), cz + R * 0.45 * Math.sin(g + Math.PI)], yaw: 90 - (g * 180) / Math.PI, w: 26, h: 30, ...o.keep };
  if (keep) { S.within([keep.at[0], 0, keep.at[1]], keep.yaw ?? 0, () => castleKeep(S, { w: keep.w, h: keep.h, banner: ban, color: stone })); anchors.keep = A('keep', [keep.at[0], 0, keep.at[1]]); }
  const gateIn = anchors.gateIn, to = o.streetTo ?? (keep ? keep.at : [cx, cz]);
  const sl = Math.hypot(to[0] - gateIn[0], to[1] - gateIn[2]), sy = (Math.atan2(-(to[1] - gateIn[2]), to[0] - gateIn[0]) * 180) / Math.PI;
  S.within([(gateIn[0] + to[0]) / 2, 0.08, (gateIn[2] + to[1]) / 2], sy, () => B(S, { size: [sl + 20, 0.6, 16], pos: [0, 0.22, 0], material: 'Cobblestone', color: '#8a8478' }));
  const mk = o.market === false ? null : { at: o.market?.at ?? [cx, cz], w: o.market?.w ?? 60, d: o.market?.d ?? 44 };
  if (mk) {
    B(S, { size: [mk.w, 1, mk.d], pos: [mk.at[0], 0.5, mk.at[1]], material: 'Cobblestone', color: '#9a9284' });
    [[-0.38, -0.32], [0.38, -0.32], [-0.38, 0.34], [0.38, 0.34]].forEach(([u, v], k) => S.within([mk.at[0] + u * mk.w, 0, mk.at[1] + v * mk.d], v < 0 ? 0 : 180, () => marketStall(S, { color: ['#c42a2a', '#2f5fae', '#3a8a3a', '#c8902a'][k] })));
    anchors.market = A('market', [mk.at[0], 0, mk.at[1]]);
  }
  for (let k = 1; k <= 4; k++) for (const s of [-1, 1]) { const u = k / 5, px = gateIn[0] + (to[0] - gateIn[0]) * u, pz = gateIn[2] + (to[1] - gateIn[2]) * u, nx = -(to[1] - gateIn[2]) / sl, nz = (to[0] - gateIn[0]) / sl; S.within([px + s * nx * 10, 0, pz + s * nz * 10], sy + 90, () => banner(S, { color: ban, h: 12 })); }
  // houses on a jittered grid inside the wall
  const avoid = [...(o.avoid ?? []), ...(keep ? [[keep.at[0] - keep.w, keep.at[1] - keep.w, keep.at[0] + keep.w, keep.at[1] + keep.w]] : []), ...(mk ? [[mk.at[0] - mk.w / 2 - 6, mk.at[1] - mk.d / 2 - 6, mk.at[0] + mk.w / 2 + 6, mk.at[1] + mk.d / 2 + 6]] : [])];
  const spots = [];
  for (let x = cx - R; x <= cx + R; x += 30) for (let z = cz - R; z <= cz + R; z += 28) {
    const px = x + (r() - 0.5) * 8, pz = z + (r() - 0.5) * 8;
    if (Math.hypot(px - cx, pz - cz) > R * Math.cos(step / 2) - 26) continue;
    if (segDist(px, pz, gateIn[0], gateIn[2], to[0], to[1]) < 22) continue;
    if (avoid.some((rc) => inRect(px, pz, rc, 10))) continue;
    spots.push([px, pz]);
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  spots.slice(0, o.houses ?? 60).forEach(([px, pz], k) => {
    const yaw = Math.round(((Math.atan2(cx - px, cz - pz) * 180) / Math.PI) / 90) * 90;
    if (k % 7 === 6) return S.within([px, 0, pz], 0, () => oakTree(S, { size: 0.9, seed: `${name}t${k}` }));
    S.within([px, 0, pz], yaw, () => (k % 5 < 3
      ? tudorHouse(S, { w: 14 + (k % 3) * 2, d: 12, h1: 7, h2: 6, wall: walls[k % 5], roof: roofs[k % roofs.length], seed: `${name}${k}`, flowers: k % 2 === 0 })
      : stoneHouse(S, { w: 12 + (k % 2) * 3, d: 11, roof: ['tiles', 'slate', 'thatch'][k % 3], seed: `${name}${k}` })));
  });
  return { anchors, vertices: V };
}
