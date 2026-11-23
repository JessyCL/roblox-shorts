// Crowds: hundreds of cheap varied characters as InstancedMeshes (one per body part + head + hair style).
// Outfit/skin variety comes from a 4x4 atlas of painted body variants and a head atlas (variant x 2 faces) selected
// per instance by a UV-cell attribute; hair colours via instanceColor. Each agent has its own phase/rate so cycles
// never sync. Usable as a shot actor (`spec: { crowd: {...} }`, animated by the director) or from a set builder:
//   const c = characters.crowd({ count: 200, path: [[0,0,-80],[0,0,80]], width: 14, clip: 'run', speed: 17, seed: 3 });
//   S.group('crowd').add(c.root); shot.update = (ctx, lt) => c.update(lt);
// opts: { count, seed, area: [x0,z0,x1,z1] | { center:[x,z], size:[w,d] }, path: [[x,y,z]...], width, clip | [clips],
//         speed, dir (deg, area motion), yaw, yawJitter, loop, body: 'classic'|'original', faces: [...], hair: true,
//         rateJitter, outfits: [specs] (optional explicit variant specs), lod: 'variant' (default) | 'pawn' | 'dot' }
// LOD tiers (style bible): hero = full createCharacter, variant = this instanced crowd, pawn/dot = far tiers.
// Agents always get individual phases/rates (never lockstep); a frozen same-pose crowd = clip 'stand' or 'idle'.
import * as THREE from 'three';
import { rng, deg, hashString } from '../core/math.js';
import { dimsFor, buildRig, rigGeometries, applyNativePose, ATLAS_UNITS, FACE_ARC } from './rig.js';
import { paintBody, SKIN, SKIN_LIST } from './clothing.js';
import { paintHead, FACE_STYLES } from './faces.js';
import { hairGeometry } from './accessories.js';
import { CLIPS, toNative, strideOf } from './anim.js';

const COLS = 4;
const PALETTE = ['#c4281c', '#0d69ac', '#f5cd30', '#4b974b', '#1b2a35', '#e8e8e8', '#ff8a1c', '#7b2fbe', '#ff66a3', '#2ec4c4', '#5a3b24', '#9c9c9c', '#232323', '#b3e04a', '#3f51b5', '#d9534f'];
const SHIRTS = ['tshirt', 'hoodie', 'solid', 'stripes', 'plaid', 'jacket', 'knit', 'tshirt', 'hoodie', 'zip'];
const PANTS = ['jeans', 'plain', 'jeans', 'shorts', 'plain', 'cargo', 'track'];
const PRINTS = [null, 'star', 'heart', 'bolt', 'smile', null, 'planet', 'flame'];
const HAIRS = ['messy', 'spiky', 'bob', 'slicked', 'curly', 'ponytail', 'bald', 'messy', 'long', 'fringe'];
const HAIR_COLORS = ['#2a1b10', '#5a3720', '#e8c35a', '#121212', '#8a4a20', '#d8d0c8', '#c0392b', '#3a2a1a'];
const FACES = ['neutral', 'smile', 'worried', 'shock', 'happy', 'determined', 'sad', 'grin'];

export function randomOutfit(r) {
  const p = (a) => a[Math.floor(r() * a.length)];
  const pattern = p(SHIRTS), color = p(PALETTE);
  return {
    skin: p(SKIN_LIST.slice(0, 7)),
    shirt: { pattern, color, color2: p(PALETTE), print: pattern === 'tshirt' ? p(PRINTS) : null },
    pants: { pattern: p(PANTS), color: p(['#2f3e57', '#4a6fa5', '#3b3b3b', '#6b4f2e', '#1f2a44', '#7a7a7a']), shoes: { style: 'sneaker', color: p(['#f2f2f2', '#222', '#c4281c']) } },
  };
}

