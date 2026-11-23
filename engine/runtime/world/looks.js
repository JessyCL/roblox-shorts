// Lighting looks: sun/moon + hemisphere + ambient + sky IBL (PMREM of our sky dome) + sky-coloured exponential fog
// (Roblox Atmosphere look; far objects fade into the horizon colour) + optional world-height fog (void) + exposure
// for Khronos Neutral tone mapping + post defaults (bloom/ao/grade) returned by lookPost().
//
// Look specs (S.look(spec), shot.look, production.look):
//   'day' | 'golden' | 'sunset' | 'dusk' | 'pastel' | 'overcast' | 'hazy' | 'night' | 'interior' | 'interior_bright' | 'spooky' | 'space'
//   { preset: 'day', sun: { elevation: 40 }, atmosphere: 'warm', heightFog: { y: -20, density: 0.06, color: '#211e2d' } }
//   14.5                                        -> Roblox ClockTime (hours): blends night/dusk/golden/day + moves the sun
//   { clock: [{ t: 0, v: 14 }, { t: 1.5, v: 21 }] }         animated time of day (time-lapse)
//   { keys: [{ t: 7.6, v: 'day' }, { t: 8.4, v: 'night' }] } cross-fade between any looks
// Key times are SHOT-local for shot.look and GLOBAL production time for set/production looks.
// applyLook(scene, spec, renderer, t) may be called any number of times: the light rig is created once per scene.
import * as THREE from 'three';
import { ease, invLerp, clamp, deg } from '../core/math.js';
import { toColor } from './palette.js';
import { WORLD_UNIFORMS, NIGHT_GLOW } from './materials.js';
import { createSkyMaterial, createSkyMesh } from './sky.js';

const BASE = {
  sun: { color: '#fff1dc', intensity: 3.0, elevation: 55, azimuth: 35 },
  hemi: { sky: '#b8d4ff', ground: '#7a6f5c', intensity: 0.4 },
  ambient: { color: '#ffffff', intensity: 0 },
  env: 0.75,
  sky: { zenith: '#1c74e6', horizon: '#9fd2f5', ground: '#a7a49a', haze: 0.6, hazeColor: '#c4e2f6', clouds: 0.45, cloudColor: '#f4f6f9',
    cloudShade: '#b3c3dc', cloudScale: 1.4, cloudSoft: 0.12, cloudSpeed: 0.008, sunSize: 3, sunGlow: 0.8, stars: 0, moon: 0, moonElevation: 40, moonAzimuth: -40 },
  fog: { color: null, density: 0.0022 },
  heightFog: { y: 0, density: 0, color: '#211e2d', max: 1 },
  shadow: { softness: 0.15, intensity: 1 },
  exposure: 0.6,
  lights: 0, // 0 = day, 1 = night: scales lit windows, lamp bulbs and auto lights
  post: { bloom: { intensity: 0.6, threshold: 1.0 }, ao: { intensity: 0.7 }, grade: { saturation: 1.12, contrast: 1.05, temperature: 0.05, tint: 0, lift: 0 } },
};

