// Animation: procedural clip library (rigid R6-style motion) + the shot timeline evaluator used by animate().
//
// Semantic pose (degrees / studs), every channel optional:
//   off: [x,y,z] body offset from hip height (local studs) · rot: [pitch fwd, yaw, roll] whole-body tilt about the hips
//   torso/head: [pitch (+ = lean fwd / look down), yaw (+ = turn to its left), roll]
//   lArm/rArm/lLeg/rLeg: [fwd (+ = swing forward/up), side (+ = raise outward), twist]
// Work/gesture clips: stomp clap eat sew knit mouth_cover (= hand_over_mouth) palms_up reach shake_fist hop knock
//   drag_walk (loco) crouch_low stand_up. Rope clips: rope_climb (loco) hang_ankle ankle_lift tiptoe (loco) tiptoe_stand
//   untie hold_rope hold_rope_away. Catalogue with descriptions: `node engine/cli/library.mjs list --type clip`.
// Timings follow research/roblox-look.md §7 (R6 walk 0.667 s, legs ~+60/-50, arms ~±50, no bob; jump/fall arms up;
// statue idle) and the target run (S6 C: ~0.4 s cycle, rigid ±60°, tiny torso bob).
//
// actorSpec (per shot):
//   at: [x,y,z] | 'set.anchor' | keys [{t, v:[x,y,z]}] · yaw: deg | keys · scale handled by the character spec
//   face: 'smile' | [{ t, expr, talk?: seconds|true }] (instant swaps) · blink: true (off by default) · lookAt: 'pal.head' | [x,y,z] | [{ t, at }]
//   attach: { to: 'pal', offset: [x,y,z] (pal's local frame), yaw: deg, from, until } (carried/held characters)
//   anim: [{ t, clip, to|path|by, speed, dur, delay, fade, rate, phase, hold, then, backward, yaw, layer, add, target, ...clipParams }]
import { deg, clamp, lerp, smoothstep, sampleKeys, hash1, noise1 } from '../core/math.js';
import { parseExpression, hasOpenEyes } from './faces.js';
const hasOpenEyesExpr = (x) => { try { return hasOpenEyes(parseExpression(x)); } catch { return false; } };

const TAU = Math.PI * 2;
const S = Math.sin;
const sh = (s, k = 0.8) => Math.sign(s) * Math.abs(s) ** k; // slightly squared-off swing (rigid R6 feel)
const env = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t)); // rise a..b, fall c..d
const ease01 = (t, a, b) => smoothstep(a, b, t);