function cellMaterial(map, rows, rough) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: rough });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCell;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = (clamp(vMapUv, 0.003, 0.997) + vec2(mod(aCell, ${COLS}.0), ${rows - 1}.0 - floor(aCell / ${COLS}.0))) / vec2(${COLS}.0, ${rows}.0);`);
  };
  m.customProgramCacheKey = () => `crowdcell${rows}`;
  return m;
}
const makeCanvas = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// Agent placement shared by all LOD tiers: path column (looping treadmill) or stratified area (optionally drifting).
function makeLayout(o, count, agents) {
  const path = o.path, area = o.area, speed = o.speed ?? 0;
  let len = 0; const cum = [0];
  if (path) for (let k = 1; k < path.length; k++) cum.push((len += Math.hypot(path[k][0] - path[k - 1][0], path[k][2] - path[k - 1][2])));
  const rect = Array.isArray(area) ? area : area ? [area.center[0] - area.size[0] / 2, area.center[1] - area.size[1] / 2, area.center[0] + area.size[0] / 2, area.center[1] + area.size[1] / 2] : [-20, -20, 20, 20];
  const gcols = Math.max(1, Math.round(Math.sqrt((count * (rect[2] - rect[0])) / Math.max(1e-3, rect[3] - rect[1])))), grows = Math.ceil(count / gcols);
  const pointAt = (s) => {
    for (let k = 1; k < path.length; k++) if (s <= cum[k] || k === path.length - 1) { const u = (s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]), a = path[k - 1], b = path[k]; return [a[0] + (b[0] - a[0]) * u, (a[1] ?? 0) + ((b[1] ?? 0) - (a[1] ?? 0)) * u, a[2] + (b[2] - a[2]) * u, Math.atan2(b[0] - a[0], b[2] - a[2])]; }
    return [path[0][0], 0, path[0][2], 0];
  };
  return (i, lt) => {
    const a = agents[i];
    if (path) {
      let s = ((i + a.j * 0.8) / count) * len + speed * lt;
      if (o.loop !== false) s = ((s % len) + len) % len;
      const p = pointAt(Math.min(s, len)), lat = (a.w - 0.5) * (o.width ?? 8);
      return { x: p[0] + Math.cos(p[3]) * lat, y: p[1], z: p[2] - Math.sin(p[3]) * lat, yaw: p[3], dist: speed * lt };
    }
    const gx = i % gcols, gz = Math.floor(i / gcols);
    let x = rect[0] + ((gx + 0.15 + a.u * 0.7) / gcols) * (rect[2] - rect[0]);
    let z = rect[1] + ((gz + 0.15 + a.w * 0.7) / grows) * (rect[3] - rect[1]);
    let yaw = deg(o.yaw ?? 0) + deg(o.yawJitter ?? 0) * a.yawJ, dist = 0;
    if (speed && o.dir != null) {
      const dr = deg(o.dir), W = rect[2] - rect[0], D = rect[3] - rect[1];
      dist = speed * lt;
      x = rect[0] + ((((x - rect[0] + Math.sin(dr) * dist) % W) + W) % W);
      z = rect[1] + ((((z - rect[1] + Math.cos(dr) * dist) % D) + D) % D);
      yaw = dr;
    }
    return { x, y: 0, z, yaw, dist };
  };
}

// Far LOD tiers: 'pawn' = sphere head on a box torso + one leg box (no arms), 'dot' = one small box. Colour per instance.
function createSimpleCrowd(o) {
  const seed = o.seed ?? 1, r = rng(seed), count = o.count ?? 300, pick = (a) => a[Math.floor(r() * a.length)];
  const agents = Array.from({ length: count }, () => ({ u: r(), w: r(), j: r(), yawJ: (r() - 0.5) * 2, phase: r(), skin: SKIN[pick(SKIN_LIST)], shirt: pick(PALETTE), pants: pick(['#2f3e57', '#4a6fa5', '#3b3b3b', '#6b4f2e', '#1f2a44']) }));
  const place = makeLayout(o, count, agents), root = new THREE.Group();
  const dot = o.lod === 'dot';
  const pieces = dot ? [[new THREE.BoxGeometry(1.4, 4.6, 1), 'shirt', 2.3]] : [[new THREE.SphereGeometry(0.62, 10, 8), 'skin', 4.45], [new THREE.BoxGeometry(2, 2, 1), 'shirt', 2.9], [new THREE.BoxGeometry(1.8, 1.9, 0.9), 'pants', 0.95]];
  const meshes = pieces.map(([geo, key, y]) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), count);
    agents.forEach((a, i) => m.setColorAt(i, new THREE.Color(a[key])));
    m.castShadow = !dot; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(m); return { m, y };
  });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  function update(lt = 0) {
    for (let i = 0; i < count; i++) {
      const p = place(i, lt), a = agents[i];
      const bob = o.speed ? 0.12 * Math.abs(Math.sin((p.dist / 3.5 + a.phase) * Math.PI)) : 0; // stride bob, never lockstep
      Q.setFromAxisAngle(Y, p.yaw);
      for (const { m, y } of meshes) { P.set(p.x, p.y + y + bob, p.z); m.setMatrixAt(i, M.compose(P, Q, ONE)); }
    }
    for (const { m } of meshes) m.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { kind: 'crowd', root, parts: {}, anchors: {}, agents, update, setPose() {}, setExpression() {}, dispose() {} };
}

export function createCrowd(o = {}) {
  if (o.lod === 'pawn' || o.lod === 'dot') return createSimpleCrowd(o);
  const seed = o.seed ?? 1, r = rng(seed), count = o.count ?? 100;
  const d = dimsFor({ body: o.body ?? 'classic' });
  const V = 16, ppu = o.ppu ?? 32, cell = ATLAS_UNITS * ppu;
  const outfits = Array.from({ length: V }, (_, i) => o.outfits?.[i % o.outfits.length] ?? randomOutfit(rng(seed * 131 + i)));
  // body atlas
  const bc = makeCanvas(cell * COLS, cell * (V / COLS)), bg = bc.getContext('2d');
  outfits.forEach((sp, i) => paintBody(bg, sp, { ppu, x0: (i % COLS) * cell, y0: Math.floor(i / COLS) * cell }));
  // head atlas: variant i face 0 -> cell i, face 1 -> cell i + V
  const HW = 256, HH = Math.round((HW * d.head.h) / (d.head.r * FACE_ARC)), faces = o.faces ?? FACES, styles = Object.keys(FACE_STYLES);
  const hc = makeCanvas(HW * COLS, HH * ((2 * V) / COLS)), hg = hc.getContext('2d');
  for (let k = 0; k < 2 * V; k++) {
    const sp = outfits[k % V], rr = rng(seed * 7 + k);
    paintHead(hg, (k % COLS) * HW, Math.floor(k / COLS) * HH, HW, HH, d.head, SKIN[sp.skin] ?? sp.skin, faces[Math.floor(rr() * faces.length)], styles[Math.floor(rr() * styles.length)]);
  }
  const bodyMat = cellMaterial(tex(bc), V / COLS, 0.62), headMat = cellMaterial(tex(hc), (2 * V) / COLS, 0.45);
  const G = rigGeometries(d, 1);
  const root = new THREE.Group(); root.name = 'crowd';
  const cellAttr = (vals) => new THREE.InstancedBufferAttribute(new Float32Array(vals), 1);
  // agents
  const pick = (a) => a[Math.floor(r() * a.length)];
  const clips = [].concat(o.clip ?? 'idle');
  const agents = [];
  for (let i = 0; i < count; i++) {
    const v = Math.floor(r() * V);
    agents.push({ v, face: r() < 0.5 ? 0 : 1, phase: r(), rate: 1 + (r() - 0.5) * 2 * (o.rateJitter ?? 0.08), u: r(), w: r(), j: r(), clip: pick(clips), hair: o.hair === false ? 'bald' : pick(o.hairs ?? HAIRS), hairColor: pick(HAIR_COLORS), yawJ: (r() - 0.5) * 2 });
  }
  const parts = ['torso', 'lArm', 'rArm', 'lLeg', 'rLeg', 'head'];
  const im = {};
  for (const k of parts) {
    const geo = G[k].clone();
    geo.setAttribute('aCell', cellAttr(agents.map((a) => (k === 'head' ? a.v + a.face * V : a.v))));
    const m = new THREE.InstancedMesh(geo, k === 'head' ? headMat : bodyMat, count);
    m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(m); im[k] = m;
  }
  const hairGroups = new Map();
  agents.forEach((a, i) => { if (!hairGroups.has(a.hair)) hairGroups.set(a.hair, []); hairGroups.get(a.hair).push(i); });
  const hairMeshes = [];
  for (const [style, idx] of hairGroups) {
    const g = hairGeometry(style, d.head, 1);
    if (!g) continue;
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.32 }), idx.length);
    idx.forEach((ai, j) => m.setColorAt(j, new THREE.Color(agents[ai].hairColor)));
    m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(m); hairMeshes.push({ m, idx });
  }
  const place = makeLayout(o, count, agents);
  const hairOf = new Array(count).fill(null);
  for (const h of hairMeshes) h.idx.forEach((ai, j) => (hairOf[ai] = [h.m, j]));
  const tmpl = buildRig(d, null, null, { lod: 1, shadows: false });
  for (const a of Object.values(tmpl.anchors)) a.removeFromParent(); // fewer nodes per agent matrix update
  const hairNode = tmpl.meshes.head; // hair sits at the head-mesh centre
  const ci = { d, scale: 1, phase: 0, seed };

  function update(lt = 0) {
    for (let i = 0; i < count; i++) {
      const a = agents[i], clip = CLIPS[a.clip] ?? CLIPS.idle;
      const { x, y, z, yaw, dist } = place(i, lt);
      const speed = o.speed ?? 0;
      ci.phase = a.phase;
      let t;
      if (clip.loco) t = (speed ? dist / strideOf(ci, clip) : lt * a.rate) * clip.period + a.phase * clip.period;
      else t = lt * a.rate + a.phase * 10;
      if (!clip.loop && clip.dur != null) t = Math.min(t, clip.dur);
      const n = toNative(clip.fn(t, {}, ci, {}) ?? {});
      n.rootPos = [x, y, z]; n.rootYaw = yaw;
      applyNativePose(tmpl, d, n);
      tmpl.root.updateMatrixWorld(true);
      for (const k of parts) im[k].setMatrixAt(i, tmpl.meshes[k].matrixWorld);
      if (hairOf[i]) hairOf[i][0].setMatrixAt(hairOf[i][1], hairNode.matrixWorld);
    }
    for (const k of parts) im[k].instanceMatrix.needsUpdate = true;
    for (const h of hairMeshes) h.m.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return {
    kind: 'crowd', root, parts: {}, anchors: {}, d, agents, update,
    setPose() {}, setExpression() {},
    dispose() { root.traverse((m) => { if (m.isInstancedMesh) m.geometry.dispose(); }); bodyMat.map.dispose(); headMat.map.dispose(); },
  };
}
export const crowdSeed = (o) => o.seed ?? hashString(JSON.stringify(o));