export const LOOKS = {
  day: {},
  hazy: { sky: { haze: 1.3, hazeColor: '#b6d6f0', horizon: '#a9d4f2' }, fog: { density: 0.0042 } },
  golden: {
    sun: { color: '#ffb46e', intensity: 2.7, elevation: 11, azimuth: 120 },
    hemi: { sky: '#ffcfa6', ground: '#4d3f38', intensity: 0.38 }, env: 0.62,
    sky: { zenith: '#4f80c6', horizon: '#ffcf9c', ground: '#8a7060', haze: 1.2, hazeColor: '#ffc99c', clouds: 0.4, cloudColor: '#ffe6cc', cloudShade: '#c9938c', sunGlow: 1.6 },
    fog: { density: 0.0034 }, exposure: 0.64, shadow: { softness: 0.25 },
    post: { grade: { saturation: 1.12, temperature: 0.12 } },
  },
  dusk: {
    sun: { color: '#ff9a6e', intensity: 1.6, elevation: 5, azimuth: 150 },
    hemi: { sky: '#b8a8d0', ground: '#3a2a35', intensity: 0.6 }, env: 0.55, lights: 0.6,
    sky: { zenith: '#3a4c8e', horizon: '#ffb08e', ground: '#5a4a52', haze: 1.2, hazeColor: '#e8b4a4', clouds: 0.35, cloudColor: '#ffc4ac', cloudShade: '#7a5a7c', sunGlow: 2 },
    fog: { density: 0.0026 }, exposure: 0.72, shadow: { softness: 0.35 },
    post: { bloom: { intensity: 0.6 }, grade: { saturation: 0.98, temperature: 0.06 } },
  },
  pastel: { // dreamy lilac golden hour (S5): low warm backlight, pink haze, lifted blacks
    sun: { color: '#ffc68e', intensity: 2.3, elevation: 13, azimuth: 195 },
    hemi: { sky: '#f2c9de', ground: '#6e5262', intensity: 0.62 }, ambient: { color: '#ffd8e6', intensity: 0.12 }, env: 0.85,
    sky: { zenith: '#ad9fd6', horizon: '#dbc1da', ground: '#9a8090', haze: 1.1, hazeColor: '#eac6d6', clouds: 0.42, cloudColor: '#fff2f0', cloudShade: '#c9a6c6', sunGlow: 1.4 },
    fog: { color: '#e4c4d6', density: 0.003 }, exposure: 0.66, shadow: { softness: 0.35 },
    post: { bloom: { intensity: 0.6, threshold: 0.95 }, grade: { saturation: 0.92, contrast: 0.88, lift: 0.08, temperature: 0.06, tint: 0.05 } },
  },
  overcast: {
    sun: { color: '#e6ecf2', intensity: 1.0, elevation: 62, azimuth: 30 }, hemi: { sky: '#e0e6ee', ground: '#6a6a66', intensity: 0.75 }, env: 1.0,
    sky: { zenith: '#93a3b6', horizon: '#ccd4dc', haze: 0.8, hazeColor: '#d0d6dc', clouds: 0.95, cloudColor: '#e8ecf0', cloudShade: '#98a2ae', sunGlow: 0.2 },
    fog: { density: 0.004 }, exposure: 0.62, shadow: { softness: 1.0, intensity: 0.6 }, post: { grade: { saturation: 0.97 } },
  },
  night: { // saturated navy night (S9): moon key, lit windows, lamp point lights
    sun: { color: '#9db6ff', intensity: 0.55, elevation: 45, azimuth: -30 },
    hemi: { sky: '#4a62a6', ground: '#141a2a', intensity: 0.6 }, env: 0.6, lights: 1,
    sky: { zenith: '#030820', horizon: '#14295a', ground: '#0c1326', haze: 0.7, hazeColor: '#1b2f60', clouds: 0.22, cloudColor: '#3a4a78', cloudShade: '#182246', sunSize: 0.01, sunGlow: 0, stars: 1, moon: 1, moonElevation: 45, moonAzimuth: -30 },
    fog: { density: 0.0026 }, exposure: 0.85, shadow: { softness: 0.25 },
    post: { bloom: { intensity: 0.85, threshold: 0.9 }, ao: { intensity: 1.0 }, grade: { saturation: 1.22, temperature: -0.08 } },
  },
  interior: {
    sun: { color: '#fff0dc', intensity: 1.6, elevation: 55, azimuth: 40 }, hemi: { sky: '#fff2e0', ground: '#8a7a68', intensity: 0.65 },
    ambient: { color: '#ffffff', intensity: 0.25 }, env: 0.5,
    sky: { zenith: '#c8c2b8', horizon: '#e6dfd2', ground: '#8a8070', haze: 0, clouds: 0, sunGlow: 0 }, fog: { density: 0 }, exposure: 0.66,
    shadow: { softness: 0.3 }, post: { ao: { intensity: 1.0 } },
  },
  interior_bright: { // high-key pastel interior (luma ~190-220)
    sun: { color: '#fff6f0', intensity: 1.8, elevation: 60, azimuth: 30 }, hemi: { sky: '#fff0f6', ground: '#e2c8d2', intensity: 0.95 },
    ambient: { color: '#fff4f8', intensity: 0.45 }, env: 0.95,
    sky: { zenith: '#f2e6f0', horizon: '#fff4f8', ground: '#e8d8e0', haze: 0, clouds: 0, sunGlow: 0 }, fog: { density: 0 }, exposure: 0.78,
    shadow: { softness: 0.5, intensity: 0.7 }, post: { bloom: { intensity: 0.7, threshold: 0.95 }, ao: { intensity: 0.9 }, grade: { saturation: 0.86, contrast: 0.86, lift: 0.06 } },
  },
  spooky: {
    sun: { color: '#b0c4ff', intensity: 0.4, elevation: 25, azimuth: 200 }, hemi: { sky: '#5a4a7a', ground: '#120e18', intensity: 0.45 }, env: 0.5, lights: 1,
    sky: { zenith: '#0a0814', horizon: '#2e2440', ground: '#141018', haze: 1.0, hazeColor: '#2a2238', clouds: 0.5, cloudColor: '#3a3450', cloudShade: '#15121e', sunSize: 0.01, sunGlow: 0, stars: 0.4, moon: 1, moonElevation: 25, moonAzimuth: 200 },
    fog: { color: '#241e34', density: 0.012 }, heightFog: { y: 2.5, density: 0.35, color: '#3c3552', max: 0.6 }, exposure: 0.85,
    post: { bloom: { intensity: 0.7, threshold: 0.9 }, grade: { saturation: 0.85, tint: -0.06, contrast: 1.08 } },
  },
  storm: { // mauve-brown overcast (S10, S7, S3)
    sun: { color: '#e8dcd8', intensity: 1.0, elevation: 62, azimuth: 30 }, hemi: { sky: '#b8a8a6', ground: '#4a4040', intensity: 0.7 }, env: 0.9,
    sky: { zenith: '#5e4e52', horizon: '#8c7470', ground: '#5a4a48', haze: 1.2, hazeColor: '#8c7470', clouds: 1.0, cloudColor: '#7a6a6c', cloudShade: '#4a3e40', sunGlow: 0 },
    fog: { color: '#8c7470', density: 0.005 }, exposure: 0.66, shadow: { softness: 1.2, intensity: 0.5 },
    post: { bloom: { intensity: 0.3, threshold: 1.0 }, grade: { saturation: 0.75, contrast: 1.02 } },
  },
  candle: { // hyper-warm interior lit by candles/lamps (S2, S7, S3)
    sun: { color: '#ffb46e', intensity: 0.6, elevation: 50, azimuth: 40 }, hemi: { sky: '#ffb070', ground: '#5a2e18', intensity: 0.5 },
    ambient: { color: '#ff9a50', intensity: 0.12 }, env: 0.35, lights: 1,
    sky: { zenith: '#3a2418', horizon: '#6a4028', ground: '#2a1810', haze: 0, clouds: 0, sunGlow: 0 }, fog: { density: 0 }, exposure: 0.8,
    shadow: { softness: 0.35 }, post: { bloom: { intensity: 1.0, threshold: 0.85 }, ao: { intensity: 1.0 }, grade: { temperature: 0.35, saturation: 1.3 } },
  },
  teal_forest: { sky: { hazeColor: '#3f8f9c', haze: 2.0 }, fog: { color: '#3f8f9c', density: 0.006 } }, // S10: teal atmospheric forest
  menace: { // starry deep-blue sky over a day-lit ground (S4 villain shots): mood from the sky, not a grade
    sky: { zenith: '#030820', horizon: '#14295a', ground: '#1a2238', hazeColor: '#1b3166', haze: 0.5, clouds: 0.1, cloudColor: '#3a4a78', cloudShade: '#182246', stars: 1, sunGlow: 0, sunSize: 0.01 },
    env: 0.9, hemi: { sky: '#a8bcf0', ground: '#7a6c58', intensity: 1.1 }, ambient: { color: '#c8d4ff', intensity: 0.35 }, fog: { density: 0.002 }, exposure: 0.76,
  },
  void: { heightFog: { y: -10, density: 0.06, color: '#211e2d', max: 1 } }, // bottomless void below the set (S5, S2, S6, S3)
  space: {
    sun: { color: '#ffffff', intensity: 3.5, elevation: 30, azimuth: 40 }, hemi: { sky: '#1a2030', ground: '#000000', intensity: 0.15 },
    ambient: { color: '#8090c0', intensity: 0.04 }, env: 0.2,
    sky: { zenith: '#000000', horizon: '#02030a', ground: '#000000', haze: 0, clouds: 0, stars: 1, sunSize: 1.5, sunGlow: 0.6 },
    fog: { density: 0 }, exposure: 0.6, shadow: { softness: 0.05 }, post: { bloom: { intensity: 0.6 }, ao: { intensity: 0.8 }, grade: { contrast: 1.1 } },
  },
};
LOOKS.sunset = LOOKS.golden;
const ATMOS = { warm: { density: 0.0055, color: '#e9cfa6', haze: 1.5 }, blue: { density: 0.0042, color: '#b6d6f0', haze: 1.3 }, pink: { density: 0.004, color: '#eac6d6', haze: 1.3 } };
// Roblox ClockTime -> preset blend table (hours).
const CLOCK = [[0, 'night'], [5, 'night'], [6, 'dusk'], [7.2, 'golden'], [9, 'day'], [16, 'day'], [17.6, 'golden'], [18.6, 'dusk'], [19.8, 'night'], [24, 'night']];