// ---------- clip library ----------
// clip: { fn(t, p, c) -> pose, loop, dur, period, amp (leg swing for stride), speed (default studs/s) }
export const CLIPS = {
  stand: { loop: true, fn: () => ({}) },
  idle: { loop: true, fn: (t, p, c) => { const b = S((TAU * t) / 3.4 + c.phase * TAU); return { off: [0, 0.012 * b, 0], torso: [0.5 * b, 0, 0], head: [-0.6 * b, 0.6 * S(t * 0.7 + c.phase * 9), 0], lArm: [0.6 * b, 1.2 + 0.6 * b, 0], rArm: [0.6 * b, 1.2 + 0.6 * b, 0] }; } },
  walk: { loop: true, period: 0.667, amp: 56, speed: 10, loco: true, fn: (t, p, c) => {
    const s = sh(S((TAU * t) / 0.667)), a = p.amp ?? 1;
    return { torso: [1, 0, 1.6 * s], head: [-1, 0, -1.2 * s], lLeg: [5 + 56 * s * a, 0, 0], rLeg: [5 - 56 * s * a, 0, 0], lArm: [4 - 50 * s * a, 2, 0], rArm: [4 + 50 * s * a, 2, 0] };
  } },
  run: { loop: true, period: 0.4, amp: 62, speed: 17.5, loco: true, fn: (t, p, c) => {
    const ph = (TAU * t) / 0.4, s = sh(S(ph), 0.7);
    return { off: [0, 0.07 * (1 - Math.abs(S(ph))) - 0.03, 0], torso: [6, 2 * s, 0], head: [-6, -2 * s, 0], lLeg: [5 + 62 * s, 0, 0], rLeg: [5 - 62 * s, 0, 0], lArm: [8 - 68 * s, 4, 0], rArm: [8 + 68 * s, 4, 0] };
  } },
  sprint: { loop: true, period: 0.36, amp: 70, speed: 22, loco: true, fn: (t) => {
    const ph = (TAU * t) / 0.36, s = sh(S(ph), 0.65);
    return { off: [0, 0.09 * (1 - Math.abs(S(ph))) - 0.04, 0], torso: [12, 3 * s, 0], head: [-12, -3 * s, 0], lLeg: [8 + 70 * s, 0, 0], rLeg: [8 - 70 * s, 0, 0], lArm: [10 - 88 * s, 10, 0], rArm: [10 + 88 * s, 10, 0] };
  } },
  jump: { dur: 0.55, fn: (t, p, c) => {
    const u = clamp(t / (p.dur ?? 0.55)), H = p.height ?? 4.5, k = ease01(t, 0, 0.08) * (1 - ease01(u, 0.92, 1));
    return { off: [0, 4 * H * u * (1 - u) / c.scale, 0], lArm: [10 * k, 118 * k, 0], rArm: [10 * k, 122 * k, 0], lLeg: [18 * k, 0, 0], rLeg: [-4 * k, 0, 0], head: [-6 * k, 0, 0] };
  } },
  bounce: { loop: true, fn: (t, p, c) => { const per = p.period ?? 1, u = (t % per) / per, H = p.height ?? 4; return { off: [0, 4 * H * u * (1 - u) / c.scale, 0], lArm: [10, 110 + 20 * S(u * Math.PI), 0], rArm: [10, 110 + 20 * S(u * Math.PI), 0], lLeg: [12 * S(u * Math.PI), 0, 0], rLeg: [-6 * S(u * Math.PI), 0, 0] }; } },
  fall: { loop: true, fn: (t) => { const s = S((TAU * t) / 0.65); return { lArm: [8, 150 + 8 * s, 0], rArm: [8, 152 - 8 * s, 0], lLeg: [10 * s, 4, 0], rLeg: [-10 * s, 4, 0], head: [-8, 0, 0] }; } },
  wave: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.25); return { rArm: [18 * k, (150 + 16 * S(TAU * 2.4 * t)) * k, 0], head: [0, 0, 6 * k], torso: [0, 0, -2 * k] }; } },
  point: { loop: true, fn: (t, p, c, aux) => { const k = ease01(t, 0, 0.2), a = aux.aimR ?? [90, 0, 0]; return { rArm: [a[0] * k, a[1] * k, 0], torso: [0, -12 * k, 0], head: [0, (aux.aimYaw ?? 0) * 0.5 * k, 0] }; } },
  talk: { loop: true, fn: (t, p, c) => { const ph = t + c.phase * 7; return { rArm: [22 + 14 * S(2.3 * ph), 8 + 4 * S(1.1 * ph), 0], lArm: [10 + 8 * S(1.7 * ph + 1), 4, 0], head: [3 * S(4.4 * ph), 4 * S(0.9 * ph), 2 * S(1.3 * ph)], torso: [1 * S(2.2 * ph), 2 * S(0.8 * ph), 0] }; } },
  cheer: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.15), s = S(TAU * 2.4 * t); return { off: [0, 0.6 * Math.abs(S(TAU * 1.2 * t)) * k, 0], lArm: [10 * k, (155 + 14 * s) * k, 0], rArm: [10 * k, (155 + 14 * s) * k, 0], head: [-10 * k, 0, 0] }; } },
  cry: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.3), j = S(TAU * 7 * t) * k; return { lArm: [128 * k, -34 * k, 0], rArm: [128 * k, -34 * k, 0], head: [22 * k, 0, 1.5 * j], torso: [8 * k + 1.2 * j, 0, 0] }; } },
  scared: { loop: true, fn: (t, p, c) => { const k = ease01(t, 0, 0.2), n = (s) => noise1(t * 14 + s, c.seed) * 3 * k; return { off: [0, -0.12 * k, -0.1 * k], torso: [-8 * k + n(1), n(2), 0], head: [-6 * k + n(3), n(4), 0], lArm: [62 * k + n(5), -18 * k, 0], rArm: [62 * k + n(6), -18 * k, 0], lLeg: [6 * k, 2, 0], rLeg: [-4 * k, 2, 0] }; } },
  shrug: { dur: 1.1, fn: (t) => { const k = env(t, 0, 0.22, 0.75, 1.05); return { lArm: [24 * k, 34 * k, -20 * k], rArm: [24 * k, 34 * k, -20 * k], head: [0, 0, 10 * k], off: [0, 0.05 * k, 0] }; } },
  facepalm: { dur: 0.5, fn: (t) => { const k = ease01(t, 0, 0.35); return { rArm: [148 * k, -42 * k, 0], head: [20 * k, 0, 0], torso: [5 * k, 0, 0] }; } },
  nod: { dur: 1.4, fn: (t) => ({ head: [16 * Math.max(0, S(TAU * 2 * t)) * (1 - smoothstep(0.9, 1.4, t)), 0, 0] }) },
  headshake: { dur: 1.5, fn: (t) => ({ head: [3, 26 * S(TAU * 2.2 * t) * (1 - smoothstep(1.0, 1.5, t)), 0] }) },
  sit: { loop: true, fn: (t, p, c) => { const k = p.fade === 0 ? 1 : ease01(t, 0, 0.25), d = c.d; const y = p.ground ? -(d.leg[1] - d.leg[2] / 2) : p.seat != null ? p.seat + d.leg[2] / 2 - d.leg[1] : 0; return { off: [0, y * k, 0], lLeg: [90 * k, 0, 0], rLeg: [90 * k, 0, 0], lArm: [44 * k, 0, 0], rArm: [44 * k, 0, 0], torso: [-2 * k, 0, 0] }; } },
  kneel: { loop: true, fn: (t, p, c) => { const k = ease01(t, 0, 0.3), L = c.d.leg[1]; return { off: [0, -L * 0.5 * k, 0], lLeg: [60 * k, 0, 0], rLeg: [-60 * k, 0, 0], lArm: [32 * k, -6 * k, 0], rArm: [6 * k, 0, 0], torso: [4 * k, 0, 0], head: [6 * k, 0, 0] }; } },
  crouch: { loop: true, fn: (t, p, c) => { const k = ease01(t, 0, 0.25), L = c.d.leg[1], a = 42; return { off: [0, -L * (1 - Math.cos(deg(a))) * k, -0.25 * k], lLeg: [a * k, 3, 0], rLeg: [a * k, 3, 0], torso: [30 * k, 0, 0], head: [-26 * k, 0, 0], lArm: [40 * k, 6, 0], rArm: [40 * k, 6, 0] }; } },
  punch: { loop: true, fn: (t, p) => {
    const per = p.period ?? 0.6, n = Math.floor(t / per), u = (t % per) / per, right = p.alternate === false || n % 2 === 0;
    const hit = smoothstep(0, 0.15, u) * (1 - smoothstep(0.4, 0.9, u)), guard = 50;
    const R = right ? guard + (92 - guard) * hit : guard, L = right ? guard : guard + (92 - guard) * hit;
    return { rArm: [R, -14 * (1 - (right ? hit : 0)), 0], lArm: [L, -14 * (1 - (right ? 0 : hit)), 0], torso: [4, (right ? -18 : 18) * hit, 0], head: [0, (right ? 10 : -10) * hit, 0] };
  } },
  kick: { dur: 0.65, fn: (t) => { const k = env(t, 0, 0.15, 0.32, 0.6); return { rLeg: [86 * k, 0, 0], torso: [-12 * k, 0, 0], lArm: [10 * k, 32 * k, 0], rArm: [-10 * k, 36 * k, 0], head: [6 * k, 0, 0] }; } },
  dance: { loop: true, fn: (t) => {
    const ph = (TAU * t) / 1.15, s = S(ph), c2 = Math.cos(ph);
    return { off: [0.3 * s, 0.1 * Math.abs(c2), 0], torso: [0, 8 * s, -7 * s], head: [0, -10 * s, 8 * s], rArm: [150 + 25 * c2, 30 + 25 * s, 0], lArm: [20, 105 + 10 * s, 0], lLeg: [Math.max(0, 30 * s), 4, 0], rLeg: [Math.max(0, -30 * s), 4, 0] };
  } },
  climb: { loop: true, period: 0.458, amp: 20, speed: 6, loco: true, fn: (t) => { const s = S((TAU * t) / 0.458); return { lArm: [105 + 54 * s, 4, 0], rArm: [105 - 54 * s, 4, 0], lLeg: [20 - 22 * s, 0, 0], rLeg: [20 + 22 * s, 0, 0], head: [-29, 0, 0], torso: [-4, 0, 0] }; } },
  fly: { loop: true, speed: 20, fn: (t, p, c) => { const k = ease01(t, 0, 0.3), s = S(TAU * 1.6 * t + c.phase * 6); return { rot: [78 * k, 0, 3 * s * k], off: [0, 0.4 * k, 0], rArm: [172 * k, 4, 0], lArm: [-6 * k, 10 * k, 0], lLeg: [-4 + 4 * s, 2, 0], rLeg: [-4 - 4 * s, 2, 0], head: [-64 * k, 0, 0] }; } },
  swim: { loop: true, speed: 6, fn: (t, p, c) => { const k = ease01(t, 0, 0.3), a = ((t / 1.2) * 360) % 360, f = 16 * S(TAU * 3.5 * t); return { rot: [80 * k, 0, 6 * S((TAU * t) / 1.2) * k], lArm: [a * k, 6, 0], rArm: [((a + 180) % 360) * k, 6, 0], lLeg: [f * k, 0, 0], rLeg: [-f * k, 0, 0], head: [-55 * k, 22 * S((TAU * t) / 2.4) * k, 0] }; } },
  trip: { dur: 0.75, fn: (t, p, c) => {
    const d = c.d, L = d.leg[1], u = clamp((t - 0.22) / 0.4), g = u * u; // gravity-like ease-in to the slam
    const st = env(t, 0, 0.12, 0.25, 0.5);
    return { rot: [90 * g, 0, 0], off: [0, -(L - d.torso[2] / 2) * g, (0.25 + L * 0.5) * g], torso: [18 * st, 0, 0], head: [-12 * st - 18 * g, 0, 0],
      lArm: [40 * st + 165 * g, 14 * g, 0], rArm: [55 * st + 165 * g, 14 * g, 0], lLeg: [18 * st * (1 - g), 0, 0], rLeg: [-38 * st * (1 - g), 0, 0] };
  } },
  lie: { loop: true, fn: (t, p, c) => { const d = c.d, front = p.front; return { rot: [front ? 90 : -90, 0, 0], off: [0, -(d.leg[1] - d.torso[2] / 2), front ? 0.6 : -0.6], lArm: [front ? 170 : 0, 12, 0], rArm: [front ? 170 : 0, 12, 0], head: [front ? -15 : 0, 0, 0] }; } },
  look_around: { loop: true, fn: (t, p, c) => { const ph = t / 3.2 + c.phase, y = 52 * sh(S(TAU * ph), 0.5); return { head: [3 * S(TAU * ph * 2), y, 0], torso: [0, y * 0.18, 0] }; } },
  laugh: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.2), b = Math.abs(S(TAU * 4.5 * t)) * k; return { torso: [-14 * k - 4 * b, 0, 0], head: [-24 * k - 4 * b, 0, 0], lArm: [28 * k, -18 * k, 0], rArm: [28 * k, -18 * k, 0], off: [0, 0.04 * b, 0] }; } },
  sneeze: { dur: 1.4, fn: (t) => { const back = env(t, 0, 0.55, 0.6, 0.64), fwd = env(t, 0.6, 0.66, 0.95, 1.35); return { torso: [-14 * back + 22 * fwd, 0, 0], head: [-26 * back + 24 * fwd, 0, 0], lArm: [30 * fwd, -10 * fwd, 0], rArm: [30 * fwd, -10 * fwd, 0] }; } },
  // monsters
  float: { loop: true, fn: (t, p, c) => { const b = S(TAU * t / 2.2 + c.phase * 6); return { off: [0, 0.9 + 0.18 * b, 0], lArm: [55 + 5 * b, 8, 0], rArm: [55 - 5 * b, 8, 0], torso: [4, 0, 2 * b], head: [-3, 0, 0] }; } },
  zombie: { loop: true, period: 1.2, amp: 26, speed: 3, loco: true, fn: (t) => { const s = S(TAU * t / 1.2); return { lArm: [88 + 4 * s, 4, 0], rArm: [92 - 4 * s, 4, 0], lLeg: [4 + 26 * s, 0, 0], rLeg: [4 - 26 * s, 0, 0], torso: [8, 0, 6 * s], head: [6, 0, -12 + 4 * s] }; } },
  // holds & interactions
  hold: { loop: true, fn: (t) => ({ rArm: [90 * ease01(t, 0, 0.2), 0, 0] }) },
  hold_l: { loop: true, fn: (t) => ({ lArm: [90 * ease01(t, 0, 0.2), 0, 0] }) },
  hold_both: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.2); return { lArm: [88 * k, -6 * k, 0], rArm: [88 * k, -6 * k, 0] }; } },
  hold_up: { loop: true, fn: (t) => ({ rArm: [172 * ease01(t, 0, 0.25), -4, 0] }) },
  carry: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.25); return { lArm: [70 * k, -14 * k, 0], rArm: [70 * k, -14 * k, 0], torso: [-5 * k, 0, 0] }; } },
  carry_low: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.25); return { lArm: [26 * k, -6 * k, 0], rArm: [26 * k, -6 * k, 0], torso: [8 * k, 0, 0] }; } },
  hug: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.3); return { lArm: [80 * k, -40 * k, 0], rArm: [80 * k, -40 * k, 0], torso: [5 * k, 0, 0], head: [6 * k, 0, 8 * k] }; } },
  lift: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.35); return { lArm: [168 * k, -12 * k, 0], rArm: [168 * k, -12 * k, 0], torso: [-6 * k, 0, 0], head: [-18 * k, 0, 0] }; } },
  grab: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.18); return { rArm: [100 * k, -16 * k, 0], lArm: [22 * k, 0, 0], torso: [8 * k, -6 * k, 0], head: [-6 * k, 0, 0] }; } },
  drag: { loop: true, period: 1.1, amp: 28, speed: 3.5, loco: true, fn: (t) => { const s = S((TAU * t) / 1.1); return { torso: [-22, 0, 0], head: [12, 0, 0], lArm: [68, -8, 0], rArm: [72, -8, 0], lLeg: [8 + 28 * s, 0, 0], rLeg: [8 - 28 * s, 0, 0], off: [0, -0.1, 0] }; } },
  push: { loop: true, period: 1.0, amp: 30, speed: 4, loco: true, fn: (t) => { const s = S((TAU * t) / 1.0); return { torso: [24, 0, 0], head: [-20, 0, 0], lArm: [86, -6, 0], rArm: [86, -6, 0], lLeg: [-8 + 30 * s, 0, 0], rLeg: [-8 - 30 * s, 0, 0] }; } },
  carried: { loop: true, fn: (t, p, c) => ({ rot: [-82, 0, 0], lLeg: [22, 0, 0], rLeg: [18, 0, 0], lArm: [-10, 24, 0], rArm: [60, -10, 0], head: [-12, 0, 0] }) },
  held: { loop: true, fn: (t) => ({ lLeg: [8 + 3 * S(TAU * 0.8 * t), 0, 0], rLeg: [4 - 3 * S(TAU * 0.8 * t), 0, 0], lArm: [74, -34, 0], rArm: [74, -34, 0], head: [0, 0, 10] }) },
  write: { loop: true, fn: (t) => { const k = ease01(t, 0, 0.25); return { lArm: [62 * k, -22 * k, 0], rArm: [(56 + 3 * S(TAU * 6 * t)) * k, (-26 + 4 * S(TAU * 3 * t)) * k, 0], head: [24 * k, 0, 0] }; } },
};
CLIPS.fall_down = CLIPS.trip;
CLIPS.stumble = CLIPS.trip;
CLIPS.yell = CLIPS.talk;

