// Set-dressing generators built from Roblox parts (batched into instanced meshes, so whole streets cost a few
// draw calls). Each takes (S, opts); `pos` is the footprint centre: [x, y, z], or [x, z] = standing on the ground/terrain;
// `yaw` in degrees, front = +Z.
//   S.building({ pos, yaw, size: [w, h, d], material: 'Brick', color, trim, windows: {...} | false, door, roof: 'flat'|'gable', lit })
//   S.street({ from: [x, z], to: [x, z], width: 24, sidewalk: 8, lines: 'yellow-dashed'|'white-dashed'|'double-yellow'|null, crosswalks: [0.5] })
//   S.house({ pos, yaw, style: 'suburban'|'western', size, color, roof, sign })
//   S.tree({ pos, style: 'round'|'block'|'pine'|'palm', height, color, trunk })
//   S.fence({ from, to } | { points }, style: 'picket'|'rail', height, color)
//   S.lampPost({ pos, yaw, height, color, light: { color, range, brightness } })  (bulb Neon; light follows night factor)
//   S.sign({ pos, rot, size: [w, h], lines: ['NOW SERVING', '4'] | text, bg, textColor, border, glow, hang })
//   S.car({ pos, yaw, color, style: 'sedan'|'truck'|'bus' }) -> Group (animate it)
//   S.food(kind, { pos, yaw, scale }) kinds: burger, pizza, apple, bread, donut, cake, fries, icecream, watermelon, cookie -> Group
//   S.crowdSpots({ area: [x0, z0, x1, z1] | center + radius, count, spacing, faceTo, rows, name }) -> [{ pos, yaw }]
import { rng } from '../core/math.js';
import { toColor } from './palette.js';

const B = (S, o) => S.part({ batch: true, ...o });
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

// ---------- building ----------
export function building(S, o) {
  const [w, hgt, d] = o.size ?? [24, (o.floors ?? 4) * (o.floorHeight ?? 8) + 2, 20];
  const fh = o.floorHeight ?? 8, mat = o.material ?? 'Brick', col = o.color ?? '#9a4a3a', trim = o.trim ?? '#' + toColor(col).multiplyScalar(0.55).getHexString();
  const win = o.windows === false ? null : { w: 3, h: 4.4, spacing: 6.5, sill: 2.2, frame: '#f2f3f3', glass: '#1e2a46', depth: 0.3, faces: ['front', 'back', 'left', 'right'], lit: o.lit ?? 0.35, litColor: '#ffcf7a', ...o.windows };
  const door = o.door === false ? null : { w: 5, h: 8, color: '#4a3326', frame: win?.frame ?? '#f2f3f3', face: 'front', offset: 0, ...o.door };
  const r = rng(o.seed ?? `bld:${o.pos}`);
  const out = {};
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    const base = o.base === false ? null : { height: 1.6, color: '#8d8a83', material: 'Concrete', ...o.base };
    B(S, { size: [w, hgt, d], pos: [0, hgt / 2, 0], material: mat, color: col });
    if (base) B(S, { size: [w + 0.4, base.height, d + 0.4], pos: [0, base.height / 2, 0], material: base.material, color: base.color });
    const roof = o.roof ?? 'flat';
    if (roof === 'flat') {
      B(S, { size: [w + 0.9, 1.1, d + 0.9], pos: [0, hgt + 0.15, 0], material: o.trimMaterial ?? 'Plastic', color: trim });
      for (let y = fh + 0.6; y < hgt - 2 && o.bands !== false; y += fh) if (o.bands) B(S, { size: [w + 0.3, 0.5, d + 0.3], pos: [0, y, 0], material: 'Plastic', color: trim });
      if (o.rooftop !== false && w > 12) {
        const bw = Math.min(8, w * 0.3);
        B(S, { size: [bw, 4.5, bw], pos: [(r() - 0.5) * (w - bw - 3), hgt + 2.9, (r() - 0.5) * (d - bw - 3)], material: 'Concrete', color: '#9c9a96' });
      }
    } else if (roof === 'gable') gableRoof(S, w, d, hgt, o.roofHeight ?? d * 0.35, mat, col, o.roofColor ?? '#5b3a2e', o.roofMaterial ?? 'RoofShingles');
    // windows
    const faces = { front: [w, d / 2, 0], back: [w, -d / 2, 180], right: [d, w / 2, 90], left: [d, -w / 2, -90] };
    let k = 0;
    for (const f of win ? win.faces : []) {
      const [fw, off, yaw] = faces[f];
      const n = Math.max(1, Math.floor((fw - 2) / win.spacing)), x0 = -((n - 1) * win.spacing) / 2;
      S.within([Math.sin((yaw * Math.PI) / 180) * Math.abs(off), 0, Math.cos((yaw * Math.PI) / 180) * Math.abs(off)], yaw, () => {
        for (let y = 0; y + fh <= hgt + 0.5; y += fh) for (let i = 0; i < n; i++) {
          const x = x0 + i * win.spacing, wy = y + win.sill + win.h / 2;
          if (door && f === door.face && y === 0 && Math.abs(x - door.offset) < door.w / 2 + win.w / 2 + 0.8) continue;
          if (wy + win.h / 2 > hgt - 0.6) continue;
          const lit = r() < win.lit;
          B(S, { size: [win.w + 0.55, win.h + 0.55, win.depth], pos: [x, wy, win.depth / 2 - 0.08], material: 'SmoothPlastic', color: win.frame });
          B(S, { size: [win.w, win.h, win.depth + 0.06], pos: [x, wy, win.depth / 2 - 0.08], material: lit ? 'SmoothPlastic' : 'Glass', color: win.glass,
            ...(lit ? { glow: 1.6, emissive: win.litColor } : {}) });
          k++;
        }
      });
    }
    if (door) {
      const [fw, off, yaw] = faces[door.face];
      S.within([Math.sin((yaw * Math.PI) / 180) * Math.abs(off), 0, Math.cos((yaw * Math.PI) / 180) * Math.abs(off)], yaw, () => {
        B(S, { size: [door.w + 0.8, door.h + 0.6, 0.35], pos: [door.offset, (door.h + 0.6) / 2, 0.1], material: 'SmoothPlastic', color: door.frame });
        B(S, { size: [door.w, door.h, 0.45], pos: [door.offset, door.h / 2, 0.1], material: 'WoodPlanks', color: door.color });
        B(S, { size: [0.35, 0.35, 0.3], pos: [door.offset + door.w * 0.35, door.h * 0.48, 0.45], material: 'Metal', color: '#d8c27a' });
        if (o.awning) B(S, { shape: 'wedge', size: [door.w + 3, 1.6, 3], pos: [door.offset, door.h + 1.6, 1.5], rot: [0, 180, 0], material: 'Fabric', color: o.awning });
        out.door = S.toWorld([door.offset, 0, 2.5]);
      });
    }
    out.top = S.toWorld([0, hgt, 0]);
  });
  if (o.name) for (const [k2, v] of Object.entries(out)) S.anchors[`${o.name}_${k2}`] = v;
  return out;
}

