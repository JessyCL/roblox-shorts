// Blocky 6-part rigid rig: proportion presets, builds, geometry (atlas-UV boxes + rounded-cylinder head), pivots,
// anchors and native pose application. Hierarchy (Kenney-compatible, legs are siblings of the torso):
//   root (feet, yaw, scale) -> body (hip height; whole-body offset/tilt)
//        -> lLeg, rLeg (hip pivots)   -> torso (waist pivot) -> lArm, rArm (shoulder pivots), neck (head)
// Character faces +Z, its LEFT is +X. 1 unit = 1 stud.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Proportion presets. `classic` = R6-like (torso 2x2x1, limbs 1x2x1, ~1.2 rounded-cylinder head).
// `original` (default) = our own proportions: bigger, slightly squatter head, slimmer arms, softer bevels.
export const PRESETS = {
  original: { torso: [2.0, 1.95, 1.05], arm: [0.9, 1.9, 0.9], leg: [0.96, 1.8, 0.96], armGap: 0.05, legGap: 0.08, head: { r: 0.72, h: 1.34, fillet: 0.3 }, bevel: 0.07, shoulderDrop: 0.45 },
  classic: { torso: [2, 2, 1], arm: [1, 2, 1], leg: [1, 2, 1], armGap: 0, legGap: 0, head: { r: 0.62, h: 1.22, fillet: 0.3 }, bevel: 0.03, shoulderDrop: 0.5 },
};
// Builds stretch the parts (head mostly kept) so roles read through proportion. `scale` (uniform) is applied on top.
export const BUILDS = {
  normal: {},
  tall: { legY: 1.75, torsoY: 1.45, armY: 1.6, w: 0.85, head: 1 },      // ~1.6x height, thin
  child: { legY: 0.62, torsoY: 0.7, armY: 0.66, w: 0.75, head: 0.85 },  // ~0.65x height, big-headed
  heavy: { torsoX: 1.35, torsoZ: 1.5, legX: 1.15, armX: 1.05, head: 1 },
  slim: { w: 0.85, torsoZ: 0.9 },
  short: { legY: 0.8, torsoY: 0.9, armY: 0.85 },
  giant: { },                                                          // use with scale: 30..100
};

// Atlas layout in an 8x8 "stud" grid. Rect = [x, y, w, h] (canvas, y down). Sides in character terms.
// BoxGeometry side order: +X (character's left), -X (right), +Y top, -Y bottom, +Z front, -Z back.
export const SIDE_ORDER = ['left', 'right', 'top', 'bottom', 'front', 'back'];
const limbRects = (x, y, capX, isLeft) => ({
  front: [x, y, 1, 2], back: [x + 2, y, 1, 2],
  left: isLeft ? [x + 1, y, 1, 2] : [x + 3, y, 1, 2], // outer side for left limbs is +X
  right: isLeft ? [x + 3, y, 1, 2] : [x + 1, y, 1, 2],
  top: [capX, 7, 1, 1], bottom: [capX + 1, 7, 1, 1],
});
export const RECTS = {
  torso: { front: [0, 0, 2, 2], back: [2, 0, 2, 2], left: [4, 0, 1, 2], right: [5, 0, 1, 2], top: [0, 2, 2, 1], bottom: [2, 2, 2, 1] },
  lArm: limbRects(0, 3, 0, true), rArm: limbRects(4, 3, 2, false),
  lLeg: limbRects(0, 5, 4, true), rLeg: limbRects(4, 5, 6, false),
};
export const ATLAS_UNITS = 8;

