// Camera module: shot camera moves, 9:16 framing helpers, FOV zoom and seeded shake. Pure function of shot time.
//
//   evaluateCamera(spec, lt, shotDur, ctx) -> { position: Vector3, target: Vector3, fov (deg, vertical), roll (rad) }
//
// A shot's `camera` spec (all fields optional; `production.camera` holds production-wide defaults, e.g. an
// "alive camera" `{ shake: 'sway', zoom: 'push' }`, which the shot spec and the move preset override):
//   move    'static' | 'push_in' | 'pull_out' | 'truck' | 'pedestal' | 'crane_up' | 'crane_down' | 'orbit' | 'arc' |
//           'track' | 'lead' | 'flyover' | 'aerial_reveal' | 'top_down' | 'dolly_zoom' | 'whip' | 'pan' | 'tilt' |
//           'handheld' | 'path'
//   target  what the camera frames: 'hero' (actor root + framing aim height, bob-free), 'hero.head' (a part/anchor),
//           'set.door', [x,y,z]
//   frame   'ecu' | 'cu' | 'mcu' | 'ms' | 'mws' | 'ws' | 'ews'  -> distance from the FOV so the subject fills the 9:16
//           frame like the target style (MS: head at ~30 % of frame height). Or give `dist` (studs) directly.
//   side    'front' | 'front-left' | 'left' | 'back-left' | 'back' | 'back-right' | 'right' | 'front-right'
//   yaw     degrees around the subject, 0 = in front of it (relative to the actor's facing: the shot's actor `yaw`, or
//           the live facing for track/lead; `space: 'world'` or `heading: deg` override). 90 = subject's left.
//   angle   'eye' | 'low' | 'worm' | 'high' | 'bird' | 'top'  or  `pitch` (deg, + = camera above looking down)
//           or `height` (studs above the aim point; distance then counts horizontally)
//   fov     vertical FOV in degrees (default 50; Roblox gameplay is 70, cinematic 20-50)
//   roll    degrees (dutch angle); screen: [sx, sy] puts the subject off-centre (fractions of frame, + = right/up)
//   pos     explicit camera position ([x,y,z] or anchor ref): locked-off camera that pans to follow `target`
//   offset  [x,y,z] camera-local shift of camera AND aim (x right, y up, z back) - what truck/pedestal/flyover animate
//   from / to   per-end overrides of any field above (+ pos); `ease` (core/math EASE name), `t`/`dur` limit the move
//           to part of the shot. Move presets fill sensible defaults (see MOVES): `amount`, `sweep`, `travel`, `spin`.
//   zoom    pure FOV magnification on top of the move (sharp, no parallax change, like the target style push-ins):
//           0.1 (rate: +10 %/s linear, the measured house median) | a ZOOMS name ('house', 'gentle', 'slow', 'push',
//           'insert_fast', 'emphasis', 'punch', 'punch_small', 'reveal', 'pull_gentle', 'crash_pull', ...)
//           | { rate } | { from, to, t, dur, ease } (magnification, log-interpolated) | [several, multiplied]
//   shake   see camera/shake.js ('run' | 'sway' | 'handheld' | 'rumble' | 'slide' | 'impact' | {...} | [...]);
//           opt-in (several sample Shorts have none); S6 track/lead shots use 'run'. Move 'handheld'
//           defaults to 'handheld'; `shake: null` disables a production default.
//   drift   roll drift in degrees over the shot, sign alternating per shot index (S10/S2: 2-5 deg per shot)
//   whip    for move 'whip': { t, dur: 0.2, sweep: 80 (deg pan) | to: 'other.head', dir: 'out' | 'in', ease }
//   pan / tilt: `sweep` degrees (tilt + = up) or `aimTo: ref`, over the move with `ease` (try 'spring')
//   ease    any core/math EASE name, or 'spring' (+ `spring: { freq: 5, damping: 0.3 }`) for an overshoot settle
//   keys    for move 'path': [{ t | u (fraction of shot), pos, target, fov, roll, ease }], `smooth: true` = Catmull-Rom
//   floor   minimum camera height (default 0.3; null disables)
//   widen   optical zoom-out factor applied last (default 1.15; production.camera.widen sets it for the whole video)
//
// Examples
//   { move: 'static', target: 'hero', frame: 'cu', zoom: 'slow' }                    // house default CU
//   { move: 'lead', target: 'hero', frame: 'ms' }                                    // track-back in front of a runner
//   { move: 'pull_out', target: 'globe', from: { dist: 3, roll: 0 }, to: { dist: 40, roll: -15 }, ease: 'outCubic' }
//   { move: 'path', keys: [{ u: 0, pos: [0, 2, 12], target: 'hero.head' }, { u: 1, pos: [6, 8, 6], fov: 35 }] }
import * as THREE from 'three';
import { clamp, deg, ease, invLerp, lerp } from '../core/math.js';
import { shakeAt, SHAKES } from './shake.js';