// Work / gesture clips first built for "Everyone Has ONE Hand" (shared: crowds and later productions use them too).
Object.assign(CLIPS, {
  stomp: { loop: true, fn: (t, p, c) => { // stomping applause: alternate stomps, one hand up
    const ph = TAU * t / 0.46 + c.phase * 6, s = S(ph);
    return { off: [0, 0.18 * Math.abs(s), 0], lLeg: [Math.max(0, 55 * s), 0, 0], rLeg: [Math.max(0, -55 * s), 0, 0],
      rArm: [12, 150 + 14 * s, 0], lArm: [8, 14, 0], head: [-8, 0, 0], torso: [-3, 0, 0] };
  } },
  clap: { loop: true, fn: (t) => { // both hands meeting in front of the chest
    const k = smoothstep(0, 0.15, t), s = 0.5 + 0.5 * Math.cos(TAU * 3.2 * t);
    return { lArm: [82 * k, (-40 + 26 * (1 - s)) * k, 0], rArm: [82 * k, (-40 + 26 * (1 - s)) * k, 0], head: [-4 * k, 0, 0], off: [0, 0.05 * (1 - s) * k, 0] };
  } },
  eat: { loop: true, fn: (t, p, c) => { // hand to the mouth every ~1.1 s; `dangle: true` swings the legs (sitting)
    const u = Math.max(0, S(TAU * t / 1.1 + c.phase * 3)), sw = S(TAU * t / 0.9);
    return { rArm: [70 + 70 * u, -26 - 10 * u, 0], lArm: [30, -8, 0], head: [-4 + 6 * u, 0, 0],
      ...(p.dangle ? { lLeg: [90 + 18 * sw, 0, 0], rLeg: [90 - 18 * sw, 0, 0] } : {}) };
  } },
  sew: { loop: true, fn: (t) => { const s = S(TAU * 1.6 * t); return { rArm: [62 + 22 * s, -18 + 10 * s, 0], lArm: [52, -20, 0], head: [22, 0, 0], torso: [6, 0, 0] }; } },
  knit: { loop: true, fn: (t) => { const s = S(TAU * 2.2 * t); return { rArm: [58 + 8 * s, -22, 0], lArm: [52 - 4 * s, -14, 0], head: [16, 0, 0] }; } },
  mouth_cover: { loop: true, fn: (t, p, c) => { const k = smoothstep(0, 0.25, t), n = 2 * S(TAU * 7 * t); return { rArm: [150 * k, -40 * k, 0], head: [n * k * 0.5, 0, 0] }; } },
  palms_up: { loop: true, fn: (t) => { const k = smoothstep(0, 0.6, t); return { lArm: [70 * k, -8 * k, 0], rArm: [70 * k, -8 * k, 0], head: [8 * k, 0, 6 * k], torso: [6 * k, 0, 0] }; } },
  reach: { loop: true, fn: (t) => { const k = smoothstep(0, 0.35, t), s = S(TAU * 1.5 * t); return { lArm: [95 * k + 4 * s, 10 * k, 0], rArm: [95 * k - 4 * s, 10 * k, 0], torso: [16 * k, 0, 0], head: [-12 * k, 0, 0] }; } },
  shake_fist: { loop: true, fn: (t) => { const k = smoothstep(0, 0.2, t), s = S(TAU * 3 * t); return { rArm: [150 * k + 12 * s, 10 * k, 0], head: [-6 * k, 0, 0] }; } },
  hop: { loop: true, fn: (t, p, c) => { const u = (t / 0.42) % 1, h = 4 * u * (1 - u); return { off: [0, 0.7 * h / c.scale, 0], lLeg: [70, 0, 0], rLeg: [6 * h, 0, 0], lArm: [10, 40 + 30 * h, 0], rArm: [10, 40 + 30 * h, 0] }; } }, // one-legged hop
  knock: { loop: true, fn: (t) => { const s = Math.max(0, S(TAU * 2.6 * t)); return { rArm: [88 + 18 * s, -10, 0], torso: [4, 0, 0] }; } },
  drag_walk: { loop: true, period: 1.0, amp: 30, speed: 5, loco: true, fn: (t) => { // giant's heavy walk, knuckles low
    const s = S(TAU * t / 1.0);
    return { torso: [14, 0, 3 * s], head: [-14, 0, -2 * s], lLeg: [4 + 30 * s, 0, 0], rLeg: [4 - 30 * s, 0, 0], lArm: [10 - 10 * s, 6, 0], rArm: [10 + 10 * s, 6, 0], off: [0, -0.15, 0] };
  } },
  crouch_low: { loop: true, fn: (t, p, c) => { const L = c.d.leg[1]; return { off: [0, -L * 0.6, -0.4], lLeg: [70, 4, 0], rLeg: [70, 4, 0], torso: [40, 0, 0], head: [-34, 0, 0], lArm: [60, 8, 0], rArm: [60, 8, 0] }; } }, // hunched in the dark
  stand_up: { dur: 1.2, fn: (t, p, c) => { const L = c.d.leg[1], k = 1 - smoothstep(0, 1.1, t); return { off: [0, -L * 0.6 * k, -0.4 * k], lLeg: [70 * k, 4, 0], rLeg: [70 * k, 4, 0], torso: [40 * k, 0, 0], head: [-34 * k, 0, 0], lArm: [60 * k + 20 * (1 - k), 8, 0], rArm: [60 * k + 20 * (1 - k), 8, 0] }; } }, // from crouch_low
});
CLIPS.hand_over_mouth = CLIPS.mouth_cover;

