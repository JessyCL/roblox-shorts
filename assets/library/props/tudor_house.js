// Tudor (half-timbered) house: front = +Z local (w along X, d along Z), jettied upper floor, street-facing gable.
// From "Everyone Has ONE Hand" (Main Street). Returns world anchors { upL, upR, door, front } (also S.anchors[`${name}_*`]).
import { rng } from '../../../engine/runtime/core/math.js';

export const meta = {
  id: 'tudor_house', tags: ['house', 'medieval', 'tudor', 'village', 'building', 'half-timbered', 'cottage'],
  description: 'Half-timbered medieval house: plaster walls, dark beams, jettied upper floor, gable roof, chimney, lit windows, door, optional flower boxes.',
  options: { w: 'width (18)', d: 'depth (14)', h1: 'ground floor height (8)', h2: 'upper floor height (7)', wall: 'plaster colour', beam: 'timber colour', roof: 'roof colour',
    lit: 'chance a window is lit at night (0.55)', litL: 'force upper-left window lit', litR: 'force upper-right window lit', flowers: 'flower boxes', door: 'false = no door',
    doorX: 'door x offset', doorColor: 'door colour', shopfront: 'true = no ground-floor window (shops)', chimney: 'false = none', seed: 'variation seed', name: 'anchor prefix',
    extra: '({ w, d, h1, h2, y2, y3, fz1, fz2, z2, D2, rh }) => {} extra parts in the house frame' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export const BEAM = '#4a3020';

export default function tudorHouse(S, o = {}) {
  const { w = 18, d = 14, h1 = 8, h2 = 7, wall = '#efe3c8', beam = BEAM, roof = '#7a3b2e', lit = 0.55, doorX = -w * 0.25 } = o;
  const r = rng(o.seed ?? `tudor:${o.pos}`), out = {};
  const y2 = 1 + h1, y3 = y2 + h2, D2 = d + 1.4, z2 = 0.7, fz1 = d / 2 + 0.12, fz2 = z2 + D2 / 2 + 0.12;
  B(S, { size: [w + 0.6, 1, d + 0.6], pos: [0, 0.5, 0], material: 'Cobblestone', color: '#8c867a' });
  B(S, { size: [w, h1, d], pos: [0, 1 + h1 / 2, 0], material: o.groundMat ?? 'Concrete', color: o.groundColor ?? wall });
  B(S, { size: [w + 1, h2, D2], pos: [0, y2 + h2 / 2, z2], material: 'Concrete', color: wall });
  const rh = o.rh ?? w * 0.62, hw = (w + 1) / 2, a = Math.atan2(rh, hw), ad = (a * 180) / Math.PI;
  for (const s of [-1, 1]) B(S, { shape: 'wedge', size: [D2, rh, hw], pos: [(s * hw) / 2, y3 + rh / 2, z2], rot: [0, s < 0 ? 90 : -90, 0], material: 'Concrete', color: wall });
  const Lr = Math.hypot(hw, rh) + 1.2;
  for (const s of [-1, 1]) B(S, { size: [Lr, 0.7, D2 + 1.6], pos: [s * (hw / 2 + 0.38 * Math.sin(a)) + s * 0.1, y3 + rh / 2 + 0.38 * Math.cos(a) - 0.3, z2], rot: [0, 0, -s * ad], material: 'RoofShingles', color: roof });
  B(S, { size: [0.9, 0.9, D2 + 1.8], pos: [0, y3 + rh + 0.15, z2], material: 'Wood', color: beam });
  if (o.chimney !== false) B(S, { size: [2.2, rh * 0.8, 2.2], pos: [w * 0.25, y3 + rh * 0.6, z2 - D2 * 0.2], material: 'Brick', color: '#8a4a3a' });
  // half-timbering
  for (const x of [-w / 2 + 0.3, -w / 6, w / 6, w / 2 - 0.3]) B(S, { size: [0.55, h1, 0.3], pos: [x, 1 + h1 / 2, fz1], material: 'Wood', color: beam });
  for (const x of [-(w + 1) / 2 + 0.3, -w / 6, w / 6, (w + 1) / 2 - 0.3]) B(S, { size: [0.55, h2, 0.3], pos: [x, y2 + h2 / 2, fz2], material: 'Wood', color: beam });
  for (const [y, z, ww] of [[y2 + 0.2, fz2, w + 1.2], [y3, fz2, w + 1.2], [1 + 0.4, fz1, w]]) B(S, { size: [ww, 0.6, 0.34], pos: [0, y, z], material: 'Wood', color: beam });
  for (const s of [-1, 1]) { // upper-floor braces
    const bl = Math.hypot(w / 3 - 0.6, h2 - 0.8);
    B(S, { size: [0.45, bl, 0.3], pos: [s * w * 0.33, y2 + h2 / 2, fz2 + 0.02], rot: [0, 0, s * (Math.atan2(w / 3 - 0.6, h2 - 0.8) * 180) / Math.PI], material: 'Wood', color: beam });
  }
  B(S, { size: [0.5, rh * 0.85, 0.3], pos: [0, y3 + rh * 0.42, z2 + D2 / 2 + 0.1], material: 'Wood', color: beam }); // gable king post
  for (const s of [-1, 1]) for (const z of [-d / 4, d / 4]) B(S, { size: [0.3, h1, 0.5], pos: [s * (w / 2 + 0.1), 1 + h1 / 2, z], material: 'Wood', color: beam });
  // windows + door
  const win = (x, y, z, ww, wh, isLit) => {
    B(S, { size: [ww + 0.6, wh + 0.6, 0.3], pos: [x, y, z], material: 'Wood', color: beam });
    B(S, { size: [ww, wh, 0.36], pos: [x, y, z], material: isLit ? 'SmoothPlastic' : 'Glass', color: '#2a3a56', ...(isLit ? { glow: 1.6, emissive: '#ffc870' } : {}) });
    B(S, { size: [0.18, wh, 0.42], pos: [x, y, z], material: 'Wood', color: beam });
    B(S, { size: [ww, 0.18, 0.42], pos: [x, y, z], material: 'Wood', color: beam });
  };
  if (!o.shopfront) win(w * 0.22, 1 + h1 * 0.55, fz1 + 0.05, 3.4, 3.4, r() < lit);
  out.upL = S.toWorld([-w * 0.25, y2 + h2 * 0.5, fz2 + 0.3]);
  out.upR = S.toWorld([w * 0.25, y2 + h2 * 0.5, fz2 + 0.3]);
  win(-w * 0.25, y2 + h2 * 0.5, fz2 + 0.05, 3, 3.2, o.litL ?? r() < lit);
  win(w * 0.25, y2 + h2 * 0.5, fz2 + 0.05, 3, 3.2, o.litR ?? r() < lit);
  win(0, y3 + rh * 0.32, z2 + D2 / 2 + 0.15, 1.8, 2, r() < lit * 0.6);
  if (o.flowers) for (const x of [-w * 0.25, w * 0.25]) {
    B(S, { size: [3.6, 0.8, 1], pos: [x, y2 + h2 * 0.5 - 2.2, fz2 + 0.5], material: 'WoodPlanks', color: '#6a4a2a' });
    for (let k = 0; k < 4; k++) B(S, { shape: 'ball', size: [0.9, 0.9, 0.9], pos: [x - 1.3 + k * 0.85, y2 + h2 * 0.5 - 1.55, fz2 + 0.5], material: 'SmoothPlastic', color: ['#e83a5a', '#f2d23a', '#f4f4f4', '#e8609a'][(k + Math.floor(r() * 4)) % 4] });
  }
  if (o.door !== false) {
    B(S, { size: [4.2, 7.1, 0.3], pos: [doorX, 1 + 3.45, fz1 + 0.02], material: 'Wood', color: beam });
    B(S, { size: [3.4, 6.5, 0.4], pos: [doorX, 1 + 3.25, fz1 + 0.06], material: 'WoodPlanks', color: o.doorColor ?? ['#7a2a22', '#2f4d6b', '#3a5a2a', '#5a3a22'][Math.floor(r() * 4)] });
    B(S, { shape: 'ball', size: [0.4, 0.4, 0.4], pos: [doorX + 1.1, 1 + 3.2, fz1 + 0.3], material: 'Metal', color: '#d8c27a' });
  }
  out.door = S.toWorld([doorX, 0, fz1 + 2.5]);
  out.front = S.toWorld([0, 0, fz1]);
  if (o.extra) o.extra({ w, d, h1, h2, y2, y3, fz1, fz2, z2, D2, rh });
  if (o.name) for (const [k, v] of Object.entries(out)) S.anchors[`${o.name}_${k}`] = v;
  return out;
}
