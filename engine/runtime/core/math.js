// Pure, deterministic helpers shared by every runtime module (no clocks, no Math.random).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
export const smoothstep = (a, b, x) => { const u = clamp(invLerp(a, b, x)); return u * u * (3 - 2 * u); };
export const deg = (d) => (d * Math.PI) / 180;

// Easing functions on u in [0,1]. Names are used in production files: ease: 'inOutSine'.
const back = 1.70158;
export const EASE = {
  linear: (u) => u,
  inSine: (u) => 1 - Math.cos((u * Math.PI) / 2),
  outSine: (u) => Math.sin((u * Math.PI) / 2),
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  inQuad: (u) => u * u,
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  inCubic: (u) => u ** 3,
  outCubic: (u) => 1 - (1 - u) ** 3,
  inOutCubic: (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2),
  inExpo: (u) => (u === 0 ? 0 : 2 ** (10 * u - 10)),
  outExpo: (u) => (u === 1 ? 1 : 1 - 2 ** (-10 * u)),
  inOutExpo: (u) => (u === 0 || u === 1 ? u : u < 0.5 ? 2 ** (20 * u - 10) / 2 : (2 - 2 ** (-20 * u + 10)) / 2),
  outBack: (u) => 1 + (back + 1) * (u - 1) ** 3 + back * (u - 1) ** 2,
  inBack: (u) => (back + 1) * u ** 3 - back * u ** 2,
  outElastic: (u) => (u === 0 || u === 1 ? u : 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (u) => {
    const n = 7.5625, d = 2.75;
    if (u < 1 / d) return n * u * u;
    if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
    if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
    return n * (u -= 2.625 / d) * u + 0.984375;
  },
};
export const ease = (name = 'inOutSine') => {
  if (typeof name === 'function') return name;
  const f = EASE[name];
  if (!f) throw new Error(`unknown ease "${name}" (known: ${Object.keys(EASE).join(', ')})`);
  return f;
};

// mulberry32 seeded PRNG. rng(seed)() -> [0,1).
export function rng(seed = 1) {
  let s = typeof seed === 'string' ? hashString(seed) : seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}
// Stateless hash -> [0,1) for integer lattice points (used by noise).
export function hash1(i, seed = 0) {
  let h = Math.imul(i ^ seed, 0x27d4eb2d);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  return ((h >>> 0) % 1000003) / 1000003;
}

// 1D value noise in [-1,1], smooth, deterministic. Sum octaves for handheld/shake motion.
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i, seed), hash1(i + 1, seed), u) * 2 - 1;
}
export function fbm1(x, seed = 0, octaves = 3) {
  let a = 0.5, s = 0, n = 0;
  for (let o = 0; o < octaves; o++) { s += a * noise1(x * 2 ** o, seed + o * 101); n += a; a *= 0.5; }
  return s / n;
}

// Keyframe track evaluation: keys = [{ t, v, ease? }] sorted by t; v number or array. Holds outside the range.
export function sampleKeys(keys, t) {
  if (!keys?.length) return undefined;
  if (t <= keys[0].t) return keys[0].v;
  for (let k = 1; k < keys.length; k++) {
    if (t < keys[k].t) {
      const a = keys[k - 1], b = keys[k];
      const u = ease(b.ease ?? 'inOutSine')(invLerp(a.t, b.t, t));
      return Array.isArray(a.v) ? a.v.map((x, j) => lerp(x, b.v[j], u)) : lerp(a.v, b.v, u);
    }
  }
  return keys[keys.length - 1].v;
}

// Self-check (runs once at import; cheap). Guards the determinism helpers other modules rely on.
console.assert(rng(5)() === rng(5)() && Math.abs(EASE.inOutSine(0.5) - 0.5) < 1e-9 && sampleKeys([{ t: 0, v: 0 }, { t: 1, v: 10, ease: 'linear' }], 0.5) === 5, 'core/math self-check failed');