export { SHAKES };

// Visible frame height (studs) at the subject for each framing, for a ~5-stud character in 9:16.
export const FRAMES = { ecu: 2.0, cu: 4.0, mcu: 5.5, ms: 7.5, mws: 10, ws: 16, ews: 60 };
// Aim height above an actor's root (feet) for each framing when the target is the bare actor ('hero').
export const AIM = { ecu: 4.55, cu: 4.35, mcu: 3.95, ms: 3.1, mws: 2.8, ws: 2.5, ews: 2.5 };
export const SIDES = { front: 0, 'front-left': 45, left: 90, 'back-left': 135, back: 180, 'back-right': -135, right: -90, 'front-right': -45 };
export const ANGLES = { eye: 4, low: -15, worm: -35, high: 30, bird: 55, top: 89.5 };
// Measured zoom grammar: S6 median +14 %/s linear; S9 default push +5..15 % ease-out (60 % in the first
// half); inserts +25..55 % in 0.7-1.25 s; S8 keyword punch +25 % in 0.25 s easeOutCubic; S6 globe -91 % ease-out.
// Names match analysis/screen_grammar.json camera.zoom_presets (house = measured median ~+10 %/s, linear).
export const ZOOMS = {
  house: { rate: 0.1 },
  gentle: { rate: 0.06 },
  slow: { rate: 0.09 },
  slow_crig: { rate: 0.14 },
  push: { to: 1.12, ease: 'outQuad' },
  insert_fast: { to: 1.4, dur: 1.0, ease: 'linear' },
  emphasis: { to: 1.5, ease: 'outQuad' },
  punch: { to: 1.25, dur: 0.25, ease: 'outCubic' },
  punch_small: { to: 1.13, dur: 0.38, ease: 'outCubic' },
  reveal: { from: 11.5, to: 1, ease: 'outCubic' },
  pull_gentle: { rate: -0.12 },
  crash_pull: { from: 1, to: 0.2, dur: 0.45, ease: 'inCubic' },
};
ZOOMS.push_easeout = ZOOMS.push;