// ---------- resolution ----------
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o) && !o.isColor;
function merge(a, b) {
  if (!isObj(b)) return b === undefined ? a : b;
  const out = { ...(isObj(a) ? a : {}) };
  for (const k of Object.keys(b)) out[k] = isObj(b[k]) ? merge(out[k], b[k]) : b[k] === undefined ? out[k] : b[k];
  return out;
}
// Strings become linear [r,g,b] so looks can be blended numerically.
function numeric(o) {
  if (typeof o === 'string') { const c = toColor(o); return [c.r, c.g, c.b]; }
  if (o?.isColor) return [o.r, o.g, o.b];
  if (isObj(o)) { const r = {}; for (const k of Object.keys(o)) r[k] = numeric(o[k]); return r; }
  return o;
}
function lerpLook(a, b, u) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => x + (b[i] - x) * u);
  if (isObj(a) && isObj(b)) { const r = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) r[k] = a[k] == null ? b[k] : b[k] == null ? a[k] : lerpLook(a[k], b[k], u); return r; }
  return u < 0.5 ? a : b;
}
const presetCache = new Map();
function preset(name) {
  if (!presetCache.has(name)) {
    if (!LOOKS[name]) throw new Error(`world: unknown look "${name}" (known: ${Object.keys(LOOKS).join(', ')})`);
    presetCache.set(name, numeric(merge(BASE, LOOKS[name])));
  }
  return presetCache.get(name);
}
function overrides(spec) {
  const { preset: _p, keys: _k, clock: _c, inherit: _i, atmosphere, ...rest } = spec;
  let o = rest;
  if (atmosphere) {
    const a = typeof atmosphere === 'string' ? ATMOS[atmosphere] : atmosphere;
    if (!a) throw new Error(`world: unknown atmosphere "${atmosphere}" (known: ${Object.keys(ATMOS).join(', ')})`);
    o = merge({ fog: { density: a.density, color: a.color }, sky: { hazeColor: a.color, haze: a.haze ?? 1.2 } }, o);
  }
  return Object.keys(o).length ? numeric(o) : null;
}
function sampleTrack(keys, time, resolveV) {
  if (time <= keys[0].t) return resolveV(keys[0].v);
  for (let i = 1; i < keys.length; i++) {
    if (time < keys[i].t) {
      const u = ease(keys[i].ease ?? 'inOutSine')(invLerp(keys[i - 1].t, keys[i].t, time));
      return { a: keys[i - 1].v, b: keys[i].v, u };
    }
  }
  return resolveV(keys[keys.length - 1].v);
}
function clockLook(c) {
  c = ((c % 24) + 24) % 24;
  let i = 1;
  while (CLOCK[i][0] < c) i++;
  const [t0, n0] = CLOCK[i - 1], [t1, n1] = CLOCK[i];
  const L = lerpLook(preset(n0), preset(n1), ease('inOutSine')(invLerp(t0, t1, c)));
  if (c > 5.6 && c < 18.4) { // the sun travels east -> west through the day
    const k = (c - 6) / 12;
    return merge(L, { sun: { elevation: Math.max(3, 62 * Math.sin(Math.PI * clamp(k, 0.03, 0.97))), azimuth: 110 - 220 * k } });
  }
  return L;
}
const staticCache = new WeakMap();
// spec -> fully specified numeric look. `base` is used for { inherit: true } specs.
export function resolveLook(spec, time = 0, base = 'day') {
  if (spec == null || spec === '') return resolveLook(base, time, 'day');
  if (typeof spec === 'string') return preset(spec);
  if (typeof spec === 'number') return clockLook(spec);
  const animated = !!(spec.keys || Array.isArray(spec.clock));
  if (!animated && !spec.inherit && staticCache.has(spec)) return staticCache.get(spec);
  let L;
  if (spec.keys) {
    const r = sampleTrack(spec.keys, time, (v) => resolveLook(v, time, base));
    L = r.u === undefined ? r : lerpLook(resolveLook(r.a, time, base), resolveLook(r.b, time, base), r.u);
  } else if (spec.clock != null) {
    const c = Array.isArray(spec.clock) ? sampleClock(spec.clock, time) : spec.clock;
    L = clockLook(c);
  } else L = resolveLook(spec.inherit ? base : spec.preset ?? 'day', time, 'day');
  const o = overrides(spec);
  if (o) L = merge(L, o);
  if (!animated && !spec.inherit) staticCache.set(spec, L);
  return L;
}
function sampleClock(keys, time) {
  const r = sampleTrack(keys, time, (v) => v);
  return typeof r === 'number' ? r : r.a + (r.b - r.a) * r.u;
}
export const isAnimatedLook = (spec) => !!(spec && typeof spec === 'object' && (spec.keys || Array.isArray(spec.clock)));