// Rope clips first built for "The Ropes" (ankle ropes into a cloud). hang_ankle / ankle_lift pin the RIGHT ankle to
// the actor root (the rope's end = the actor position), so animate `at` keys to lift or swing the person by the rope.
// Inversion is a roll (about Z), so a hanging actor with yaw 0 still faces +Z (upside down).
const rotXYZ = (v, a, b, c) => { // three.js Euler 'XYZ' (matrix Rx*Ry*Rz) applied to v
  let [x, y, z] = v;
  [x, y] = [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c)];
  [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
  [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  return [x, y, z];
};
// body offset that keeps the right ankle (hip-local [-legX, -0.9 leg, 0]) at the root for a body rotation (deg)
const ankleOff = (c, rot) => { const L = c.d.leg[1], f = rotXYZ([-c.d.legX, -0.9 * L, 0], deg(rot[0]), deg(rot[1]), deg(rot[2])); return [-f[0], -L - f[1], -f[2]]; };
const hangPose = (c, roll, pitch, k = 1, sw = 0) => { // k: 0 standing .. 1 hanging (limbs)
  const rot = [pitch, 0, roll];
  return { rot, off: ankleOff(c, rot), lArm: [168 * k + 4 * sw, 8 * k, 0], rArm: [168 * k - 4 * sw, 8 * k, 0], lLeg: [40 * k, 16 * k, 0], rLeg: [0, 0, 0], head: [-8 * k, 0, 0] };
};
Object.assign(CLIPS, {
  rope_climb: { loop: true, period: 0.8, amp: 20, speed: 3, loco: true, fn: (t) => { // hand over hand up a rope in front of the chest, legs clamped
    const s = S((TAU * t) / 0.8);
    return { lArm: [152 + 22 * s, -10, 0], rArm: [152 - 22 * s, -10, 0], lLeg: [16 + 8 * s, -4, 0], rLeg: [22 - 8 * s, -4, 0], torso: [-4, 0, 3 * s], head: [-22, 0, 0], off: [0, 0.04 * s, 0.1] };
  } },
  hang_ankle: { loop: true, fn: (t, p, c) => { // hanging upside down by the right ankle, swinging like a lantern (swing: deg, period: s)
    const sw = S((TAU * t) / (p.period ?? 3.2) + c.phase * TAU), a = p.swing ?? 6;
    return hangPose(c, 180 + a * sw, 0.35 * a * S((TAU * t) / ((p.period ?? 3.2) * 1.37) + c.phase * 5), 1, sw);
  } },
  ankle_lift: { dur: 0.9, fn: (t, p, c) => { // yanked up by the right ankle: tips over and ends in the hang_ankle pose
    const u = smoothstep(0.05, 0.85, t), k = smoothstep(0, 0.5, t);
    return { ...hangPose(c, 180 * u, 0, k), head: [-8 * k, 0, 0] };
  } },
  tiptoe: { loop: true, period: 0.5, amp: 16, speed: 4, loco: true, fn: (t) => { // tiny quick steps on the toes, arms out for balance
    const s = sh(S((TAU * t) / 0.5));
    return { off: [0, 0.28, 0], torso: [-4, 0, 2 * s], head: [-6, 0, -2 * s], lLeg: [16 * s, 0, 0], rLeg: [-16 * s, 0, 0], lArm: [10 - 8 * s, 38, 0], rArm: [10 + 8 * s, 38, 0] };
  } },
  tiptoe_stand: { loop: true, fn: (t, p, c) => { // up on the toes (heels lifted), wobbling, arms out
    const w = S(TAU * t / 1.1 + c.phase * 6), k = smoothstep(0, 0.25, t);
    return { off: [0, 0.3 * k, 0], torso: [-3 * k, 0, 3 * w * k], head: [-8 * k, 0, -2 * w], lArm: [8 * k, (34 + 10 * w) * k, 0], rArm: [8 * k, (34 - 10 * w) * k, 0] };
  } },
  untie: { loop: true, fn: (t, p, c) => { // both hands working a knot in front (low: true = kneeling at an ankle-height knot)
    const k = smoothstep(0, 0.25, t), s = S(TAU * 2.6 * t), s2 = S(TAU * 2.6 * t + 1.9), L = c.d.leg[1];
    const arms = { lArm: [(p.low ? 38 : 64) * k + 12 * s, -22 * k, 0], rArm: [(p.low ? 38 : 64) * k + 12 * s2, -22 * k, 0], head: [26 * k, 0, 3 * s] };
    return p.low ? { ...arms, off: [0, -L * 0.5 * k, 0], lLeg: [60 * k, 0, 0], rLeg: [-60 * k, 0, 0], torso: [22 * k, 0, 0] } : { ...arms, torso: [8 * k, 0, 0] };
  } },
  hold_rope: { loop: true, fn: (t, p, c) => { // clutching one's own rope in front of the chest (away: deg head turn = looking away)
    const k = smoothstep(0, 0.25, t), b = S(TAU * t / 2.6 + c.phase * 6);
    return { lArm: [(78 + 3 * b) * k, -16 * k, 0], rArm: [(112 - 3 * b) * k, -14 * k, 0], head: [(p.away ? 4 : -10) * k, (p.away ?? 0) * k, 0], torso: [0, (p.away ?? 0) * 0.15 * k, 0] };
  } },
  // ---- "The Door" clips
  hold_bar: { loop: true, fn: (t, p, c) => { // both hands on a bar at chest height, leaning back, straining (strain 0..1 = harder + trembling)
    const k = smoothstep(0, 0.25, t), st = p.strain ?? 0.4, n = (q) => noise1(t * 13 + q, c.seed) * 3.5 * st * k, b = S(TAU * t / 2.4 + c.phase * 6);
    return { off: [0, -0.05 * st * k, -0.12 * st * k], rot: [-6 * st * k, 0, 0], torso: [(-3 + 1.5 * b) * k + n(1), n(2), 0], head: [(p.look ?? -6) * k + n(3), (p.turn ?? 0) * k, 0],
      lArm: [(84 + 2 * b) * k + n(4), -8 * k, 0], rArm: [(84 - 2 * b) * k + n(5), -8 * k, 0], lLeg: [-10 * st * k, 2, 0], rLeg: [14 * st * k, 2, 0] };
  } },
  push_door: { loop: true, fn: (t, p, c) => { // planted, leaning hard into a door with both hands high (high 0..1), feet braced, trembling
    const k = smoothstep(0, 0.25, t), st = p.strain ?? 0.7, n = (q) => noise1(t * 12 + q, c.seed) * 3 * st * k, h = p.high ?? 0.4, b = S(TAU * t / 1.6 + c.phase * 6);
    return { rot: [(18 + 6 * st) * k, 0, 0], torso: [(8 + 2 * b) * k + n(1), n(2), 0], head: [(-24 + (p.look ?? 0)) * k + n(3), (p.turn ?? 0) * k, 0],
      lArm: [(96 + 50 * h) * k + n(4), -6 * k, 0], rArm: [(96 + 50 * h) * k + n(5), -6 * k, 0], lLeg: [(16 + 3 * b) * k, 0, 0], rLeg: [(-34 - 3 * b) * k, 0, 0] };
  } },
  sleep: { loop: true, fn: (t, p, c) => { // lying on the back asleep, slow deep breathing (snore 0..1 = deeper breaths); head rolled to one side
    const d = c.d, br = S(TAU * t / (p.period ?? 3.6) + c.phase * 6) * (0.6 + 0.4 * (p.snore ?? 0.5));
    return { rot: [-90, 0, 0], off: [0, -(d.leg[1] - d.torso[2] / 2), -0.6], torso: [-2 * br, 0, 0], head: [-4 - 2 * br, 0, p.roll ?? 18], lArm: [8 + 3 * br, 22, 0], rArm: [8 - 3 * br, 14, 0], lLeg: [4, 6, 0], rLeg: [-2, 4, 0] };
  } },
});
CLIPS.hold_rope_away = { loop: true, fn: (t, p, c) => CLIPS.hold_rope.fn(t, { away: p.away ?? (c.phase < 0.5 ? 55 : -55) }, c) }; // crowds pass no params
// Self-check: the hang clips keep the right ankle on the root.
{ const c0 = { d: { leg: [1, 1.8, 1], legX: 0.5 }, phase: 0.3 };
  for (const P of [CLIPS.hang_ankle.fn(1.3, {}, c0), CLIPS.ankle_lift.fn(0.4, {}, c0)]) { const f = rotXYZ([-0.5, -1.62, 0], ...P.rot.map(deg)); console.assert(Math.hypot(f[0] + P.off[0], 1.8 + f[1] + P.off[1], f[2] + P.off[2]) < 1e-9, 'characters/anim: hang ankle off root'); } }

// Imported clip libraries (assets/library/characters/animations/*.json) register here as 'kenney.walk', 'ual.Sprint_Loop'…
export function registerClipLibrary(prefix, lib) {
  for (const [name, cl] of Object.entries(lib.clips)) {
    const n = Math.round(cl.dur * cl.fps) + 1;
    const sample = (arr, t) => {
      if (!arr) return undefined;
      let f = t * cl.fps;
      f = cl.loop ? ((f % (n - 1)) + (n - 1)) % (n - 1) : clamp(f, 0, n - 1);
      const i = Math.floor(f), u = f - i, j = Math.min(n - 1, i + 1);
      return [0, 1, 2].map((k) => lerp(arr[i * 3 + k], arr[j * 3 + k], u));
    };
    CLIPS[`${prefix}.${name}`] = { loop: cl.loop, dur: cl.loop ? undefined : cl.dur, imported: true, fn: (t, p, c) => {
      const o = {};
      for (const [ch, arr] of Object.entries(cl.tracks)) { const v = sample(arr, t); o[ch] = ch === 'off' ? v.map((x) => x * (c.d.leg[1] / 2)) : v; }
      return o;
    } };
  }
}

// ---------- pose math ----------
const CH3 = ['off', 'rot', 'torso', 'head', 'lArm', 'rArm', 'lLeg', 'rLeg'];
export function blendPose(a, b, w) {
  if (w <= 0) return a; if (w >= 1) return b;
  const o = {};
  for (const k of CH3) { const x = a[k], y = b[k]; if (x || y) o[k] = [0, 1, 2].map((i) => lerp(x?.[i] ?? 0, y?.[i] ?? 0, w)); }
  return o;
}
const addPose = (a, b) => { const o = { ...a }; for (const k of CH3) if (b[k]) o[k] = [0, 1, 2].map((i) => (a[k]?.[i] ?? 0) + (b[k][i] ?? 0)); return o; };

// semantic (deg) -> native radians for rig.applyNativePose
export function toNative(P) {
  const r3 = (v) => (v ? [deg(v[0] ?? 0), deg(v[1] ?? 0), deg(v[2] ?? 0)] : [0, 0, 0]);
  const limb = (v, left) => (v ? [-deg(v[0] ?? 0), deg(v[2] ?? 0) * (left ? 1 : -1), deg(v[1] ?? 0) * (left ? 1 : -1)] : [0, 0, 0]);
  return { bodyPos: P.off ?? [0, 0, 0], bodyRot: r3(P.rot), torso: r3(P.torso), head: r3(P.head), lArm: limb(P.lArm, true), rArm: limb(P.rArm, false), lLeg: limb(P.lLeg, true), rLeg: limb(P.rLeg, false) };
}
// aim a limb (hanging down at rest) along a direction given in the character frame -> semantic [fwd, side, 0]
export function aimLimb(dx, dy, dz, left) {
  const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
  const z = Math.asin(clamp(dx, -1, 1)), x = Math.atan2(-dz, -dy);
  return [-x * 180 / Math.PI, (z * 180 / Math.PI) * (left ? 1 : -1), 0];
}

// ---------- timeline plan ----------
const plans = new WeakMap();
const resolveP = (ref, ctx) => { if (Array.isArray(ref)) return ref.slice(); const v = ctx?.resolve?.(ref); return v ? [v.x, v.y, v.z] : [0, 0, 0]; };
const isKeys = (x) => Array.isArray(x) && x.length && typeof x[0] === 'object' && !Array.isArray(x[0]);

function clipOf(c, name) {
  const cl = c.clips?.[name] ?? CLIPS[name];
  if (!cl) throw new Error(`characters: unknown clip "${name}" (known: ${Object.keys(c.clips ?? CLIPS).join(', ')})`);
  return cl;
}
export const strideOf = (c, clip) => 4 * c.d.leg[1] * Math.sin(deg(clip.amp ?? 56)) * c.scale;

function buildPlan(c, spec, ctx) {
  const list = (Array.isArray(spec.anim) ? spec.anim : spec.anim ? [spec.anim] : []).map((e) => (typeof e === 'string' ? { clip: e } : e));
  const keyedAt = isKeys(spec.at), keyedYaw = isKeys(spec.yaw);
  let pos = keyedAt ? spec.at[0].v.slice() : resolveP(spec.at ?? [0, 0, 0], ctx);
  let yaw = keyedYaw ? deg(spec.yaw[0].v) : deg(spec.yaw ?? 0);
  const segs = [{ t0: -1e9, e: { clip: c.defaultClip ?? 'idle' }, clip: clipOf(c, c.defaultClip ?? 'idle'), startPos: pos, startYaw: yaw, yaw, implicit: true, free: true }];
  let free = true; // still following spec.at / spec.yaw keys (no movement or yaw override yet)
  let prevEnd = 0;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const t0 = e.t ?? prevEnd;
    const hasMove = e.to != null || e.path != null || e.by != null;
    const clipName = e.clip ?? (hasMove ? 'walk' : 'idle');
    const clip = clipOf(c, clipName);
    const seg = { t0, e, clipName, clip, startPos: pos.slice(), startYaw: yaw };
    prevEnd = t0 + (e.dur ?? clip.dur ?? 0);
    if (hasMove) {
      free = false;
      const pts = [pos.slice()];
      if (e.path) for (const p of e.path) pts.push(resolveP(p, ctx));
      else if (e.by) pts.push([pos[0] + e.by[0], pos[1] + (e.by[1] ?? 0), pos[2] + (e.by[2] ?? 0)]);
      else pts.push(resolveP(e.to, ctx));
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1], pts[k][2] - pts[k - 1][2]));
      const len = cum[cum.length - 1];
      const speed = e.speed ?? clip.speed ?? 10;
      const delay = e.delay ?? 0;
      let dur = e.dur ?? (clipName === 'jump' ? clip.dur : len / Math.max(1e-3, speed));
      const m = { pts, cum, len, t0: t0 + delay, t1: t0 + delay + dur, backward: !!e.backward };
      const next = list[i + 1];
      if (next?.t != null && next.t < m.t1) { // interrupted: truncate
        const cutLen = m.len * clamp((next.t - m.t0) / Math.max(1e-6, dur));
        m.pts = cutPath(m, cutLen); m.cum = m.cum.filter((x) => x < cutLen).concat([cutLen]); m.len = cutLen; m.t1 = next.t;
      }
      seg.move = m;
      pos = pathAt(m, m.len);
      const dir = pathDir(m, m.len);
      if (dir) yaw = Math.atan2(dir[0], dir[2]) + (m.backward ? Math.PI : 0);
      prevEnd = m.t1;
      segs.push(seg);
      const nextT = next?.t ?? m.t1;
      const thenClip = e.then ?? (clip.loco || clipName === 'jump' ? (c.defaultClip ?? 'idle') : null);
      if (thenClip && nextT >= m.t1 - 1e-6 && (next?.t == null ? true : next.t > m.t1 + 1e-6)) {
        segs.push({ t0: m.t1, e: { clip: thenClip, fade: e.thenFade ?? 0.12 }, clipName: thenClip, clip: clipOf(c, thenClip), startPos: pos.slice(), startYaw: yaw, synthetic: true });
      }
      continue;
    }
    if (e.yaw != null) {
      free = false;
      if (typeof e.yaw === 'string') { const tp = targetPos(e.yaw, t0, ctx, c); if (tp) yaw = Math.atan2(tp[0] - pos[0], tp[2] - pos[2]); }
      else yaw = deg(e.yaw);
      seg.yawTarget = yaw;
    }
    seg.free = free;
    segs.push(seg);
  }
  segs.sort((a, b) => a.t0 - b.t0);
  return { segs, keyedAt, keyedYaw };
}
function pathAt(m, s) {
  const { pts, cum } = m;
  if (s <= 0) return pts[0].slice();
  for (let k = 1; k < pts.length; k++) if (s <= cum[k] || k === pts.length - 1) { const u = clamp((s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1])); return [0, 1, 2].map((i) => lerp(pts[k - 1][i], pts[k][i], u)); }
  return pts[pts.length - 1].slice();
}
function cutPath(m, s) { const out = [m.pts[0]]; for (let k = 1; k < m.pts.length && m.cum[k] < s; k++) out.push(m.pts[k]); out.push(pathAt(m, s)); return out; }
function pathDir(m, s, k = 0.5) {
  const a = pathAt(m, Math.max(0, Math.min(s, m.len) - k)), b = pathAt(m, Math.min(m.len, Math.max(s, 0) + k));
  const dx = b[0] - a[0], dz = b[2] - a[2];
  return Math.hypot(dx, dz) < 1e-4 ? null : [dx, 0, dz];
}
const angLerp = (a, b, u) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * u; };