// Attic of wall material (two wedges, ridge along X) + overhanging roof boards.
function gableRoof(S, w, d, y0, rh, wallMat, wallCol, roofCol, roofMat) {
  const half = d / 2, a = Math.atan2(rh, half), len = Math.hypot(rh, half) + 1.2, t = 0.5;
  B(S, { shape: 'wedge', size: [w, rh, half], pos: [0, y0 + rh / 2, -half / 2], material: wallMat, color: wallCol });
  B(S, { shape: 'wedge', size: [w, rh, half], pos: [0, y0 + rh / 2, half / 2], rot: [0, 180, 0], material: wallMat, color: wallCol });
  for (const s of [-1, 1]) {
    const cz = s * (half / 2) + s * Math.sin(a) * (t / 2), cy = y0 + rh / 2 + Math.cos(a) * (t / 2);
    B(S, { size: [w + 1.6, t, len], pos: [0, cy, cz], rot: [(s * a * 180) / Math.PI, 0, 0], material: roofMat, color: roofCol });
  }
  B(S, { size: [w + 1.7, 0.6, 0.9], pos: [0, y0 + rh + 0.05, 0], material: roofMat, color: roofCol });
}

// ---------- street ----------
export function street(S, o) {
  const from = o.from ?? [0, -100], to = o.to ?? [0, 100];
  const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz), yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
  const W = o.width ?? 24, sw = o.sidewalk ?? 8, curb = o.curb ?? 0.6, y = o.y ?? 0;
  const lineCol = o.lineColor ?? (String(o.lines ?? 'yellow-dashed').startsWith('white') ? '#f2f3f3' : '#f5cd30');
  S.within([(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2], yaw, () => {
    B(S, { size: [W, 0.4, len], pos: [0, 0.2, 0], material: o.material ?? 'Asphalt', color: o.color ?? '#46474b' });
    if (sw > 0) for (const s of [-1, 1]) {
      B(S, { size: [sw, 0.4 + curb, len], pos: [s * (W / 2 + sw / 2), (0.4 + curb) / 2, 0], material: o.sidewalkMaterial ?? 'Concrete', color: o.sidewalkColor ?? '#bdbab2' });
      B(S, { size: [0.6, 0.42 + curb, len], pos: [s * (W / 2 + 0.3), (0.42 + curb) / 2, 0], material: 'Concrete', color: o.curbColor ?? '#d9d6ce' });
    }
    const lines = o.lines === undefined ? 'yellow-dashed' : o.lines;
    if (lines) {
      if (lines === 'double-yellow') for (const s of [-1, 1]) B(S, { size: [0.35, 0.05, len], pos: [s * 0.35, 0.42, 0], material: 'SmoothPlastic', color: lineCol });
      else for (let z = -len / 2 + 3; z < len / 2 - 3; z += 12) B(S, { size: [0.45, 0.05, 6], pos: [0, 0.42, z + 3], material: 'SmoothPlastic', color: lineCol });
    }
    for (const t of o.crosswalks ?? []) for (let x = -W / 2 + 1.5; x < W / 2 - 1; x += 3) B(S, { size: [1.6, 0.05, 5], pos: [x + 0.8, 0.42, (t - 0.5) * len], material: 'SmoothPlastic', color: '#f2f3f3' });
  });
  return { yaw, length: len, width: W };
}