// ---------- applying ----------
const lin = (arr, out = new THREE.Color()) => out.setRGB(arr[0], arr[1], arr[2]);
const dirFrom = (el, az, out = new THREE.Vector3()) => out.set(Math.sin(deg(az)) * Math.cos(deg(el)), Math.sin(deg(el)), Math.cos(deg(az)) * Math.cos(deg(el)));

function rig(scene, renderer) {
  if (scene.userData.worldLook) return scene.userData.worldLook;
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.name = 'world:sun';
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); // 4096 costs ~15 ms more per frame on Iris Xe; fit radius is kept tight instead
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  const ambient = new THREE.AmbientLight(0xffffff, 0);
  const skyMat = createSkyMaterial();
  const sky = createSkyMesh(skyMat);
  const envScene = new THREE.Scene();
  const envSky = createSkyMesh(skyMat);
  envScene.add(envSky);
  scene.add(sun, sun.target, hemi, ambient, sky);
  scene.fog = new THREE.FogExp2(0xffffff, 0.002); // always present: switching fog types would recompile every shader
  const st = { sun, hemi, ambient, sky, skyMat, envScene, pmrem: new THREE.PMREMGenerator(renderer), envCache: new Map(), envKey: '', L: null, renderer };
  scene.userData.worldLook = st;
  return st;
}

