// Blocky voxel-style pets/animals built from parts (square black eyes with a white glint pixel), using the same
// pose channels as humans so the timeline/animate() machinery applies: torso = body, head, lArm/rArm = front legs
// (birds: wings), lLeg/rLeg = back legs, plus `tail`. Clips: idle, walk, run, sit, lie, wag, fly (birds), peck.
//   cast: { rex: { animal: 'dog', color: '#c08040', color2: '#f0e0c8', scale: 1 } }
// kinds: dog puppy wolf tiger mouse cat deer owl goose
import * as THREE from 'three';
import { smoothstep } from '../core/math.js';
import { mat } from './accessories.js';

const TAU = Math.PI * 2, S = Math.sin;
const KINDS = {
  dog: { body: [1.0, 0.9, 1.8], leg: 0.8, legW: 0.34, head: [0.9, 0.8, 0.85], snout: [0.5, 0.35, 0.45], ears: 'flop', tail: [0.18, 0.18, 0.8], color: '#b97a45', color2: '#f2e2c8' },
  puppy: { body: [0.8, 0.7, 1.2], leg: 0.5, legW: 0.3, head: [0.85, 0.75, 0.8], snout: [0.42, 0.3, 0.35], ears: 'flop', tail: [0.15, 0.15, 0.5], color: '#e0b070', color2: '#fff4e0' },
  wolf: { body: [1.2, 1.1, 2.4], leg: 1.2, legW: 0.38, head: [1.0, 0.9, 1.0], snout: [0.55, 0.4, 0.6], ears: 'point', tail: [0.3, 0.3, 1.2], color: '#7d8590', color2: '#d8dce0' },
  tiger: { body: [1.6, 1.4, 3.2], leg: 1.3, legW: 0.55, head: [1.4, 1.2, 1.2], snout: [0.7, 0.45, 0.45], ears: 'round', tail: [0.25, 0.25, 1.6], color: '#f08a24', color2: '#fff3e0', stripes: '#1c1410' },
  mouse: { body: [0.8, 0.7, 1.4], leg: 0.3, legW: 0.22, head: [0.7, 0.6, 0.75], snout: [0.3, 0.25, 0.3], ears: 'round', tail: [0.08, 0.08, 1.6], color: '#8e8a86', color2: '#f2c4c8' },
  cat: { body: [0.7, 0.7, 1.4], leg: 0.6, legW: 0.25, head: [0.8, 0.7, 0.7], snout: [0.3, 0.2, 0.15], ears: 'point', tail: [0.14, 0.14, 1.0], color: '#6a6a6a', color2: '#e8e8e8' },
  deer: { body: [1.1, 1.1, 2.2], leg: 1.8, legW: 0.28, head: [0.75, 0.75, 0.9], snout: [0.4, 0.35, 0.4], ears: 'point', neck: 0.9, antlers: true, tail: [0.25, 0.25, 0.25], color: '#a0673a', color2: '#f2e6d6' },
  owl: { bird: true, body: [1.3, 1.6, 1.2], leg: 0.3, legW: 0.15, head: null, wing: [0.2, 1.1, 0.9], color: '#8a6440', color2: '#e8d6b4', beak: '#f2b230', bigEyes: true },
  goose: { bird: true, body: [0.9, 0.8, 1.6], leg: 0.7, legW: 0.12, head: [0.45, 0.45, 0.6], neck: 1.0, wing: [0.15, 0.6, 1.1], color: '#f4f4f4', color2: '#e0e0e0', beak: '#f28a1c' },
};