// ---------- houses ----------
export function house(S, o) {
  return (o.style ?? 'suburban') === 'western' ? westernHouse(S, o) : suburbanHouse(S, o);
}
function windowAt(S, x, y, z, yaw, ww = 4, wh = 4, frame = '#f2f3f3', glass = '#25324d', lit = false) {
  S.within([x, y, z], yaw, () => {
    B(S, { size: [ww + 0.6, wh + 0.6, 0.3], pos: [0, 0, 0.1], material: 'SmoothPlastic', color: frame });
    B(S, { size: [ww, wh, 0.36], pos: [0, 0, 0.1], material: lit ? 'SmoothPlastic' : 'Glass', color: glass, ...(lit ? { glow: 1.5, emissive: '#ffd08a' } : {}) });
    B(S, { size: [0.25, wh, 0.42], pos: [0, 0, 0.1], material: 'SmoothPlastic', color: frame });
  });
}
function suburbanHouse(S, o) {
  const [w, wh, d] = o.size ?? [22, 11, 18], col = o.color ?? '#e9dcc0', trim = o.trim ?? '#f2f3f3', r = rng(o.seed ?? `house:${o.pos}`);
  const lit = o.lit ?? 0.5, out = {};
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    B(S, { size: [w + 0.6, 1, d + 0.6], pos: [0, 0.5, 0], material: 'Concrete', color: '#a8a39a' });
    B(S, { size: [w, wh, d], pos: [0, 1 + wh / 2, 0], material: o.material ?? 'WoodPlanks', color: col });
    gableRoof(S, w, d, wh + 1, o.roofHeight ?? 6, o.material ?? 'WoodPlanks', col, o.roofColor ?? '#7a3b2e', 'RoofShingles');
    B(S, { size: [5.2, 8.4, 0.3], pos: [-w * 0.18, 5.2, d / 2 + 0.1], material: 'SmoothPlastic', color: trim });
    B(S, { size: [4.4, 8, 0.4], pos: [-w * 0.18, 5, d / 2 + 0.12], material: 'WoodPlanks', color: o.doorColor ?? pick(r, ['#8b2f2a', '#2f5d8b', '#2f6b3a', '#4a3326']) });
    windowAt(S, w * 0.22, 6, d / 2, 0, 5, 4.2, trim, '#25324d', r() < lit);
    for (const s of [-1, 1]) windowAt(S, s * (w / 2), 6, 0, s * 90, 4, 4, trim, '#25324d', r() < lit);
    windowAt(S, 0, 6, -d / 2, 180, 5, 4, trim, '#25324d', r() < lit);
    if (o.chimney !== false) B(S, { size: [2.5, 7, 2.5], pos: [w * 0.3, wh + 5, -d * 0.15], material: 'Brick', color: '#8a4a3a' });
    if (o.porch) {
      B(S, { size: [w * 0.5, 0.8, 5], pos: [-w * 0.18, 0.4, d / 2 + 2.5], material: 'WoodPlanks', color: '#b89a72' });
      for (const s of [-1, 1]) B(S, { size: [0.6, 8.5, 0.6], pos: [-w * 0.18 + s * w * 0.23, 4.6, d / 2 + 4.6], material: 'SmoothPlastic', color: trim });
      B(S, { size: [w * 0.52, 0.5, 5.6], pos: [-w * 0.18, 9.1, d / 2 + 2.6], material: 'RoofShingles', color: o.roofColor ?? '#7a3b2e' });
    }
    out.door = S.toWorld([-w * 0.18, 0, d / 2 + 3]);
  });
  if (o.name) for (const [k, v] of Object.entries(out)) S.anchors[`${o.name}_${k}`] = v;
  return out;
}
function westernHouse(S, o) {
  const [w, wh, d] = o.size ?? [20, 13, 24], col = o.color ?? '#9b6b45', trim = o.trim ?? '#6e4a2e', out = {};
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    B(S, { size: [w, wh, d], pos: [0, wh / 2, 0], material: 'WoodPlanks', color: col });
    B(S, { size: [w + 0.6, 0.6, d + 0.6], pos: [0, wh + 0.3, 0], material: 'WoodPlanks', color: trim });
    // false front with a stepped top
    const fhH = wh + 6;
    B(S, { size: [w, fhH, 1], pos: [0, fhH / 2, d / 2 + 0.5], material: 'WoodPlanks', color: col });
    B(S, { size: [w * 0.5, 2, 1], pos: [0, fhH + 1, d / 2 + 0.5], material: 'WoodPlanks', color: col });
    B(S, { size: [w + 0.8, 0.7, 1.4], pos: [0, fhH + 0.1, d / 2 + 0.5], material: 'WoodPlanks', color: trim });
    B(S, { size: [w * 0.5 + 0.8, 0.7, 1.4], pos: [0, fhH + 2.1, d / 2 + 0.5], material: 'WoodPlanks', color: trim });
    // porch: deck, posts, roof
    B(S, { size: [w + 1, 1, 7], pos: [0, 0.5, d / 2 + 4.5], material: 'WoodPlanks', color: '#a77d55' });
    for (const x of [-w / 2, -w / 6, w / 6, w / 2]) B(S, { size: [0.7, 9.5, 0.7], pos: [x * 0.97, 5.75, d / 2 + 7.6], material: 'Wood', color: trim });
    B(S, { size: [w + 1.6, 0.5, 8], pos: [0, 10.7, d / 2 + 4.6], rot: [-6, 0, 0], material: 'WoodPlanks', color: trim });
    for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) B(S, { size: [0.3, 0.35, 7], pos: [x, 3.6, d / 2 + 4.3], material: 'Wood', color: trim });
    // swinging doors + windows
    B(S, { size: [5.6, 9, 0.3], pos: [0, 5.5, d / 2 + 1.05], material: 'Wood', color: '#2a1c12' });
    for (const s of [-1, 1]) B(S, { size: [2.5, 4, 0.4], pos: [s * 1.35, 5, d / 2 + 1.2], material: 'WoodPlanks', color: '#c49a64' });
    for (const s of [-1, 1]) windowAt(S, s * w * 0.3, 6.5, d / 2 + 1, 0, 4, 4.6, '#e8dcc0', '#2a2620', false);
    const sign = o.sign ?? null;
    if (sign) {
      const board = S.part({ size: [w * 0.62, 3.2, 0.4], pos: [0, wh + 2.6, d / 2 + 1.2], material: 'WoodPlanks', color: '#e8d6aa' });
      S.text({ part: board, face: 'front', text: sign, color: '#3a2412', font: 'western' });
    }
    out.door = S.toWorld([0, 0, d / 2 + 9]);
  });
  if (o.name) for (const [k, v] of Object.entries(out)) S.anchors[`${o.name}_${k}`] = v;
  return out;
}