// The IBL is captured from a QUANTISED copy of the look and cached by that copy, so a time-lapse frame gets the
// same environment whatever frame rendered before it (determinism) and slow blends reuse captures.
const qn = (o) => (typeof o === 'number' ? Math.round(o * 24) / 24 : Array.isArray(o) ? o.map(qn) : isObj(o) ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, qn(v)])) : o);
function envFor(st, L) {
  const Lq = { sky: qn(L.sky), sun: { ...L.sun, color: qn(L.sun.color), elevation: Math.round(L.sun.elevation / 3) * 3, azimuth: Math.round(L.sun.azimuth / 6) * 6 },
    exposure: qn(L.exposure), heightFog: L.heightFog.density > 0 ? qn(L.heightFog) : { ...L.heightFog, density: 0 } };
  const key = JSON.stringify(Lq);
  if (key === st.envKey) return;
  st.envKey = key;
  let t = st.envCache.get(key);
  if (!t) {
    const u = st.skyMat.uniforms, disc = u.sunDisc.value, time = u.time.value;
    setSky(st, Lq);
    u.sunDisc.value = 0; u.time.value = 0; // no sun disc in IBL (the directional light does that); static clouds
    t = st.pmrem.fromScene(st.envScene, 0, 0.1, 100, { size: 256 }).texture;
    u.sunDisc.value = disc; u.time.value = time;
    setSky(st, L);
    st.envCache.set(key, t);
    if (st.envCache.size > 12) { const [k0, t0] = st.envCache.entries().next().value; t0.dispose(); st.envCache.delete(k0); } // shortcut: FIFO, fine for a few looks + one time-lapse
  }
  st.scene.environment = t;
}

function setSky(st, L) {
  const u = st.skyMat.uniforms, s = L.sky, hf = L.heightFog;
  lin(s.zenith, u.zenith.value); lin(s.horizon, u.horizon.value); lin(s.ground, u.groundCol.value); lin(s.hazeColor, u.hazeColor.value);
  lin(s.cloudColor, u.cloudColor.value); lin(s.cloudShade, u.cloudShade.value);
  dirFrom(L.sun.elevation, L.sun.azimuth, u.sunDir.value); lin(L.sun.color, u.sunColor.value);
  dirFrom(s.moonElevation, s.moonAzimuth, u.moonDir.value);
  u.haze.value = s.haze; u.sunSize.value = s.sunSize; u.sunGlow.value = s.sunGlow; u.clouds.value = s.clouds;
  u.cloudScale.value = s.cloudScale; u.cloudSoft.value = s.cloudSoft; u.cloudSpeed.value = s.cloudSpeed; u.stars.value = s.stars; u.moon.value = s.moon;
  u.gain.value = 1 / L.exposure;
  u.hfParams.value.set(hf.y, hf.density, hf.density > 0 ? 1 : 0, hf.max ?? 1); lin(hf.color, u.hfColor.value);
}