function getPlan(c, spec, ctx) {
  let p = plans.get(spec);
  if (!p || p.c !== c) { p = buildPlan(c, spec, ctx); p.c = c; plans.set(spec, p); }
  return p;
}

// Root position + yaw at time lt (deterministic; used for this actor and for others' lookAt/attach targets).
function rootAt(c, spec, lt, ctx, depth = 0) {
  const plan = getPlan(c, spec, ctx);
  const segs = plan.segs;
  let i = segs.length - 1; while (i > 0 && segs[i].t0 > lt) i--;
  const sg = segs[i];
  let pos, yaw;
  if (sg.move) {
    const m = sg.move, u = m.t1 > m.t0 ? clamp((lt - m.t0) / (m.t1 - m.t0)) : 1, s = u * m.len;
    pos = pathAt(m, s);
    const dir = pathDir(m, s);
    const tgt = dir ? Math.atan2(dir[0], dir[2]) + (m.backward ? Math.PI : 0) : sg.startYaw;
    yaw = angLerp(sg.startYaw, tgt, smoothstep(0, 0.1, lt - m.t0));
  } else {
    pos = sg.startPos.slice();
    yaw = sg.yawTarget != null ? angLerp(sg.startYaw, sg.yawTarget, smoothstep(0, sg.e.turn ?? 0.15, lt - sg.t0)) : sg.startYaw;
    if (sg.free || sg.implicit) {
      if (plan.keyedAt) pos = sampleKeys(spec.at, lt).slice();
      if (plan.keyedYaw) yaw = deg(sampleKeys(spec.yaw, lt));
    }
  }
  const at = spec.attach;
  if (at && depth < 4 && lt >= (at.from ?? -1e9) && lt < (at.until ?? 1e9)) {
    const [name] = String(at.to).split('.');
    const oc = ctx?.actors?.[name], os = ctx?.shot?.actors?.[name];
    if (oc && os && oc !== c) {
      const r = rootAt(oc, os, lt, ctx, depth + 1), o = at.offset ?? [0, 0, 1.5], s = oc.scale ?? 1;
      const cy = Math.cos(r.yaw), sy = Math.sin(r.yaw);
      pos = [r.pos[0] + (o[0] * cy + o[2] * sy) * s, r.pos[1] + o[1] * s, r.pos[2] + (-o[0] * sy + o[2] * cy) * s];
      yaw = r.yaw + deg(at.yaw ?? 0);
    }
  }
  return { pos, yaw, seg: i };
}