// Move presets: defaults layered under the shot spec. from: rig fields; to(from): end fields; live: follow the
// subject's live facing (track/lead); crane: height change in studs; keepFraming: dolly zoom.
const MOVES = {
  static: () => ({}),
  handheld: () => ({ shake: 'handheld' }),
  push_in: (s) => ({ to: (f) => ({ dist: f.dist * (1 - (s.amount ?? 0.1)) }), ease: 'linear' }), // ~+11 %, the measured median push
  pull_out: (s) => ({ to: (f) => ({ dist: f.dist * (1 + (s.amount ?? 0.8)) }), ease: 'outCubic' }),
  truck: (s) => { const a = s.amount ?? 6; return { from: { offset: [-a / 2, 0, 0] }, to: () => ({ offset: [a / 2, 0, 0] }) }; },
  pedestal: (s) => { const a = s.amount ?? 3; return { from: { offset: [0, -a / 2, 0] }, to: () => ({ offset: [0, a / 2, 0] }) }; },
  crane_up: (s) => ({ crane: s.amount ?? 8 }),
  crane_down: (s) => ({ crane: -(s.amount ?? 8) }),
  orbit: (s) => ({ to: (f) => ({ yaw: f.yaw + (s.sweep ?? 90) }) }),
  arc: (s) => ({ to: (f) => ({ yaw: f.yaw + (s.sweep ?? 35), dist: f.dist * 0.85 }) }),
  track: (s) => ({ from: { yaw: s.yaw ?? SIDES[s.side ?? 'back'] }, live: true }),
  lead: (s) => ({ from: { yaw: s.yaw ?? SIDES[s.side ?? 'front'], pitch: s.pitch ?? ANGLES[s.angle ?? ''] ?? -3 }, live: true }),
  flyover: (s) => {
    const d = s.travel ?? 60;
    return { from: { pitch: s.pitch ?? 35, dist: s.dist ?? 45, offset: [0, 0, d / 2] }, to: () => ({ offset: [0, 0, -d / 2] }), ease: 'linear' };
  },
  aerial_reveal: (s) => ({ to: (f) => ({ dist: f.dist * (s.amount ?? 8), pitch: 40 }), ease: 'inOutCubic' }),
  top_down: (s) => ({ from: { pitch: 89.5, frame: s.frame ?? 'ws' }, to: (f) => ({ roll: f.roll + (s.spin ?? 12), dist: f.dist * (s.rise ?? 0.85) }), ease: 'linear' }),
  dolly_zoom: (s) => ({ from: { fov: s.from?.fov ?? 30 }, to: () => ({ fov: 70 }), keepFraming: true }),
  whip: () => ({}),
  pan: () => ({}),   // camera fixed, aim swings horizontally by `sweep` deg (or toward `aimTo`) over the move
  tilt: () => ({}),  // camera fixed, aim swings vertically by `sweep` deg (+ = up; or toward `aimTo`)
};

const UP = new THREE.Vector3(0, 1, 0);
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

const frameDist = (frame, fov) => {
  const h = FRAMES[frame];
  if (h == null) throw new Error(`camera: unknown frame "${frame}" (known: ${Object.keys(FRAMES).join(', ')})`);
  return h / (2 * Math.tan(deg(fov) / 2));
};

function baseRig(s) {
  if (s.side != null && SIDES[s.side] == null) throw new Error(`camera: unknown side "${s.side}" (known: ${Object.keys(SIDES).join(', ')})`);
  if (s.angle != null && ANGLES[s.angle] == null) throw new Error(`camera: unknown angle "${s.angle}" (known: ${Object.keys(ANGLES).join(', ')})`);
  return {
    fov: s.fov ?? 50, frame: s.frame, dist: s.dist, yaw: s.yaw ?? SIDES[s.side] ?? 0,
    pitch: s.pitch ?? ANGLES[s.angle] ?? ANGLES.eye, height: s.height, roll: s.roll ?? 0,
    offset: s.offset ?? [0, 0, 0], screen: s.screen ?? [0, 0], aim: s.aim, pos: s.pos,
  };
}

// Fill dist (from framing) and aim height; `scale` = subject size multiplier (actor root scale).
function finish(r, scale) {
  r.dist ??= frameDist(r.frame ?? 'ms', r.fov) * scale;
  r.aim ??= AIM[r.frame ?? 'ms'] ?? AIM.ms;
  return r;
}

function lerpRig(a, b, u) {
  const r = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? b[k], y = b[k] ?? a[k];
    r[k] = typeof x === 'number' ? lerp(x, y, u) : Array.isArray(x) && Array.isArray(y) && typeof x[0] === 'number' ? x.map((xi, i) => lerp(xi, y[i], u)) : x?.isVector3 ? x.clone().lerp(y, u) : u < 0.5 ? x : y;
  }
  return r;
}

const actorOf = (ref, ctx) => (typeof ref === 'string' ? ctx.actors?.[ref.split('.')[0]] : null);