// ---------- tree ----------
export function tree(S, o) {
  const style = o.style ?? 'round', H = o.height ?? 16, r = rng(o.seed ?? `tree:${o.pos}`);
  const leaf = o.color ?? (style === 'pine' ? '#2f6b3a' : '#5aa63c'), trunkC = o.trunk ?? '#6b4a2f';
  const lm = o.leafMaterial ?? (style === 'palm' ? 'Grass' : 'LeafyGrass');
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? r() * 360, () => {
    if (style === 'palm') {
      let x = 0, y = 0;
      for (let i = 0; i < 8; i++) { const seg = H / 8; B(S, { size: [1.3 - i * 0.06, seg + 0.2, 1.3 - i * 0.06], pos: [x, y + seg / 2, 0], rot: [0, 0, -i * 1.6], material: 'Wood', color: trunkC }); y += seg; x += i * 0.07; }
      for (let i = 0; i < 7; i++) S.within([x, y, 0], (i / 7) * 360 + r() * 20, () => { // arching fronds: rising inner half, drooping outer half
        B(S, { size: [1.5, 0.3, 4], pos: [0, 0.3, 1.9], rot: [-12, 0, 0], material: lm, color: leaf });
        B(S, { size: [1.2, 0.3, 4], pos: [0, -0.5, 5.4], rot: [32, 0, 0], material: lm, color: leaf });
      });
      B(S, { shape: 'ball', size: [2, 2, 2], pos: [x, y, 0], material: lm, color: leaf });
      return;
    }
    const tw = o.trunkWidth ?? (style === 'pine' ? 1.6 : 2), th = style === 'pine' ? H * 0.35 : H * 0.55;
    B(S, { shape: o.trunkShape ?? 'block', size: [tw, th + 1, tw], pos: [0, (th + 1) / 2, 0], material: 'Wood', color: trunkC });
    if (style === 'block') {
      B(S, { size: [H * 0.6, H * 0.35, H * 0.6], pos: [0, th + H * 0.17, 0], material: lm, color: leaf });
      B(S, { size: [H * 0.4, H * 0.25, H * 0.4], pos: [0, th + H * 0.45, 0], material: lm, color: leaf });
    } else if (style === 'pine') {
      for (let i = 0; i < 4; i++) { // tiers: square pyramids of 4 wedges
        const s = H * (0.62 - i * 0.12), th2 = H * 0.24, y = th * 0.7 + i * H * 0.17;
        for (let k = 0; k < 4; k++) S.within([0, y, 0], k * 90 + 45, () => B(S, { shape: 'wedge', size: [s * 0.72, th2, s / 2], pos: [0, th2 / 2, -s / 4], material: lm, color: leaf }));
      }
    } else { // round: a clump of balls (stylised low-poly canopy)
      const R0 = H * 0.3;
      B(S, { shape: 'ball', size: [R0 * 2, R0 * 2, R0 * 2], pos: [0, th + R0 * 0.7, 0], material: lm, color: leaf });
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r(), rr = R0 * (0.6 + 0.25 * r());
        B(S, { shape: 'ball', size: Array(3).fill(rr * 2), pos: [Math.cos(a) * R0 * 0.8, th + R0 * (0.3 + 0.5 * r()), Math.sin(a) * R0 * 0.8], material: lm, color: leaf });
      }
      B(S, { shape: 'ball', size: Array(3).fill(R0 * 1.3), pos: [0, th + R0 * 1.5, 0], material: lm, color: leaf });
    }
  });
}