// World position of 'actor.part' at lt computed from that actor's plan (no dependence on render order).
function targetPos(ref, lt, ctx, self) {
  if (ref == null) return null;
  if (Array.isArray(ref)) return ref;
  const [name, part = 'root'] = String(ref).split('.');
  const oc = ctx?.actors?.[name], os = ctx?.shot?.actors?.[name];
  if (oc && os && oc.d && name !== 'set') {
    const r = oc === self ? rootAt(oc, os, lt, ctx) : rootAt(oc, os, lt, ctx);
    const d = oc.d, s = oc.scale ?? 1;
    const up = { root: 0, feet: 0, head: d.leg[1] + d.torso[1] + d.head.h / 2, face: d.leg[1] + d.torso[1] + d.head.h / 2, hat: d.height, chest: d.leg[1] + d.torso[1] * 0.62, torso: d.leg[1] + d.torso[1] / 2 }[part];
    if (up != null) return [r.pos[0], r.pos[1] + up * s, r.pos[2]];
  }
  const v = ctx?.resolve?.(ref);
  return v ? [v.x, v.y, v.z] : null;
}

function segPose(c, sg, lt, ctx, aux, plan) {
  const e = sg.e, clip = sg.clip;
  let t;
  if (sg.move && clip.loco) {
    const m = sg.move, u = m.t1 > m.t0 ? clamp((lt - m.t0) / (m.t1 - m.t0)) : 1;
    // foot-synced: cycle phase follows distance travelled
    t = ((u * m.len) / strideOf(c, clip)) * clip.period * (m.backward ? -1 : 1) + ((e.phase ?? 0) + c.phase) * clip.period;
    t = ((t % clip.period) + clip.period) % clip.period;
  } else {
    const rate = e.rate ?? (clip.loco && e.speed ? e.speed / (strideOf(c, clip) / clip.period) : 1);
    t = (lt - sg.t0) * rate + (e.phase ?? 0) * (clip.period ?? 1) + (clip.loco ? c.phase * clip.period : 0);
    if (sg.implicit) t = lt + c.phase * 10;
  }
  // a looping clip that starts with the shot is already settled at the cut (skip its <= 0.6 s ramp-in from neutral: no kneel/sit pop)
  if (clip.loop && !sg.implicit && !sg.move && sg.t0 <= 0 && plan.segs[1] === sg && e.hold == null) t += 1;
  if (e.hold != null) t = Math.min(t, e.hold === true ? clip.dur ?? 0 : e.hold);
  if (!clip.loop && clip.dur != null) t = clamp(t, 0, clip.dur);
  let P = clip.fn(Math.max(0, t), e, c, aux) ?? {};
  if (e.layer) {
    const L = typeof e.layer === 'string' ? { clip: e.layer } : e.layer;
    const lp = clipOf(c, L.clip).fn(Math.max(0, lt - sg.t0), L, c, aux) ?? {};
    for (const k of L.parts ?? ['lArm', 'rArm']) if (lp[k]) P = { ...P, [k]: lp[k] };
  }
  if (e.add) P = addPose(P, e.add);
  if (e.pose) P = { ...P, ...e.pose };
  if (e.keys) P = keyPose(e.keys, lt - sg.t0);
  return P;
}
CLIPS.pose = { loop: true, fn: (t, p) => p.pose ?? {} };
CLIPS.keys = { loop: true, fn: () => ({}) };
function keyPose(keys, t) {
  if (t <= keys[0].t) return keys[0].pose;
  for (let k = 1; k < keys.length; k++) if (t < keys[k].t) {
    const a = keys[k - 1], b = keys[k], u = smoothstep(0, 1, (t - a.t) / (b.t - a.t));
    return blendPose(a.pose, b.pose, b.ease === 'linear' ? (t - a.t) / (b.t - a.t) : u);
  }
  return keys[keys.length - 1].pose;
}