function facing(spec, ctx, live) {
  if (spec.heading != null) return spec.heading;
  if (spec.space === 'world') return 0;
  const a = actorOf(spec.target, ctx);
  if (!a) return 0;
  if (!live) return ctx.shot?.actors?.[spec.target.split('.')[0]]?.yaw ?? 0;
  a.root.getWorldDirection(v1);
  return THREE.MathUtils.radToDeg(Math.atan2(v1.x, v1.z));
}

// Aim point: bare actor id -> root + aim height (no head bob); anything else -> ctx.resolve.
function subject(ref, aim, ctx, scale) {
  const out = ctx.resolve(ref, new THREE.Vector3());
  if (typeof ref === 'string' && !ref.includes('.') && ctx.actors?.[ref]) out.y += aim * scale;
  return out;
}

function zoomAt(z, lt, dur) {
  if (z == null || z === false) return 1;
  if (Array.isArray(z)) return z.reduce((m, zz) => m * zoomAt(zz, lt, dur), 1);
  if (typeof z === 'number') z = { rate: z };
  else if (typeof z === 'string') z = ZOOMS[z] ?? (() => { throw new Error(`camera: unknown zoom "${z}" (known: ${Object.keys(ZOOMS).join(', ')})`); })();
  else if (z.preset) z = { ...ZOOMS[z.preset], ...z };
  const t0 = z.t ?? 0;
  if (z.rate != null) return Math.max(0.05, 1 + z.rate * Math.max(0, lt - t0));
  const u = ease(z.ease ?? 'linear')(clamp((lt - t0) / (z.dur ?? Math.max(1e-6, dur - t0))));
  return Math.exp(lerp(Math.log(z.from ?? 1), Math.log(z.to ?? 1), u));
}

// Shared tail: zoom, screen placement, shake, floor clamp.
function finalize(P, T, fovBase, rollDeg, screen, spec, shake, lt, dur, ctx) {
  // widen: optical zoom-out applied after framing/zoom (shows more around the subjects without moving the camera, so it
  // never pushes a camera through a wall). Production-wide via production.camera.widen; default 1.15 (frames read tight).
  const widen = spec.widen ?? 1.15;
  const fov = Math.min(110, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(deg(fovBase) / 2) * widen / zoomAt(spec.zoom, lt, dur))));
  const f = v1.subVectors(T, P);
  const d = Math.max(1e-3, f.length());
  f.divideScalar(d);
  const r = v2.crossVectors(f, UP);
  if (r.lengthSq() < 1e-10) r.set(1, 0, 0);
  r.normalize();
  const u = new THREE.Vector3().crossVectors(r, f);
  const H = 2 * d * Math.tan(deg(fov) / 2), W = H * (ctx.camera?.aspect ?? 9 / 16);
  const sh = shakeAt(shake, lt, dur, ctx.shot?.id ?? '');
  if (spec.drift) rollDeg += spec.drift * clamp(lt / dur) * ((ctx.production?.shots?.indexOf(ctx.shot) ?? 0) % 2 ? -1 : 1);
  const target = T.clone()
    .addScaledVector(r, -(screen?.[0] ?? 0) * W + sh.x * H)
    .addScaledVector(u, -(screen?.[1] ?? 0) * H + sh.y * H);
  const position = P.clone();
  if (spec.floor !== null) position.y = Math.max(position.y, spec.floor ?? 0.3);
  return { position, target, fov, roll: deg(rollDeg + sh.roll) };
}

const resolvePos = (p, ctx) => (p == null ? undefined : p.isVector3 ? p : ctx.resolve(p, new THREE.Vector3()));

