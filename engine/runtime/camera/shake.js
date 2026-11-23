// Camera shake: seeded, pure functions of shot-local time. Amplitudes are fractions of the frame height (so a shake
// looks the same at any FOV/distance) plus roll in degrees. The camera applies x/y as a small aim offset.
//
//   shake: 'run' | 'sway' | 'handheld' | 'rumble' | 'slide' | 'impact'          (preset name)
//   shake: { type: 'impact', t: 1.2, amp: 0.04, freq: 14, roll: 2, decay: 0.18, dur: 0.7, seed: 3 }
//   shake: ['run', { type: 'impact', t: 0.8 }]                                   (several layers add up)
//
// Preset values are measured from the sample Shorts.
import { clamp, fbm1, hashString, noise1 } from '../core/math.js';

export const SHAKES = {
  // Running wobble beside/in front of runners (S6): ~2.5 Hz bob, half-rate sway, roll +-1-2 deg.
  run: { kind: 'run', amp: 0.008, freq: 2.5, roll: 1.2 },
  // Per-shot "alive camera" sway (S9): roll +-0.45 deg, 1.0 s period, 1-2 % drift in step; phase per shot.
  sway: { kind: 'sway', amp: 0.008, freq: 1.0, roll: 0.45 },
  // Handheld jitter on walking/crowd shots (S5 0.2-1.2 % RMS, 4-7 Hz, roll 0.1-0.25 deg).
  handheld: { kind: 'noise', amp: 0.005, freq: 5, roll: 0.25 },
  // Action-beat rumble (S8: 0.5 % H, 0.7 deg roll, 4 Hz, sustained).
  rumble: { kind: 'noise', amp: 0.006, freq: 4, roll: 0.7 },
  // Heavy sustained slide/impact rumble (S5 truck slide: 3.1 % RMS x, 0.85 deg, ~11 Hz).
  slide: { kind: 'noise', amp: 0.03, freq: 11, roll: 0.85, xOnly: true },
  // Decaying impact (S9: 2-6 % amplitude, 0.6-0.8 s).
  impact: { kind: 'impact', amp: 0.04, freq: 14, roll: 2, decay: 0.18, dur: 0.75 },
};

const TAU = Math.PI * 2;

// Envelope: sustained shakes fade in/out over `fade` inside [t, t+dur]; impacts attack in 20 ms then decay exponentially.
function envelope(s, lt, dur) {
  const t0 = s.t ?? 0, x = lt - t0;
  const len = s.dur ?? (s.kind === 'impact' ? 0.75 : dur - t0);
  if (x < 0 || x > len) return 0;
  if (s.kind === 'impact') return Math.min(1, x / 0.02) * Math.exp(-x / (s.decay ?? 0.18)) * clamp((len - x) / 0.1);
  const f = s.fade ?? (t0 > 0 ? 0.15 : 0); // a shake that starts with the shot starts at full strength
  return (f > 0 ? Math.min(clamp(x / f), clamp((len - x) / f)) : 1) * (s.gain ?? 1);
}

// -> { x, y, roll } with x/y in fractions of frame height, roll in degrees.
export function shakeAt(spec, lt, dur, salt = '') {
  const out = { x: 0, y: 0, roll: 0 };
  if (!spec) return out;
  const layers = Array.isArray(spec) ? spec : [spec];
  layers.forEach((layer, i) => {
    if (!layer) return;
    const base = typeof layer === 'string' ? SHAKES[layer] : SHAKES[layer.type ?? 'handheld'];
    if (!base) throw new Error(`camera shake: unknown preset "${typeof layer === 'string' ? layer : layer.type}" (known: ${Object.keys(SHAKES).join(', ')})`);
    const s = typeof layer === 'string' ? base : { ...base, ...layer };
    const e = envelope(s, lt, dur);
    if (e <= 0) return;
    const seed = (s.seed ?? 0) + hashString(`${salt}#${i}`);
    const ph = (seed & 1023) / 1023 * TAU, f = s.freq, a = s.amp * e, r = s.roll * e, x = lt - (s.t ?? 0);
    let dx, dy, dr;
    if (s.kind === 'run') {
      dy = 0.75 * Math.sin(TAU * f * lt + ph) + 0.25 * fbm1(lt * f, seed);
      dx = 0.6 * Math.sin(Math.PI * f * lt + ph) + 0.4 * fbm1(lt * f * 0.5, seed + 7);
      dr = 0.7 * Math.sin(Math.PI * f * lt + ph + 0.6) + 0.3 * fbm1(lt * f * 0.5, seed + 13);
    } else if (s.kind === 'sway') {
      const sgn = seed & 2 ? 1 : -1; // random sway direction per shot, phase restarts at the cut
      dr = sgn * Math.sin(TAU * f * lt);
      dx = sgn * Math.sin(TAU * f * lt) * 0.8 + 0.2 * fbm1(lt * 0.5, seed);
      dy = 0.5 * Math.sin(TAU * f * lt * 0.5 + ph);
    } else {
      const n = s.kind === 'impact' ? noise1 : fbm1, q = s.kind === 'impact' ? x * f : lt * f;
      dx = n(q, seed); dy = s.xOnly ? 0.3 * n(q, seed + 5) : n(q, seed + 5); dr = n(q * 0.8, seed + 11);
    }
    out.x += dx * a; out.y += dy * a; out.roll += dr * r;
  });
  return out;
}

console.assert(shakeAt('run', 1.3, 3, 's').x === shakeAt('run', 1.3, 3, 's').x && shakeAt({ type: 'impact', t: 1 }, 0.5, 3).x === 0, 'camera/shake self-check failed');