function stripeTexture(c1, c2) {
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(128, 128) : Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const g = cv.getContext('2d'); g.fillStyle = c1; g.fillRect(0, 0, 128, 128); g.fillStyle = c2;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 22 + 4, 0); g.lineTo(i * 22 + 12, 0); g.lineTo(i * 22 + 8, 128); g.lineTo(i * 22 + 2, 128); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createAnimal(spec) {
  const K = { ...KINDS[spec.animal] };
  if (!spec.animal || !KINDS[spec.animal]) throw new Error(`characters: unknown animal "${spec.animal}" (known: ${Object.keys(KINDS).join(', ')})`);
  const col = spec.color ?? K.color, col2 = spec.color2 ?? K.color2;
  const m1 = K.stripes ? new THREE.MeshStandardMaterial({ map: stripeTexture(col, K.stripes), roughness: 0.55 }) : mat(col, { rough: 0.55 }), m2 = mat(col2, { rough: 0.55 });
  const black = mat('#111111', { rough: 0.3 }), white = mat('#ffffff', { rough: 0.3 });
  const node = (p, x = 0, y = 0, z = 0) => { const o = new THREE.Group(); o.position.set(x, y, z); p?.add(o); return o; };
  const box = (p, size, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(...size), m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; p.add(me); return me; };
  const [bw, bh, bd] = K.body, L = K.leg;
  const root = node(null);
  const body = node(root, 0, L + bh / 2, 0);
  const torso = node(body);
  box(torso, K.body, m1);
  box(torso, [bw * 0.7, 0.06, bd * 0.6], m2, 0, -bh / 2 - 0.01, 0);
  const legs = {};
  const legPos = K.bird ? { lLeg: [bw * 0.25, -bd * 0.05], rLeg: [-bw * 0.25, -bd * 0.05] } : { lArm: [bw * 0.32, bd * 0.36], rArm: [-bw * 0.32, bd * 0.36], lLeg: [bw * 0.32, -bd * 0.36], rLeg: [-bw * 0.32, -bd * 0.36] };
  for (const [k, [x, z]] of Object.entries(legPos)) {
    legs[k] = node(body, x, -bh / 2 + 0.05, z);
    box(legs[k], [K.legW, L + 0.05, K.legW], K.bird ? mat(K.beak ?? '#f2a030', { rough: 0.4 }) : m1, 0, -(L + 0.05) / 2, 0);
    if (!K.bird) box(legs[k], [K.legW * 1.05, 0.14, K.legW * 1.15], m2, 0, -L + 0.02, 0.02);
    else box(legs[k], [0.35, 0.05, 0.4], mat(K.beak ?? '#f2a030', { rough: 0.4 }), 0, -L, 0.1);
  }
  if (K.bird) for (const [k, s] of [['lArm', 1], ['rArm', -1]]) { legs[k] = node(torso, s * (bw / 2), bh * 0.25, 0); box(legs[k], K.wing, m1, s * K.wing[0] / 2, -K.wing[1] / 2, 0); }
  // head (owl: face on the body front)
  const neckH = K.neck ?? 0;
  const head = node(torso, 0, bh / 2 + (K.head ? -0.05 : -bh / 2), K.head ? bd / 2 - 0.1 : 0);
  let face;
  if (K.head) {
    if (neckH) box(head, [K.head[0] * 0.55, neckH, K.head[0] * 0.55], m1, 0, neckH / 2, 0);
    face = node(head, 0, neckH + K.head[1] / 2 - 0.05, K.head[2] / 2 - 0.1);
    box(face, K.head, m1);
    if (K.snout) { box(face, K.snout, m2, 0, -K.head[1] * 0.18, K.head[2] / 2 + K.snout[2] / 2 - 0.02); box(face, [K.snout[0] * 0.45, K.snout[1] * 0.4, 0.08], black, 0, -K.head[1] * 0.08, K.head[2] / 2 + K.snout[2] - 0.01); }
    if (K.beak) box(face, [K.head[0] * 0.45, K.head[1] * 0.3, 0.4], mat(K.beak, { rough: 0.4 }), 0, -0.05, K.head[2] / 2 + 0.18);
    const ew = K.head[0] * 0.17;
    for (const s of [-1, 1]) { box(face, [ew, ew * 1.15, 0.04], black, s * K.head[0] * 0.25, K.head[1] * 0.12, K.head[2] / 2 + 0.01); box(face, [ew * 0.35, ew * 0.35, 0.02], white, s * K.head[0] * 0.25 - ew * 0.2, K.head[1] * 0.12 + ew * 0.3, K.head[2] / 2 + 0.035); }
    for (const s of [-1, 1]) {
      if (K.ears === 'flop') box(face, [0.18, K.head[1] * 0.6, K.head[2] * 0.4], m2, s * (K.head[0] / 2 + 0.07), K.head[1] * 0.05, -0.05);
      else if (K.ears === 'point') { const e = box(face, [0.22, 0.32, 0.12], m1, s * K.head[0] * 0.3, K.head[1] / 2 + 0.14, -K.head[2] * 0.15); e.rotation.z = s * -0.2; }
      else if (K.ears === 'round') box(face, [0.3, 0.28, 0.12], m1, s * K.head[0] * 0.36, K.head[1] / 2 + 0.1, -K.head[2] * 0.15);
      if (K.antlers) { const a = box(face, [0.08, 0.6, 0.08], mat('#e8d8b0', { rough: 0.6 }), s * 0.22, K.head[1] / 2 + 0.3, -0.1); a.rotation.z = s * -0.35; box(a, [0.3, 0.07, 0.07], a.material, s * 0.12, 0.15, 0); }
    }
  } else { // owl
    face = node(torso, 0, bh * 0.22, bd / 2);
    for (const s of [-1, 1]) { box(face, [0.48, 0.48, 0.05], m2, s * 0.3, 0, 0.01); box(face, [0.26, 0.26, 0.04], black, s * 0.3, 0, 0.05); box(face, [0.08, 0.08, 0.02], white, s * 0.3 - 0.06, 0.07, 0.075); }
    box(face, [0.18, 0.22, 0.2], mat(K.beak, { rough: 0.4 }), 0, -0.25, 0.08);
    for (const s of [-1, 1]) box(torso, [0.22, 0.3, 0.15], m1, s * bw * 0.36, bh / 2 + 0.12, bd * 0.2);
  }
  let tail = null;
  if (K.tail) { tail = node(torso, 0, bh * 0.3, -bd / 2); box(tail, K.tail, m1, 0, 0, -K.tail[2] / 2); }
  const neckY = bh / 2 + neckH + (K.head?.[1] ?? 0);
  const d = { leg: [K.legW, L, K.legW], torso: [bw, neckY, bd], head: { r: 0.4, h: (K.head?.[1] ?? 0.6) }, shoulderDrop: 0, armX: bw / 2 };
  d.height = L + neckY;
  const scale = spec.scale ?? 1;
  root.scale.setScalar(scale);
  const parts = { torso, head, ...legs };
  const anchors = { head: face, face, back: node(torso, 0, bh / 2, 0), collar: node(head, 0, K.head ? 0.1 : bh * 0.1, 0.05), feet: root };
  if (spec.collar) { box(anchors.collar, [K.head ? K.head[0] * 0.8 : bw, 0.12, K.head ? K.head[2] * 0.7 : bd], mat(spec.collar, { rough: 0.3, metal: spec.collar === 'gold' ? 1 : 0 })); }
  return {
    kind: 'animal', animal: spec.animal, bird: !!K.bird, root, parts, anchors, d, scale, spec, seed: (spec.seed ?? spec.animal.length * 31) | 0, phase: ((spec.seed ?? 7) * 0.618) % 1,
    clips: K.bird ? BIRD_CLIPS : QUAD_CLIPS, defaultClip: 'idle',
    setPose(p) {
      root.position.set(...(p.rootPos ?? [root.position.x, root.position.y, root.position.z]));
      if (p.rootYaw != null) root.rotation.set(0, p.rootYaw, 0);
      body.position.set(p.bodyPos?.[0] ?? 0, L + bh / 2 + (p.bodyPos?.[1] ?? 0), p.bodyPos?.[2] ?? 0);
      body.rotation.set(...(p.bodyRot ?? [0, 0, 0]));
      for (const k of ['torso', 'head', 'lArm', 'rArm', 'lLeg', 'rLeg']) if (parts[k] && p[k]) parts[k].rotation.set(...p[k]);
      if (tail && p.tail) tail.rotation.set(...p.tail);
    },
    setExpression() {}, dispose() {},
  };
}