// Resolved dimensions for a spec: preset x build (+ optional explicit overrides).
export function dimsFor(spec = {}) {
  const P = PRESETS[spec.body ?? spec.preset ?? spec.proportions ?? 'original'] ?? PRESETS.original;
  const B = typeof spec.build === 'object' ? spec.build : BUILDS[spec.build ?? 'normal'] ?? {};
  const w = B.w ?? 1;
  const torso = [P.torso[0] * (B.torsoX ?? w), P.torso[1] * (B.torsoY ?? 1), P.torso[2] * (B.torsoZ ?? w)];
  const arm = [P.arm[0] * (B.armX ?? w), P.arm[1] * (B.armY ?? 1), P.arm[2] * (B.armX ?? w)];
  const leg = [P.leg[0] * (B.legX ?? w), P.leg[1] * (B.legY ?? 1), P.leg[2] * (B.legX ?? w)];
  const hs = B.head ?? 1;
  const head = { r: P.head.r * hs, h: P.head.h * hs, fillet: P.head.fillet * hs };
  const d = { torso, arm, leg, head, bevel: P.bevel, armGap: P.armGap, legGap: P.legGap, shoulderDrop: P.shoulderDrop * (B.armY ?? 1) };
  d.legX = Math.max(leg[0] / 2 + P.legGap / 2, torso[0] / 4);
  d.armX = torso[0] / 2 + arm[0] / 2 + P.armGap;
  d.height = leg[1] + torso[1] + head.h;
  d.key = JSON.stringify([torso, arm, leg, head, d.bevel, d.shoulderDrop]);
  return d;
}

// Box with rounded edges whose per-side UVs are remapped into the atlas rects of `part`.
function atlasBox(size, bevel, rects, segments = 2) {
  const g = bevel > 0 && segments > 0 ? new RoundedBoxGeometry(size[0], size[1], size[2], segments, bevel) : new THREE.BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
  const uv = g.attributes.uv, n = uv.count, per = n / 6, U = ATLAS_UNITS, pad = 0.006;
  for (let i = 0; i < n; i++) {
    const [x, y, w, h] = rects[SIDE_ORDER[Math.floor(i / per)]];
    const u = THREE.MathUtils.clamp(uv.getX(i), 0, 1), v = THREE.MathUtils.clamp(uv.getY(i), 0, 1);
    uv.setXY(i, (x + pad + u * (w - 2 * pad)) / U, 1 - (y + pad + (1 - v) * (h - 2 * pad)) / U);
  }
  return g;
}

// Rounded-cylinder head (lathe). UV: u = 0.5 + phi/PI (front 180 deg spans the face canvas; the back clamps to the
// canvas edge colour = skin), v = height fraction. phi = 0 faces +Z.
export const FACE_ARC = Math.PI;
export function headGeometry({ r, h, fillet }, seg = 40, steps = 6) {
  const hh = h / 2, f = Math.min(fillet, r * 0.9, hh * 0.9), pts = [new THREE.Vector2(0, -hh)];
  for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2); pts.push(new THREE.Vector2(r - f + f * Math.cos(a), -hh + f + f * Math.sin(a))); }
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * (Math.PI / 2); pts.push(new THREE.Vector2(r - f + f * Math.cos(a), hh - f + f * Math.sin(a))); }
  pts.push(new THREE.Vector2(0, hh));
  const g = new THREE.LatheGeometry(pts, seg, -Math.PI, Math.PI * 2);
  const uv = g.attributes.uv, pos = g.attributes.position, np = pts.length;
  for (let k = 0; k < uv.count; k++) {
    const phi = -Math.PI + (Math.floor(k / np) / seg) * Math.PI * 2;
    uv.setXY(k, 0.5 + phi / FACE_ARC, (pos.getY(k) + hh) / h);
  }
  return g;
}

const geoCache = new Map();
export function rigGeometries(d, lod = 0) {
  const key = d.key + lod;
  if (!geoCache.has(key)) {
    const seg = lod ? 0 : 2;
    geoCache.set(key, {
      torso: atlasBox(d.torso, d.bevel, RECTS.torso, seg),
      lArm: atlasBox(d.arm, d.bevel, RECTS.lArm, seg), rArm: atlasBox(d.arm, d.bevel, RECTS.rArm, seg),
      lLeg: atlasBox(d.leg, d.bevel, RECTS.lLeg, seg), rLeg: atlasBox(d.leg, d.bevel, RECTS.rLeg, seg),
      head: headGeometry(d.head, lod ? 14 : 40, lod ? 2 : 6),
    });
  }
  return geoCache.get(key);
}