export function applyResolved(scene, L, renderer) {
  const st = rig(scene, renderer);
  st.scene = scene;
  st.L = L;
  const gain = 1 / L.exposure;
  // sun / moon key light
  dirFrom(L.sun.elevation, L.sun.azimuth, st.sunDir ?? (st.sunDir = new THREE.Vector3()));
  lin(L.sun.color, st.sun.color);
  st.sun.intensity = L.sun.intensity * Math.min(1, Math.max(0, L.sun.elevation + 2) / 6); // fades as it sets
  st.shadowSoftness = L.shadow.softness;
  st.sun.shadow.intensity = L.shadow.intensity ?? 1;
  lin(L.hemi.sky, st.hemi.color); lin(L.hemi.ground, st.hemi.groundColor); st.hemi.intensity = L.hemi.intensity;
  lin(L.ambient.color, st.ambient.color); st.ambient.intensity = L.ambient.intensity;
  setSky(st, L);
  const s = L.sky;
  // fog: display colour / exposure so fogged geometry lands exactly on the sky's horizon colour
  lin(L.fog.color ?? s.hazeColor, scene.fog.color).multiplyScalar(gain);
  scene.fog.density = L.fog.density;
  // height fog (void)
  const hf = L.heightFog, on = hf.density > 0 ? 1 : 0;
  WORLD_UNIFORMS.hfParams.value.set(hf.y, hf.density, on, hf.max ?? 1);
  lin(hf.color, WORLD_UNIFORMS.hfColor.value).multiplyScalar(gain);
  // environment + night glow
  scene.environmentIntensity = L.env;
  envFor(st, L);
  for (const m of NIGHT_GLOW) m.emissiveIntensity = m.userData.glow * L.lights;
  return st;
}

// Director hook: called when a shot activates (shot.look ?? set.look ?? production.look). Safe to call repeatedly.
export function applyLook(scene, look, renderer, t = 0) {
  return applyResolved(scene, resolveLook(look, t, 'day'), renderer);
}

// Post defaults for the current look (fresh objects: the director/fx may merge into them). Bloom thresholds are
// authored display-referred (1.0 = a pixel that would display at full white): sunlit white walls stay below it.
export function lookPost(set, ctx) {
  const L = ctx?.scene?.userData.worldLook?.L ?? resolveLook('day');
  const p = L.post;
  return {
    exposure: L.exposure, toneMapping: 'NEUTRAL',
    bloom: { intensity: p.bloom.intensity, threshold: p.bloom.threshold / L.exposure }, // display-referred -> raw HDR
    ao: { intensity: p.ao.intensity },
    grade: { ...p.grade },
  };
}

// Shadow camera fitted to a sphere (centre, radius) with texel snapping (no shimmer on moving cameras).
const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _c = new THREE.Vector3();
export function fitShadow(st, center, radius) {
  const sun = st.sun, d = st.sunDir, cam = sun.shadow.camera, size = sun.shadow.mapSize.x;
  const texel = (2 * radius) / size;
  _r.crossVectors(Math.abs(d.y) > 0.99 ? _u.set(1, 0, 0) : _u.set(0, 1, 0), d).normalize();
  _u.crossVectors(d, _r).normalize();
  const a = Math.round(center.dot(_r) / texel) * texel, b = Math.round(center.dot(_u) / texel) * texel, c = center.dot(d);
  _c.copy(_r).multiplyScalar(a).addScaledVector(_u, b).addScaledVector(d, c);
  sun.target.position.copy(_c);
  sun.position.copy(_c).addScaledVector(d, radius + 60);
  Object.assign(cam, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 2 * radius + 120 });
  cam.updateProjectionMatrix();
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); // runs after the renderer's scene matrix update (onBeforeRender)
  sun.shadow.radius = clamp(st.shadowSoftness / texel, 1, 6);
  sun.shadow.bias = -0.00012 * (radius / 60);
}