// Quadruped clips: diagonal-pair walk, bounding run. Same channel convention as anim.js; `tail` = [pitch, yaw, roll].
export const QUAD_CLIPS = {
  stand: { loop: true, fn: () => ({}) },
  idle: { loop: true, fn: (t, p, c) => { const b = S(TAU * t / 2.6 + c.phase * 6); return { torso: [0.6 * b, 0, 0], head: [2 * b, 6 * S(t * 0.6 + c.phase * 9), 0], tail: [-20, 25 * S(TAU * 1.5 * t), 0] }; } },
  wag: { loop: true, fn: (t) => ({ tail: [-35, 40 * S(TAU * 4 * t), 0], head: [-5, 0, 6 * S(TAU * 2 * t)] }) },
  walk: { loop: true, period: 0.6, amp: 28, speed: 5, loco: true, fn: (t) => { const s = S(TAU * t / 0.6); return { lArm: [28 * s, 0, 0], rLeg: [28 * s, 0, 0], rArm: [-28 * s, 0, 0], lLeg: [-28 * s, 0, 0], head: [2 * S(TAU * t / 0.3), 0, 0], tail: [-15, 15 * s, 0] }; } },
  run: { loop: true, period: 0.38, amp: 40, speed: 14, loco: true, fn: (t) => { const ph = TAU * t / 0.38, s = S(ph), s2 = S(ph + 0.6); return { off: [0, 0.12 * Math.abs(S(ph)), 0], torso: [6 * S(ph + 1.2), 0, 0], lArm: [42 * s, 0, 0], rArm: [42 * s2, 0, 0], lLeg: [-42 * s, 0, 0], rLeg: [-42 * s2, 0, 0], head: [-6 * S(ph + 1.2), 0, 0], tail: [-30, 0, 0] }; } },
  sit: { loop: true, fn: (t, p, c) => { const k = smoothstep(0, 0.3, t); return { torso: [-32 * k, 0, 0], off: [0, -c.d.leg[1] * 0.35 * k, -0.2 * k], lLeg: [75 * k, 0, 0], rLeg: [75 * k, 0, 0], lArm: [32 * k, 0, 0], rArm: [32 * k, 0, 0], head: [30 * k, 0, 0], tail: [10, 20 * S(TAU * 1.2 * t), 0] }; } },
  lie: { loop: true, fn: (t, p, c) => { const k = smoothstep(0, 0.35, t); return { off: [0, -c.d.leg[1] * 0.9 * k, 0], lArm: [80 * k, 0, 0], rArm: [80 * k, 0, 0], lLeg: [-80 * k, 0, 0], rLeg: [-80 * k, 0, 0], head: [8 * k, 0, 0], tail: [0, 30, 0] }; } },
  jump: { dur: 0.5, fn: (t, p, c) => { const u = Math.min(1, t / 0.5), H = p.height ?? 1.5; return { off: [0, 4 * H * u * (1 - u) / c.scale, 0], torso: [-15 * S(u * Math.PI), 0, 0], lArm: [50 * S(u * Math.PI), 0, 0], rArm: [50 * S(u * Math.PI), 0, 0], lLeg: [-40 * S(u * Math.PI), 0, 0], rLeg: [-40 * S(u * Math.PI), 0, 0] }; } },
};
export const BIRD_CLIPS = {
  stand: { loop: true, fn: () => ({}) },
  idle: { loop: true, fn: (t, p, c) => ({ head: [3 * S(TAU * t / 2 + c.phase), 20 * Math.sign(S(TAU * t / 3.1 + c.phase * 5)), 0], torso: [0.8 * S(TAU * t / 2.4), 0, 0] }) },
  walk: { loop: true, period: 0.5, amp: 30, speed: 3, loco: true, fn: (t) => { const s = S(TAU * t / 0.5); return { lLeg: [30 * s, 0, 0], rLeg: [-30 * s, 0, 0], torso: [0, 0, 5 * s], head: [8 * Math.abs(s), 0, 0] }; } },
  run: { loop: true, period: 0.32, amp: 40, speed: 7, loco: true, fn: (t) => { const s = S(TAU * t / 0.32); return { lLeg: [40 * s, 0, 0], rLeg: [-40 * s, 0, 0], torso: [10, 0, 6 * s], lArm: [0, 30 + 30 * Math.abs(s), 0], rArm: [0, 30 + 30 * Math.abs(s), 0] }; } },
  fly: { loop: true, speed: 14, fn: (t) => { const s = S(TAU * 4 * t); return { off: [0, 0.15 * s, 0], torso: [8, 0, 0], lArm: [0, 20 + 70 * (0.5 + 0.5 * s), 0], rArm: [0, 20 + 70 * (0.5 + 0.5 * s), 0], lLeg: [-50, 0, 0], rLeg: [-50, 0, 0] }; } },
  peck: { loop: true, fn: (t) => ({ torso: [35 * Math.max(0, S(TAU * 1.5 * t)), 0, 0], head: [20 * Math.max(0, S(TAU * 1.5 * t)), 0, 0] }) },
};
export const ANIMAL_KINDS = Object.keys(KINDS);