// Builds the node hierarchy. Returns pivots (rotate these), meshes and anchors.
export function buildRig(d, bodyMat, headMat, { lod = 0, shadows = true } = {}) {
  const G = rigGeometries(d, lod);
  const node = (name, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); parent?.add(o); return o; };
  const mesh = (geo, mat, parent, x, y, z) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadows; parent.add(m); return m;
  };
  const root = node('character');
  const body = node('body', root, 0, d.leg[1], 0);
  const lLeg = node('lLeg', body, d.legX, 0, 0), rLeg = node('rLeg', body, -d.legX, 0, 0);
  const torso = node('torso', body);
  const shoulderY = d.torso[1] - d.shoulderDrop;
  const lArm = node('lArm', torso, d.armX, shoulderY, 0), rArm = node('rArm', torso, -d.armX, shoulderY, 0);
  const neck = node('head', torso, 0, d.torso[1], 0);
  const meshes = {
    torso: mesh(G.torso, bodyMat, torso, 0, d.torso[1] / 2, 0),
    lArm: mesh(G.lArm, bodyMat, lArm, 0, -(d.arm[1] / 2 - d.shoulderDrop), 0),
    rArm: mesh(G.rArm, bodyMat, rArm, 0, -(d.arm[1] / 2 - d.shoulderDrop), 0),
    lLeg: mesh(G.lLeg, bodyMat, lLeg, 0, -d.leg[1] / 2, 0),
    rLeg: mesh(G.rLeg, bodyMat, rLeg, 0, -d.leg[1] / 2, 0),
    head: mesh(G.head, headMat, neck, 0, d.head.h / 2, 0),
  };
  const armBottom = -(d.arm[1] - d.shoulderDrop);
  const anchors = {
    head: node('a:head', neck, 0, d.head.h / 2, 0),
    face: node('a:face', neck, 0, d.head.h / 2, d.head.r),
    hat: node('a:hat', neck, 0, d.head.h, 0),
    mouth: node('a:mouth', neck, 0, d.head.h / 2 - 0.22 * Math.min(2 * d.head.r, d.head.h), d.head.r),
    chest: node('a:chest', torso, 0, d.torso[1] * 0.62, d.torso[2] / 2),
    back: node('a:back', torso, 0, d.torso[1] * 0.55, -d.torso[2] / 2),
    waist: node('a:waist', torso, 0, 0.15, 0),
    hand_l: node('a:hand_l', lArm, 0, armBottom + 0.15, 0),
    hand_r: node('a:hand_r', rArm, 0, armBottom + 0.15, 0),
    feet: node('a:feet', root),
  };
  return { root, body, parts: { torso, head: neck, lArm, rArm, lLeg, rLeg }, meshes, anchors };
}

// Native pose: { rootPos, rootYaw, bodyPos:[x,y,z] (offset from hip height), bodyRot:[rx,ry,rz], torso, head, lArm, rArm, lLeg, rLeg } radians.
export function applyNativePose(rig, d, p) {
  if (p.rootPos) rig.root.position.set(p.rootPos[0], p.rootPos[1], p.rootPos[2]);
  if (p.rootYaw != null) rig.root.rotation.set(0, p.rootYaw, 0);
  const bp = p.bodyPos ?? [0, 0, 0], br = p.bodyRot ?? [0, 0, 0];
  rig.body.position.set(bp[0], d.leg[1] + bp[1], bp[2]);
  rig.body.rotation.set(br[0], br[1], br[2]);
  for (const k of ['torso', 'head', 'lArm', 'rArm', 'lLeg', 'rLeg']) {
    const r = p[k];
    if (r) rig.parts[k].rotation.set(r[0], r[1], r[2]);
  }
}