export function evaluateCamera(shotSpec = {}, lt, dur, ctx) {
  const prod = ctx.production?.camera ?? {};
  const spec = { ...prod, ...shotSpec };
  const move = spec.move ?? 'static';
  if (move === 'path') return evalPath(spec, shotSpec, lt, dur, ctx);
  const preset = MOVES[move];
  if (!preset) throw new Error(`camera: unknown move "${move}" (known: ${[...Object.keys(MOVES), 'path'].join(', ')})`);
  const def = preset(spec);
  const shake = 'shake' in shotSpec ? shotSpec.shake : def.shake ?? prod.shake;
  spec.target ??= [0, 3, 0];
  const scale = actorOf(spec.target, ctx)?.root.scale.y ?? 1;

  const from = finish({ ...baseRig(spec), ...def.from, ...spec.from }, scale);
  const to = { ...from, ...def.to?.(from), ...spec.to };
  if (spec.to?.frame && spec.to.dist == null) { to.dist = frameDist(spec.to.frame, to.fov) * scale; if (spec.to.aim == null) to.aim = AIM[spec.to.frame]; }
  if (def.crane) { // jib: horizontal distance fixed, camera height changes; the spec's framing is the start (up) / end (down)
    const p = deg(from.pitch), h = from.height ?? from.dist * Math.sin(p), hd = from.height != null ? from.dist : from.dist * Math.cos(p);
    Object.assign(from, { dist: hd, height: h + Math.max(0, -def.crane) });
    Object.assign(to, { dist: spec.to?.dist ?? hd, height: spec.to?.height ?? h + Math.max(0, def.crane) });
  } else if ((from.height == null) !== (to.height == null)) { // mixed pitch/height ends: convert both to height mode
    for (const r of [from, to]) if (r.height == null) { const p = deg(r.pitch); r.height = r.dist * Math.sin(p); r.dist *= Math.cos(p); }
  }
  from.pos = resolvePos(from.pos, ctx);
  to.pos = resolvePos(to.pos, ctx) ?? from.pos;

  const t0 = spec.t ?? 0, len = spec.dur ?? Math.max(1e-6, dur - t0);
  const u = easeFn(spec.ease ?? def.ease ?? 'inOutSine', spec.spring, len)(clamp((lt - t0) / len));
  const R = lerpRig(from, to, u);
  if (def.keepFraming) R.dist = (from.dist * Math.tan(deg(from.fov) / 2)) / Math.tan(deg(R.fov) / 2);

  const S = subject(spec.target, R.aim, ctx, scale);
  const a = deg(facing(spec, ctx, def.live || spec.live) + R.yaw);
  const back = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
  let P;
  if (R.pos) {
    P = R.pos.clone();
    v1.subVectors(P, S).setY(0);
    if (v1.lengthSq() > 1e-8) back.copy(v1.normalize());
  } else if (R.height != null) {
    P = S.clone().addScaledVector(back, R.dist).addScaledVector(UP, R.height);
  } else {
    const p = deg(R.pitch);
    P = S.clone().addScaledVector(back, R.dist * Math.cos(p)).addScaledVector(UP, R.dist * Math.sin(p));
  }
  const right = new THREE.Vector3(back.z, 0, -back.x);
  const [ox, oy, oz] = R.offset;
  const shift = new THREE.Vector3().addScaledVector(right, ox).addScaledVector(UP, oy).addScaledVector(back, oz);
  P.add(shift);
  let T = S.add(shift);
  if (move === 'whip') {
    const w = spec.whip ?? {}, wd = w.dur ?? 0.2, dirIn = w.dir === 'in', wt = w.t ?? (dirIn ? 0 : dur - wd);
    const k = ease(w.ease ?? (dirIn ? 'outCubic' : 'inCubic'))(clamp((lt - wt) / wd));
    T = swingAim(P, T, dirIn ? 1 - k : k, w.to, -(w.sweep ?? 80), UP, ctx); // 'in': arrive from a panned-away aim
  } else if (move === 'pan' || move === 'tilt') {
    const axis = move === 'pan' ? UP : new THREE.Vector3().subVectors(T, P).cross(UP).normalize();
    T = swingAim(P, T, u, spec.aimTo, (move === 'pan' ? -1 : 1) * (spec.sweep ?? 35), axis, ctx);
  }
  return finalize(P, T, R.fov, R.roll, R.screen, spec, shake, lt, dur, ctx);
}