// ---------- faces over time ----------
function faceAt(c, spec, lt) {
  const f = spec.face ?? c.spec.face ?? 'neutral';
  if (typeof f === 'string') return { expr: f };
  let k = f[0];
  for (const x of f) if ((x.t ?? 0) <= lt) k = x;
  let expr = k.expr ?? k.face ?? 'neutral';
  if (k.talk) {
    const end = k.talk === true ? 1e9 : (k.t ?? 0) + k.talk;
    if (lt < end) {
      const n = Math.floor((lt - (k.t ?? 0)) / 0.11), h = hash1(n, c.seed);
      const mouth = h < 0.35 ? 'talk_a' : h < 0.6 ? 'talk_o' : h < 0.8 ? null : 'talk_a';
      if (mouth) expr = expr.split('+')[0] + '+' + mouth;
    }
  }
  return { expr };
}
function blinkAt(c, lt) {
  const P = 3.6, off = c.phase * P, cell = Math.floor((lt + off) / P);
  const start = cell * P + 0.3 + hash1(cell, c.seed) * (P - 0.8) - off;
  return lt >= start && lt < start + 0.12;
}

// ---------- main entry ----------
export function evaluateActor(c, spec, lt, ctx) {
  const plan = getPlan(c, spec, ctx);
  const { pos, yaw, seg: i } = rootAt(c, spec, lt, ctx);
  const segs = plan.segs, sg = segs[i];
  const aux = {};
  // point/aim target (character frame)
  const aimRef = sg.e.target;
  if (aimRef) {
    const tp = targetPos(aimRef, lt, ctx, c);
    if (tp) {
      const d = c.d, s = c.scale, sy = d.leg[1] + d.torso[1] - d.shoulderDrop;
      const wx = tp[0] - pos[0], wy = tp[1] - (pos[1] + sy * s), wz = tp[2] - pos[2];
      const cy = Math.cos(-yaw), sn = Math.sin(-yaw);
      const lx = wx * cy + wz * sn - (-d.armX) * s, lz = -wx * sn + wz * cy;
      aux.aimR = aimLimb(lx, wy, lz, false); aux.aimL = aimLimb(lx + 2 * d.armX * s, wy, lz, true); aux.aimYaw = (Math.atan2(lx, lz) * 180) / Math.PI;
    }
  }
  let P = segPose(c, sg, lt, ctx, aux, plan);
  const fade = sg.e.fade ?? 0.12;
  // no fade-in from the implicit idle when the first clip starts with the shot (a hang pose would flip upright->inverted on every cut)
  if (i > 0 && fade > 0 && lt - sg.t0 < fade && !(segs[i - 1].implicit && sg.t0 <= 0)) P = blendPose(segPose(c, segs[i - 1], lt, ctx, aux, plan), P, smoothstep(0, fade, lt - sg.t0));
  // look-at (head turn, torso helps past 60 deg)
  const la = spec.lookAt;
  if (la != null && c.kind !== 'crowd') {
    const keys = isKeys(la) ? la : [{ t: -1e9, at: la }];
    let k = 0; while (k + 1 < keys.length && keys[k + 1].t <= lt) k++;
    const ang = (ref) => {
      const tp = ref != null && targetPos(ref, lt, ctx, c);
      if (!tp) return null;
      const d = c.d, hy = pos[1] + (d.leg[1] + d.torso[1] + d.head.h / 2) * c.scale;
      const wx = tp[0] - pos[0], wy = tp[1] - hy, wz = tp[2] - pos[2], cy = Math.cos(-yaw), sn = Math.sin(-yaw);
      const lx = wx * cy + wz * sn, lz = -wx * sn + wz * cy;
      return [clamp((-Math.atan2(wy, Math.hypot(lx, lz)) * 180) / Math.PI, -40, 40), clamp((Math.atan2(lx, lz) * 180) / Math.PI, -100, 100)];
    };
    let a = ang(keys[k].at);
    const w = k > 0 ? smoothstep(0, 0.25, lt - keys[k].t) : 1;
    if (k > 0 && w < 1) {
      const b = ang(keys[k - 1].at) ?? [0, 0];
      a = a ?? [0, 0]; a = [lerp(b[0], a[0], w), lerp(b[1], a[1], w)];
      if (keys[k].at == null) a = [lerp(b[0], 0, w), lerp(b[1], 0, w)];
    }
    if (a) {
      const yawHead = clamp(a[1], -65, 65), rest = a[1] - yawHead;
      P = { ...P, head: [a[0] + (P.head?.[0] ?? 0) * 0.3, yawHead, P.head?.[2] ?? 0], torso: [P.torso?.[0] ?? 0, (P.torso?.[1] ?? 0) + clamp(rest, -35, 35), P.torso?.[2] ?? 0] };
    }
  }
  const { expr } = faceAt(c, spec, lt);
  const blink = (spec.blink ?? c.spec.blink ?? false) === true && hasOpenEyesExpr(expr) && blinkAt(c, lt); // style bible: no blinks by default
  return { pos, yaw, pose: P, expr, blink };
}

// Self-check: stride sync + aim maths.
console.assert(Math.abs(aimLimb(0, 0, 1, true)[0] - 90) < 1e-6 && Math.abs(aimLimb(1, 0, 0, true)[1] - 90) < 1e-6, 'characters/anim self-check failed');