// ---------- fence ----------
export function fence(S, o) {
  const pts = o.points ?? [o.from ?? [-10, 0], o.to ?? [10, 0]], H = o.height ?? 4, col = o.color ?? (o.style === 'rail' ? '#8a6a48' : '#f2f3f3');
  const mat = o.material ?? (o.style === 'rail' ? 'Wood' : 'SmoothPlastic');
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], len = Math.hypot(x1 - x0, z1 - z0), yaw = (Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI;
    const y = o.y ?? S.heightAt((x0 + x1) / 2, (z0 + z1) / 2);
    S.within([(x0 + x1) / 2, y, (z0 + z1) / 2], yaw, () => {
      const nPost = Math.max(1, Math.round(len / (o.postSpacing ?? 6)));
      for (let k = 0; k <= nPost; k++) B(S, { size: [0.7, H + 0.4, 0.7], pos: [0, (H + 0.4) / 2, -len / 2 + (k * len) / nPost], material: mat, color: col });
      for (const fy of o.style === 'rail' ? [H * 0.45, H * 0.85] : [H * 0.3, H * 0.75]) B(S, { size: [0.3, 0.45, len], pos: [0, fy, 0], material: mat, color: col });
      if (o.style !== 'rail') for (let z = -len / 2 + 0.6; z < len / 2 - 0.3; z += 0.95) {
        B(S, { size: [0.2, H - 0.5, 0.6], pos: [0.25, (H - 0.5) / 2, z], material: mat, color: col });
        B(S, { shape: 'wedge', size: [0.2, 0.5, 0.3], pos: [0.25, H - 0.25, z + 0.15], rot: [0, 180, 0], material: mat, color: col });
        B(S, { shape: 'wedge', size: [0.2, 0.5, 0.3], pos: [0.25, H - 0.25, z - 0.15], material: mat, color: col });
      }
    });
  }
}