// Rotate the aim about the camera: by `sweep` degrees around `axis`, or toward the `to` anchor; k = progress 0..1.
function swingAim(P, T, k, to, sweep, axis, ctx) {
  const d = v1.subVectors(T, P);
  if (to) {
    const B = ctx.resolve(to, new THREE.Vector3()).sub(P);
    const ya = Math.atan2(d.x, d.z), yb = Math.atan2(B.x, B.z);
    let dy = yb - ya;
    dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI;
    const pa = Math.atan2(d.y, Math.hypot(d.x, d.z)), pb = Math.atan2(B.y, Math.hypot(B.x, B.z));
    const y = ya + dy * k, p = lerp(pa, pb, k), len = lerp(d.length(), B.length(), k);
    return P.clone().add(new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)).multiplyScalar(len));
  }
  return P.clone().add(d.clone().applyAxisAngle(axis, deg(sweep) * k));
}

// Easing by name, plus 'spring': under-damped settle (S1 tilt: ~5 Hz, damping ratio ~0.3), `len` = move seconds.
function easeFn(name, spring = {}, len = 1) {
  if (name !== 'spring') return ease(name);
  const w = 2 * Math.PI * (spring.freq ?? 5), z = spring.damping ?? 0.3, wd = w * Math.sqrt(1 - z * z);
  return (u) => { const t = u * len; return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); };
}

const catmull = (p0, p1, p2, p3, v) => {
  const v2_ = v * v, v3 = v2_ * v;
  return 0.5 * (2 * p1 + (-p0 + p2) * v + (2 * p0 - 5 * p1 + 4 * p2 - p3) * v2_ + (-p0 + 3 * p1 - 3 * p2 + p3) * v3);
};

function evalPath(spec, shotSpec, lt, dur, ctx) {
  const keys = spec.keys;
  if (!keys?.length) throw new Error('camera: move "path" needs keys: [{ t|u, pos, target, fov, roll }]');
  const ts = keys.map((k) => k.t ?? (k.u ?? 0) * dur);
  let i = 0;
  while (i < keys.length - 2 && lt >= ts[i + 1]) i++;
  const j = Math.min(i + 1, keys.length - 1), a = keys[i], b = keys[j];
  const smooth = spec.smooth && keys.length > 2;
  const v = ease(b.ease ?? spec.ease ?? (smooth ? 'linear' : 'inOutSine'))(clamp(invLerp(ts[i], ts[j], lt)));
  const pos = (k) => resolvePos(keys[clamp(k, 0, keys.length - 1)].pos ?? spec.pos, ctx);
  let P;
  if (smooth) {
    const q = [pos(i - 1), pos(i), pos(j), pos(j + 1)];
    P = new THREE.Vector3(...['x', 'y', 'z'].map((c) => catmull(q[0][c], q[1][c], q[2][c], q[3][c], v)));
  } else P = pos(i).clone().lerp(pos(j), v);
  const tgt = (k) => ctx.resolve(k.target ?? spec.target ?? [0, 3, 0], new THREE.Vector3());
  const T = tgt(a).lerp(tgt(b), v);
  const fov = lerp(a.fov ?? spec.fov ?? 50, b.fov ?? a.fov ?? spec.fov ?? 50, v);
  const roll = lerp(a.roll ?? spec.roll ?? 0, b.roll ?? a.roll ?? spec.roll ?? 0, v);
  const shake = 'shake' in shotSpec ? shotSpec.shake : ctx.production?.camera?.shake;
  return finalize(P, T, fov, roll, spec.screen, spec, shake, lt, dur, ctx);
}

// Self-check: framing distance math and zoom presets (cheap, runs once at import).
console.assert(Math.abs(frameDist('ms', 50) - 7.5 / (2 * Math.tan(deg(25)))) < 1e-9 && Math.abs(zoomAt(0.14, 2, 3) - 1.28) < 1e-9 && Math.abs(easeFn('spring', {}, 2)(1) - 1) < 1e-3 && Math.abs(zoomAt('punch', 5, 6) - 1.25) < 1e-9, 'camera self-check failed');