// ---------- lamp post ----------
export function lampPost(S, o) {
  const H = o.height ?? 14, col = o.color ?? '#2c2c30', lc = o.light?.color ?? '#ffd59a';
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    B(S, { size: [1.4, 1, 1.4], pos: [0, 0.5, 0], material: 'Metal', color: col });
    B(S, { shape: 'cylinder', size: [H, 0.55, 0.55], pos: [0, H / 2, 0], rot: [0, 0, 90], material: 'Metal', color: col });
    B(S, { size: [0.4, 0.4, 3], pos: [0, H - 0.3, 1.3], material: 'Metal', color: col });
    B(S, { size: [1.5, 0.6, 1.8], pos: [0, H - 0.4, 2.8], material: 'Metal', color: col });
    B(S, { size: [1.1, 0.3, 1.4], pos: [0, H - 0.8, 2.8], material: 'Neon', color: lc });
    if (o.light !== false) S.light({ type: 'point', pos: [0, H - 1.6, 2.8], color: lc, range: o.light?.range ?? 36, brightness: o.light?.brightness ?? 2.2, auto: o.light?.auto ?? true });
  });
}

// ---------- sign (e.g. the hanging neon "NOW SERVING" board) ----------
export function sign(S, o) {
  const [w, hh] = o.size ?? [16, 7], hang = o.hang === true ? 18 : o.hang, bw = o.borderWidth ?? 0.7, border = o.border === undefined ? '#fff3c4' : o.border, p = o.pos ?? [0, 10, 0];
  const g = S.group(o.name ?? null, { pivot: p, keys: o.keys }, () => S.within(p, 0, () => {
    const panel = S.part({ size: [w, hh, 0.6], pos: [0, 0, 0], material: 'SmoothPlastic', color: o.bg ?? '#1b2238' });
    if (border) for (const [sx, sy, px, py] of [[w + bw, bw, 0, hh / 2], [w + bw, bw, 0, -hh / 2], [bw, hh, w / 2, 0], [bw, hh, -w / 2, 0]])
      B(S, { size: [sx, sy, 0.8], pos: [px, py, 0], material: 'Neon', color: border, castShadow: false });
    const lines = o.lines ?? (o.text != null ? [o.text] : []);
    if (lines.length) S.text({ part: panel, face: 'front', lines, color: o.textColor ?? '#f5d46a', glow: o.glow ?? (border ? 2.6 : 0), font: o.font ?? 'gotham', offset: 0.05, padding: 0.1 });
    if (hang) for (const sx of [-1, 1]) B(S, { shape: 'cylinder', size: [hang, 0.15, 0.15], pos: [sx * w * 0.38, hh / 2 + hang / 2, 0], rot: [0, 0, 90], material: 'Plastic', color: '#111111' });
  }));
  if (o.rot) g.rotation.set(...o.rot.map((v) => (v * Math.PI) / 180));
  return g;
}

// ---------- vehicles (Roblox-style, from parts) ----------
export function car(S, o) {
  const style = o.style ?? 'sedan', col = o.color ?? '#c4281c', p = o.pos ?? [0, 0, 0];
  const dims = { sedan: [7, 14, 2.6, 2.4], truck: [7.5, 17, 3.2, 3], bus: [9, 30, 7.5, 0] }[style];
  if (!dims) throw new Error(`world: unknown car style "${style}" (sedan, truck, bus)`);
  const [w, l, bodyH, cabH] = dims;
  return S.group(o.name ?? null, { pivot: p }, () => S.within(p, o.yaw ?? 0, () => {
    const wy = 1.4, by = wy + 0.4 + bodyH / 2;
    B(S, { size: [w, bodyH, l], pos: [0, by, 0], material: 'SmoothPlastic', color: col });
    if (style === 'bus') {
      for (let z = -l / 2 + 3; z < l / 2 - 4; z += 4) for (const s of [-1, 1]) B(S, { size: [0.2, 2.6, 3.2], pos: [s * (w / 2 + 0.05), by + 1.4, z], material: 'Glass', color: '#1e2a40' });
      B(S, { size: [w - 1, 3, 0.2], pos: [0, by + 1.2, l / 2 + 0.05], material: 'Glass', color: '#1e2a40' });
      B(S, { size: [w + 0.2, 0.5, l + 0.2], pos: [0, by - 0.9, 0], material: 'SmoothPlastic', color: '#222222' });
    } else {
      const cl = style === 'truck' ? l * 0.32 : l * 0.5, cz = style === 'truck' ? l * 0.18 : -l * 0.04;
      B(S, { size: [w - 0.6, cabH, cl], pos: [0, by + bodyH / 2 + cabH / 2, cz], material: 'SmoothPlastic', color: col });
      B(S, { size: [w - 0.4, cabH * 0.7, cl - 1], pos: [0, by + bodyH / 2 + cabH / 2, cz], material: 'Glass', color: '#1c2638' });
      B(S, { size: [w - 1, cabH * 0.7, cl + 0.15], pos: [0, by + bodyH / 2 + cabH / 2, cz], material: 'Glass', color: '#1c2638' });
      if (style === 'truck') for (const s of [-1, 1]) B(S, { size: [0.4, 1.4, l * 0.55], pos: [s * (w / 2 - 0.2), by + bodyH / 2 + 0.7, -l * 0.2], material: 'SmoothPlastic', color: col });
    }
    for (const s of [-1, 1]) {
      B(S, { size: [1.6, 0.8, 0.3], pos: [s * (w / 2 - 1.2), by + 0.4, l / 2 + 0.05], material: 'Neon', color: '#fff6d8' });
      B(S, { size: [1.6, 0.7, 0.3], pos: [s * (w / 2 - 1.2), by + 0.4, -l / 2 - 0.05], material: 'Neon', color: '#ff2a2a' });
    }
    B(S, { size: [w + 0.3, 0.7, 0.6], pos: [0, by - bodyH / 2 + 0.3, l / 2 + 0.2], material: 'Metal', color: '#c8ccd0' });
    B(S, { size: [w + 0.3, 0.7, 0.6], pos: [0, by - bodyH / 2 + 0.3, -l / 2 - 0.2], material: 'Metal', color: '#c8ccd0' });
    for (const zz of style === 'bus' ? [l * 0.32, -l * 0.3] : [l * 0.3, -l * 0.3]) for (const s of [-1, 1]) {
      B(S, { shape: 'cylinder', size: [1.2, 2.8, 2.8], pos: [s * (w / 2 - 0.3), wy, zz], material: 'Rubber', color: '#1d1d1f' });
      B(S, { shape: 'cylinder', size: [1.3, 1.4, 1.4], pos: [s * (w / 2 - 0.3), wy, zz], material: 'Metal', color: '#c8ccd0' });
    }
  }));
}

// ---------- food (from parts) ----------
const FOOD = {
  burger: (S) => { B(S, { shape: 'cylinder', size: [0.5, 2, 2], pos: [0, 0.25, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#d79a4e' });
    B(S, { shape: 'cylinder', size: [0.4, 2.1, 2.1], pos: [0, 0.65, 0], rot: [0, 0, 90], material: 'Plastic', color: '#5a3320' });
    B(S, { size: [2, 0.12, 2], pos: [0, 0.9, 0], rot: [0, 45, 0], material: 'SmoothPlastic', color: '#f5cd30' });
    B(S, { shape: 'cylinder', size: [0.12, 2.2, 2.2], pos: [0, 1.0, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#4b974b' });
    B(S, { shape: 'ball', size: [2.1, 2.1, 2.1], pos: [0, 1.15, 0], material: 'SmoothPlastic', color: '#e0a55a' }); },
  pizza: (S) => { B(S, { shape: 'wedge', size: [0.25, 2.4, 3], pos: [0, 0.12, 0], rot: [90, 0, 0], material: 'SmoothPlastic', color: '#f2c14e' });
    B(S, { size: [2.4, 0.4, 0.4], pos: [0, 0.2, -1.5], material: 'SmoothPlastic', color: '#d08a3c' });
    for (const [x, z] of [[0.3, -0.8], [-0.4, -0.6], [0.1, 0.2]]) B(S, { shape: 'cylinder', size: [0.06, 0.5, 0.5], pos: [x, 0.28, z], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#b8322a' }); },
  apple: (S) => { B(S, { shape: 'ball', size: [1.6, 1.6, 1.6], pos: [0, 0.8, 0], material: 'SmoothPlastic', color: '#c4281c' });
    B(S, { size: [0.12, 0.5, 0.12], pos: [0, 1.75, 0], material: 'Wood', color: '#5a3a20' });
    B(S, { size: [0.5, 0.06, 0.3], pos: [0.25, 1.75, 0], rot: [0, 0, 20], material: 'SmoothPlastic', color: '#4b974b' }); },
  bread: (S) => { B(S, { size: [1.6, 1.0, 3], pos: [0, 0.5, 0], material: 'Plastic', color: '#c98a4a' });
    B(S, { shape: 'cylinder', size: [3, 1.6, 1.0], pos: [0, 1.0, 0], rot: [0, 90, 0], material: 'Plastic', color: '#d79a55' }); },
  donut: (S) => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; B(S, { shape: 'ball', size: [0.8, 0.8, 0.8], pos: [Math.cos(a) * 0.75, 0.4, Math.sin(a) * 0.75], material: 'SmoothPlastic', color: i % 2 ? '#ff98dc' : '#f08cc8' }); } },
  cake: (S) => { B(S, { shape: 'cylinder', size: [1.6, 4, 4], pos: [0, 0.8, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#ffc9e0' });
    B(S, { shape: 'cylinder', size: [1.3, 2.8, 2.8], pos: [0, 2.25, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#fff2f6' });
    B(S, { shape: 'cylinder', size: [0.9, 0.18, 0.18], pos: [0, 3.35, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#80bbdb' });
    B(S, { shape: 'ball', size: [0.3, 0.3, 0.3], pos: [0, 3.9, 0], material: 'Neon', color: '#ffb000' }); },
  fries: (S) => { B(S, { size: [1.4, 1.5, 0.9], pos: [0, 0.75, 0], material: 'SmoothPlastic', color: '#c4281c' });
    for (let i = 0; i < 7; i++) B(S, { size: [0.2, 1.2, 0.2], pos: [-0.5 + i * 0.17, 1.7, (i % 2) * 0.2 - 0.1], rot: [0, 0, (i - 3) * 4], material: 'SmoothPlastic', color: '#f5cd30' }); },
  icecream: (S) => { B(S, { shape: 'wedge', size: [0.9, 2, 0.9], pos: [0, 1, 0], rot: [180, 0, 0], material: 'Plastic', color: '#d79a55' });
    B(S, { shape: 'ball', size: [1.3, 1.3, 1.3], pos: [0, 2.3, 0], material: 'SmoothPlastic', color: '#ffc9e0' }); },
  watermelon: (S) => { B(S, { shape: 'ball', size: [3, 3, 3], pos: [0, 1.5, 0], material: 'SmoothPlastic', color: '#287f47' }); },
  cookie: (S) => { B(S, { shape: 'cylinder', size: [0.3, 1.6, 1.6], pos: [0, 0.15, 0], rot: [0, 0, 90], material: 'Plastic', color: '#c98a4a' });
    for (const [x, z] of [[0.3, 0.2], [-0.3, 0.1], [0, -0.4]]) B(S, { size: [0.2, 0.1, 0.2], pos: [x, 0.33, z], material: 'SmoothPlastic', color: '#3a2412' }); },
};
export function food(S, kind, o = {}) {
  if (typeof kind === 'object') { o = kind; kind = o.kind; }
  const f = FOOD[kind];
  if (!f) throw new Error(`world: unknown food "${kind}" (known: ${Object.keys(FOOD).join(', ')})`);
  const p = o.pos ?? [0, 0, 0], s = o.scale ?? 1;
  const g = S.group(o.name ?? null, { pivot: p }, () => S.within(p, o.yaw ?? 0, () => f(S)));
  g.scale.setScalar(s);
  return g;
}

// ---------- crowd placement ----------
export function crowdSpots(S, o) {
  const r = rng(o.seed ?? `crowd:${o.name ?? ''}`), out = [], sp = o.spacing ?? 3;
  const face = (x, z) => (o.faceTo ? (Math.atan2(o.faceTo[0] - x, o.faceTo[1] - z) * 180) / Math.PI : o.yaw ?? 0) + (o.jitterYaw ?? 15) * (r() - 0.5);
  if (o.rows) { // queue lines: rows = { from: [x, z], to: [x, z], count, lines: 1, gap: 4 }
    const { from, to, count = 20, lines = 1, gap = 4 } = o.rows;
    const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
    for (let L = 0; L < lines; L++) for (let i = 0; i < count; i++) {
      const u = count > 1 ? i / (count - 1) : 0, x = from[0] + dx * u + nx * L * gap + (r() - 0.5) * 0.4, z = from[1] + dz * u + nz * L * gap + (r() - 0.5) * 0.4;
      out.push({ pos: [x, S.heightAt(x, z), z], yaw: o.faceTo ? face(x, z) : (Math.atan2(-dx, -dz) * 180) / Math.PI });
    }
  } else {
    const [x0, z0, x1, z1] = o.area ?? (o.center ? [o.center[0] - (o.radius ?? 20), o.center[1] - (o.radius ?? 20), o.center[0] + (o.radius ?? 20), o.center[1] + (o.radius ?? 20)] : [-20, -20, 20, 20]);
    const count = o.count ?? 30;
    for (let tries = 0; out.length < count && tries < count * 60; tries++) {
      const x = x0 + (x1 - x0) * r(), z = z0 + (z1 - z0) * r();
      if (o.center && o.radius && Math.hypot(x - o.center[0], z - o.center[1]) > o.radius) continue;
      if (out.some((q) => Math.hypot(q.pos[0] - x, q.pos[2] - z) < sp)) continue;
      out.push({ pos: [x, S.heightAt(x, z), z], yaw: face(x, z) });
    }
  }
  const name = o.name ?? 'crowd';
  out.forEach((q, i) => { S.anchors[`${name}${i}`] = q.pos; });
  (S.spots ??= {})[name] = out;
  return out;
}
