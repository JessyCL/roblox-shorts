// Deterministic particle systems. Every particle is a closed-form function of time (spawn index -> seeded hash ->
// start position/velocity; position = ballistic + drag + flutter, analytic ground bounces), so any frame can be
// rendered in any order with no simulation state; continuous emitters are "pre-warmed" for free (particles spawned
// before t = 0 already exist at t = 0). This satisfies the re-computable-simulation rule without stepping.
//
//   particles(parent, opts) -> Object3D with .update(t) and .dispose()
//     parent: Object3D | set builder S (uses S.group / S.add) | director ctx (adds to ctx.scene) | null (add it yourself)
//     opts.type: one of TYPES below; any TYPES field can be overridden:
//       pos [x,y,z] emitter centre | follow: 'hero.feet' | 'camera' | Object3D | (ctx) => Vector3  (+ trail: [vx,vy,vz]
//       places older particles behind a moving emitter) | area [w,h,d] spawn box | ring: radius (spawn on a ring)
//       rate (per s, continuous) | count + bursts: [t, ...] (burst emitter) | start / stop (emitter on/off times)
//       life (s), size: [min, max] (or [w, h] when aspect is set), grow: k or [from, to] (size multiplier over life)
//       velocity [x,y,z], spread [x,y,z] (random +-), gravity (studs/s^2), drag (1/s), wind [x,y,z] (studs/s),
//       flutter (studs), spin (rad/s), tumble (rad/s, meshes/confetti), bounce (restitution, needs ground y)
//       color '#hex' | ['#a', '#b'] palette, colorEnd, opacity, intensity (>1 feeds bloom), fade: [in, out] (life
//       fractions), blending 'normal' | 'add', lit (sun-shaded soft billboards), billboard 'full' | 'y', seed
//       clock: 'shot' (default: shot-local time, auto-updated by evaluateFx) | 'global' | calling update(t) = manual
//
// Shots normally declare systems in their fx list: { type: 'particles', kind: 'dust_wall', pos: [0, 0, -30] }.
// Sets: `fx.particles(S, { type: 'dust_wall', ... })` (needs S.group or S.add from the world module).
import * as THREE from 'three';
import { clamp, hash1, hashString, lerp, noise1, rng, smoothstep } from '../core/math.js';

export const clock = { t: 0, lt: 0 }; // written by evaluateFx on every director.setTime
const registry = new Set();

// Presets. Dust wall/puffs from S6 (huge billowing tan sprites, layered, slow drift; footstep puffs),
// puff rings from S9 (opaque spheres scale 0.3 -> 1.2, fade over 0.5 s), sparkles = white 4-point stars.
export const TYPES = {
  dust_wall: { tex: 'smoke', area: [70, 8, 12], rate: 12, life: 10, size: [16, 26], grow: 1.35, velocity: [0, 0.35, 0], spread: [0.8, 0.15, 0.6], wind: [0.5, 0, 0], color: ['#d4b27e', '#bf9864', '#e2c79a'], opacity: 0.8, lit: true, billboard: 'y', spin: 0.05, fade: [0.2, 0.35] },
  smoke: { tex: 'smoke', area: [1, 0, 1], rate: 8, life: 4, size: [1.5, 2.5], grow: 3, velocity: [0, 2.2, 0], spread: [0.4, 0.3, 0.4], color: ['#8d8d8d', '#a6a6a6'], opacity: 0.5, lit: true, spin: 0.3, fade: [0.1, 0.5] },
  puff: { tex: 'smoke', area: [0.4, 0, 0.4], count: 6, life: 0.8, size: [0.8, 1.3], grow: 2.2, velocity: [0, 1, 0], spread: [2.4, 0.6, 2.4], drag: 4, color: ['#dcc29a', '#cbb08a'], opacity: 0.65, lit: true, spin: 0.5, fade: [0.05, 0.6] },
  footdust: { tex: 'smoke', area: [0.6, 0, 0.3], rate: 5, life: 0.9, size: [0.6, 1.0], grow: 2.4, velocity: [0, 0.8, 0], spread: [1.2, 0.4, 1.2], drag: 3, color: ['#d6bb92', '#c6a983'], opacity: 0.6, lit: true, spin: 0.6, fade: [0.05, 0.6] },
  sparkle: { tex: 'star', area: [1, 1, 1], rate: 10, life: 0.35, size: [0.35, 0.75], twinkle: true, color: ['#ffffff', '#fff4d6'], intensity: 3, blending: 'add', spin: 1.2, fade: [0, 0] },
  confetti: { tex: 'square', area: [4, 0, 4], count: 120, life: 3.5, size: [0.2, 0.3], aspect: 0.6, velocity: [0, 13, 0], spread: [7, 4, 7], gravity: -14, drag: 1.6, flutter: 0.8, tumble: 7, color: ['#ff3b3b', '#ffd23b', '#3bd16f', '#3b8bff', '#c85bff', '#ff7ad1'], fade: [0, 0.15] },
  debris: { mesh: 'box', count: 24, life: 3, size: [0.25, 0.6], velocity: [0, 14, 0], spread: [8, 6, 8], gravity: -60, bounce: 0.35, tumble: 9, color: ['#7c7c7c', '#8a6b4a', '#5e5e5e'], fade: [0, 0.1] },
  puff_ring: { mesh: 'sphere', ring: 1.0, count: 10, life: 0.5, size: [0.9, 1.1], grow: [0.3, 1.2], velocity: [0, 0.6, 0], radial: 3.5, drag: 2, color: '#f4f4f4', fade: [0, 0.6] },
  snow_spheres: { mesh: 'sphere', area: [30, 18, 30], rate: 10, life: 6, size: [0.3, 0.9], velocity: [0, -3.5, 0], flutter: 0.6, color: '#ffffff', fade: [0.05, 0.05] },
  rain: { tex: 'dot', area: [40, 30, 40], follow: 'camera', rate: 900, life: 0.6, size: [0.05, 1.6], aspect: true, velocity: [0, -60, 0], spread: [0.5, 4, 0.5], color: '#cfd8e6', opacity: 0.35, billboard: 'y', fade: [0.1, 0.1] },
  snow: { tex: 'dot', area: [40, 25, 40], follow: 'camera', rate: 120, life: 8, size: [0.18, 0.32], velocity: [0, -2.5, 0], spread: [0.3, 0.5, 0.3], flutter: 0.8, color: '#ffffff', opacity: 0.9, fade: [0.05, 0.1] },
  motes: { tex: 'dot', area: [6, 3, 6], rate: 12, life: 3, size: [0.12, 0.3], velocity: [0, 0.6, 0], spread: [0.2, 0.2, 0.2], flutter: 0.6, twinkle: true, color: ['#9ff5ff', '#ffe28a'], intensity: 2.5, blending: 'add', fade: [0.2, 0.3] },
  fire: { tex: 'smoke', area: [0.8, 0, 0.8], rate: 40, life: 0.9, size: [1.1, 1.5], grow: 0.35, velocity: [0, 3.2, 0], spread: [0.3, 0.6, 0.3], color: '#ffd25a', colorEnd: '#ff3a10', intensity: 2.5, blending: 'add', spin: 0.8, fade: [0.1, 0.4] },
  embers: { tex: 'dot', area: [1, 0.2, 1], rate: 14, life: 2, size: [0.07, 0.14], velocity: [0, 3, 0], spread: [0.8, 0.8, 0.8], flutter: 1.2, twinkle: true, color: '#ff8a2a', intensity: 4, blending: 'add', fade: [0.05, 0.4] },
  // S10/S2: head-anchored additive rings, a new ring every ~0.3 s, 0.8 s life (use follow: 'hero.head').
  sound_rings: { tex: 'ring', rate: 3.3, life: 0.8, size: [1.2, 1.2], grow: [0.35, 2.2], color: '#ffffff', intensity: 1.6, blending: 'add', fade: [0.05, 0.7] },
  // Wind-line streaks (screen-horizontal, moving along +X; set velocity for another direction).
  wind_lines: { tex: 'dot', area: [30, 10, 30], rate: 18, life: 0.7, size: [4, 0.07], aspect: true, velocity: [28, 0, 0], spread: [4, 0.5, 0], color: '#ffffff', opacity: 0.55, fade: [0.3, 0.4] },
  glow_puffs: { tex: 'smoke', area: [0.6, 0.3, 0.6], count: 12, life: 0.8, size: [0.8, 1.4], grow: 2.5, velocity: [0, 2.5, 0], spread: [2.5, 1.5, 2.5], drag: 2.5, color: '#ffd84a', intensity: 2.2, blending: 'add', spin: 0.6, fade: [0.05, 0.6] },
};

// ---------- textures (canvas, generated once, seeded) ----------
const texCache = {};
function canvasTex(name, size, fn) {
  if (texCache[name]) return texCache[name];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  fn(img.data, size);
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return (texCache[name] = t);
}
function valueNoise2(seed) {
  const r = rng(seed), N = 64, lat = Float32Array.from({ length: N * N }, r);
  const at = (x, y) => lat[((y % N + N) % N) * N + ((x % N + N) % N)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), sx), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), sx), sy);
  };
}
const TEX = {
  smoke: () => canvasTex('smoke', 256, (d, S) => { // 2x2 atlas of billowy puffs
    const T = S / 2;
    for (let tile = 0; tile < 4; tile++) {
      const n = valueNoise2(101 + tile * 7), ox = (tile % 2) * T, oy = Math.floor(tile / 2) * T;
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const u = x / T * 2 - 1, v = y / T * 2 - 1;
        const f = n(x / 14, y / 14) * 0.5 + n(x / 7, y / 7) * 0.3 + n(x / 3.5, y / 3.5) * 0.2;
        const r = Math.hypot(u, v) + (f - 0.5) * 0.55;
        const a = clamp(1 - smoothstep(0.25, 0.95, r)) * (0.55 + 0.45 * f);
        const i = ((oy + y) * S + ox + x) * 4, shade = 200 + 55 * f;
        d[i] = d[i + 1] = d[i + 2] = shade; d[i + 3] = a * 255;
      }
    }
  }),
  star: () => canvasTex('star', 128, (d, S) => { // 4-point star with a soft core
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = Math.abs(x / S * 2 - 1), v = Math.abs(y / S * 2 - 1), r = Math.hypot(u, v);
      const ray = Math.exp(-v * 28) * (1 - u) ** 2 + Math.exp(-u * 28) * (1 - v) ** 2;
      const a = clamp(ray + Math.exp(-r * r * 30) + 0.25 * Math.exp(-r * r * 6));
      const i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 255;
    }
  }),
  dot: () => canvasTex('dot', 64, (d, S) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = Math.hypot(x / S * 2 - 1, y / S * 2 - 1), i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = clamp(Math.exp(-r * r * 4) * 1.15 - 0.15) * 255;
    }
  }),
  square: () => canvasTex('square', 8, (d) => d.fill(255)),
  ring: () => canvasTex('ring', 128, (d, S) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = Math.hypot(x / S * 2 - 1, y / S * 2 - 1), i = (y * S + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = clamp(Math.exp(-(((r - 0.82) / 0.06) ** 2))) * 255;
    }
  }),
};

// ---------- materials ----------
const spriteVert = /* glsl */ `
attribute vec3 iPos; attribute vec2 iSize; attribute float iRot; attribute vec4 iCol; attribute float iTile;
uniform float tiles;
varying vec2 vUv; varying vec2 vLocal; varying vec4 vCol;
#include <fog_pars_vertex>
void main() {
  float c = cos(iRot), s = sin(iRot);
  vec2 r = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * iSize;
  vec4 mvPosition;
#ifdef CYLINDRICAL
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  right = normalize(vec3(right.x, 0.0, right.z) + vec3(1e-5, 0.0, 0.0));
  vec3 wp = (modelMatrix * vec4(iPos, 1.0)).xyz + right * r.x + vec3(0.0, r.y, 0.0);
  mvPosition = viewMatrix * vec4(wp, 1.0);
#else
  mvPosition = modelViewMatrix * vec4(iPos, 1.0);
  mvPosition.xy += r;
#endif
  gl_Position = projectionMatrix * mvPosition;
  vLocal = position.xy * 2.0;
  vUv = (uv + vec2(mod(iTile, tiles), floor(iTile / tiles))) / tiles;
  vCol = iCol;
#include <fog_vertex>
}`;
const spriteFrag = /* glsl */ `
uniform sampler2D map; uniform float lit; uniform vec3 lightDir; uniform vec3 lightColor; uniform vec3 ambient;
varying vec2 vUv; varying vec2 vLocal; varying vec4 vCol;
#include <fog_pars_fragment>
void main() {
  vec4 tx = texture2D(map, vUv);
  float a = tx.a * vCol.a;
  if (a < 0.002) discard;
  vec3 col = vCol.rgb * tx.rgb;
  if (lit > 0.5) {
    vec3 n = normalize(vec3(vLocal, 0.7));
    col *= ambient + lightColor * (dot(n, lightDir) * 0.5 + 0.5);
  }
  gl_FragColor = vec4(col, a);
#include <fog_fragment>
}`;

function spriteMaterial(o) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      map: { value: null }, tiles: { value: 1 }, lit: { value: o.lit ? 1 : 0 },
      lightDir: { value: new THREE.Vector3(0, 1, 0) }, lightColor: { value: new THREE.Color(1, 1, 1) }, ambient: { value: new THREE.Color(0.5, 0.5, 0.5) },
    }]),
    vertexShader: spriteVert, fragmentShader: spriteFrag, fog: true, transparent: true, depthWrite: false,
    blending: o.blending === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
    defines: o.billboard === 'y' ? { CYLINDRICAL: 1 } : {},
  });
  m.uniforms.map.value = TEX[o.tex]();
  m.uniforms.tiles.value = o.tex === 'smoke' ? 2 : 1;
  return m;
}

const GEO = { box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.SphereGeometry(0.5, 14, 10) };
function meshMaterial(alphaAttr) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, transparent: true, depthWrite: true });
  m.onBeforeCompile = (sh) => { // per-instance alpha for fading (puff rings)
    sh.vertexShader = 'attribute float iAlpha;\nvarying float vIAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvIAlpha = iAlpha;');
    sh.fragmentShader = 'varying float vIAlpha;\n' + sh.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a *= vIAlpha;\n#include <alphatest_fragment>');
  };
  m.customProgramCacheKey = () => 'fx-particle-mesh';
  return m;
}

// ---------- system ----------
const _c = new THREE.Color(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _ax = new THREE.Vector3();
const asRange = (x) => (Array.isArray(x) ? x : [x, x]);
const asVec = (x, d = 0) => (Array.isArray(x) ? x : [x ?? d, x ?? d, x ?? d]);

export function particles(parent, opts = {}) {
  const base = TYPES[opts.type ?? opts.kind];
  if (!base && !opts.tex && !opts.mesh) throw new Error(`fx particles: unknown type "${opts.type ?? opts.kind}" (known: ${Object.keys(TYPES).join(', ')})`);
  const o = { tex: 'dot', life: 1, size: [0.5, 0.5], velocity: [0, 0, 0], spread: [0, 0, 0], area: [0, 0, 0], gravity: 0, drag: 0, opacity: 1, intensity: 1, fade: [0.1, 0.3], color: '#ffffff', ...base, ...opts };
  const seed = typeof o.seed === 'string' ? hashString(o.seed) : (o.seed ?? 1) * 7919;
  const palette = (Array.isArray(o.color) ? o.color : [o.color]).map((c) => new THREE.Color(c));
  const colorEnd = o.colorEnd ? new THREE.Color(o.colorEnd) : null;
  const bursts = o.count && !o.rate ? (o.bursts ?? [o.t ?? 0]) : null;
  const maxLife = o.life * 1.2;
  const cap = Math.min(4000, bursts ? o.count * bursts.length : Math.ceil(maxLife * o.rate) + 2);
  const lifeOf = (k) => o.life * (0.8 + 0.4 * hash1(k * 16 + 9, seed));
  const grow = Array.isArray(o.grow) ? o.grow : [1, o.grow ?? 1];
  const area = asVec(o.area), vel = asVec(o.velocity), spr = asVec(o.spread), wind = asVec(o.wind ?? 0);

  let obj, attrs;
  if (o.mesh) {
    obj = new THREE.InstancedMesh(GEO[o.mesh], meshMaterial(), cap);
    obj.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    obj.setColorAt(0, _c.set(1, 1, 1));
    attrs = { alpha: new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage) };
    obj.geometry = GEO[o.mesh].clone(); // own geometry so the iAlpha attribute is per system
    obj.geometry.setAttribute('iAlpha', attrs.alpha);
    obj.castShadow = !!o.castShadow;
  } else {
    const g = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    g.index = plane.index; g.setAttribute('position', plane.attributes.position); g.setAttribute('uv', plane.attributes.uv);
    const A = (n) => new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n).setUsage(THREE.DynamicDrawUsage);
    attrs = { pos: A(3), size: A(2), rot: A(1), col: A(4), tile: A(1) };
    g.setAttribute('iPos', attrs.pos); g.setAttribute('iSize', attrs.size); g.setAttribute('iRot', attrs.rot); g.setAttribute('iCol', attrs.col); g.setAttribute('iTile', attrs.tile);
    g.instanceCount = 0;
    obj = new THREE.Mesh(g, spriteMaterial(o));
    obj.renderOrder = o.renderOrder ?? 1;
  }
  obj.name = `fx:particles:${o.type ?? 'custom'}`;
  obj.frustumCulled = false;
  const emitter = new THREE.Vector3(...(o.pos ?? [0, 0, 0]));
  const live = []; // scratch: { p: Vector3, size, ..., depth }

  // Closed-form particle state at age a (k = spawn index).
  function particleAt(k, a, life, out) {
    const h = (j) => hash1(k * 16 + j, seed);
    const u = a / life;
    let px, py, pz, vx = vel[0] + (h(3) - 0.5) * 2 * spr[0], vy = vel[1] + (h(4) - 0.5) * 2 * spr[1], vz = vel[2] + (h(5) - 0.5) * 2 * spr[2];
    if (o.ring != null) {
      const ang = (k % (o.count ?? 12)) / (o.count ?? 12) * Math.PI * 2 + h(0) * 0.3;
      px = Math.cos(ang) * o.ring; py = 0; pz = Math.sin(ang) * o.ring;
      vx += Math.cos(ang) * (o.radial ?? 0); vz += Math.sin(ang) * (o.radial ?? 0);
    } else { px = (h(0) - 0.5) * area[0]; py = (h(1) - 0.5) * area[1]; pz = (h(2) - 0.5) * area[2]; }
    const g = o.gravity, d = o.drag;
    const fA = d > 0 ? (1 - Math.exp(-d * a)) / d : a;              // integral of exp(-d t)
    const fG = d > 0 ? (a - fA) / d : 0.5 * a * a;                  // integral of the gravity term
    px += vx * fA + wind[0] * a; pz += vz * fA + wind[2] * a;
    py += vy * fA + g * fG + wind[1] * a;
    if (o.flutter) { px += o.flutter * noise1(a * 1.3 + h(6) * 50, seed + 1); pz += o.flutter * noise1(a * 1.1 + h(7) * 50, seed + 2); py += 0.3 * o.flutter * noise1(a * 0.9 + h(8) * 50, seed + 3); }
    let rest = false;
    if (o.bounce != null && g < 0) { // analytic bounces on the ground plane (no drag)
      const ground = (o.ground ?? 0) - emitter.y;
      let y0 = (o.ring != null ? 0 : (h(1) - 0.5) * area[1]), v = vy, t = a, damp = 1;
      for (let n = 0; n < 6; n++) {
        const disc = v * v - 2 * g * (y0 - ground), th = (-v - Math.sqrt(Math.max(0, disc))) / g; // time to hit the ground
        if (!(th > 1e-4) || t < th) { py = y0 + v * t + 0.5 * g * t * t; break; }
        t -= th; v = -(v + g * th) * o.bounce; y0 = ground; damp *= 0.6;
        if (Math.abs(v) < 1.5) { py = ground; rest = true; break; }
      }
      const tFlat = Math.min(a, rest ? a - t : a); // horizontal motion slows after each bounce (cheap approximation)
      px = (o.ring != null ? px : (h(0) - 0.5) * area[0]) + vx * tFlat * (0.4 + 0.6 * damp);
      pz = (o.ring != null ? pz : (h(2) - 0.5) * area[2]) + vz * tFlat * (0.4 + 0.6 * damp);
      py += o.size[1] * 0.3;
    }
    out.x = px; out.y = py; out.z = pz; out.rest = rest;
    const s0 = lerp(asRange(o.size)[0], asRange(o.size)[1], h(10));
    let sz = s0 * lerp(grow[0], grow[1], u);
    if (o.twinkle) sz *= Math.sqrt(Math.max(0, Math.sin(Math.PI * u))) * (0.75 + 0.25 * Math.sin(a * 31 + k));
    out.size = sz;
    out.rot = h(11) * Math.PI * 2 + (o.spin ?? 0) * (h(12) * 2 - 1) * a;
    out.tumble = rest ? 0 : (o.tumble ?? 0) * a * (0.5 + h(13));
    const [fi, fo] = o.fade;
    out.alpha = o.opacity * (fi > 0 ? smoothstep(0, fi, u) : 1) * (fo > 0 ? 1 - smoothstep(1 - fo, 1, u) : 1);
    out.color = _c.copy(palette[Math.floor(h(14) * palette.length) % palette.length]);
    if (colorEnd) out.color.lerp(colorEnd, u);
    out.tile = Math.floor(h(15) * 4);
    out.k = k;
    return out;
  }

  // Enumerate live particles at time t into `live` (positions relative to the emitter).
  function collect(t) {
    let n = 0;
    const push = (k, s) => {
      const life = lifeOf(k), a = t - s;
      if (a < 0 || a >= life) return;
      if (n >= cap) return;
      live[n] ??= { p: new THREE.Vector3(), color: new THREE.Color() };
      const st = particleAt(k, a, life, {});
      const L = live[n++];
      L.p.set(st.x, st.y, st.z);
      if (o.trail) L.p.addScaledVector(_v.fromArray(o.trail), -a);
      Object.assign(L, { size: st.size, rot: st.rot, tumble: st.tumble, alpha: st.alpha, tile: st.tile, k });
      L.color.copy(st.color);
    };
    if (bursts) bursts.forEach((tb, b) => { for (let i = 0; i < o.count; i++) push(b * o.count + i, tb); });
    else {
      const k0 = Math.ceil((t - maxLife) * o.rate), k1 = Math.floor(t * o.rate);
      for (let k = k0; k <= k1; k++) {
        const s = k / o.rate;
        if ((o.start != null && s < o.start) || (o.stop != null && s > o.stop)) continue;
        push(k, s);
      }
    }
    return n;
  }

  let manualT = null;
  obj.opts = o;
  obj.update = (t) => { manualT = t; }; // manual clock; geometry is rebuilt in frame() once the camera is known
  obj.frame = (ctx) => {
    const t = manualT ?? (o.clock === 'global' ? ctx.t : ctx.lt);
    // emitter position
    if (o.follow === 'camera') emitter.copy(ctx.camera.position);
    else if (o.follow?.isObject3D) o.follow.getWorldPosition(emitter);
    else if (typeof o.follow === 'function') { const r = o.follow(ctx); emitter.set(...(r.isVector3 ? r.toArray() : r)); }
    else if (o.follow) { try { ctx.resolve(o.follow, emitter); } catch { /* actor not in this shot: keep last */ } }
    if (o.follow && o.offset) emitter.add(_v.fromArray(o.offset));
    const n = collect(t);
    const cam = ctx.camera;
    if (o.mesh) {
      for (let i = 0; i < n; i++) {
        const L = live[i];
        _ax.set(Math.sin(L.k * 1.7), Math.cos(L.k * 2.3), Math.sin(L.k * 0.7)).normalize();
        _q.setFromAxisAngle(_ax, L.rot + L.tumble);
        _m.compose(_v.copy(L.p).add(emitter), _q, _s.setScalar(Math.max(1e-4, L.size)));
        obj.setMatrixAt(i, _m);
        obj.setColorAt(i, L.color);
        attrs.alpha.array[i] = L.alpha;
      }
      obj.count = n;
      obj.instanceMatrix.needsUpdate = true;
      if (obj.instanceColor) obj.instanceColor.needsUpdate = true;
      attrs.alpha.needsUpdate = true;
      return;
    }
    // sprites: back-to-front for normal blending
    const order = Array.from({ length: n }, (_, i) => i);
    if (o.blending !== 'add' && cam) {
      cam.getWorldDirection(_ax);
      for (let i = 0; i < n; i++) live[i].depth = _v.copy(live[i].p).add(emitter).sub(cam.position).dot(_ax);
      order.sort((a, b) => live[b].depth - live[a].depth);
    }
    const [sw, sh] = o.aspect === true ? asRange(o.size) : [1, typeof o.aspect === 'number' ? o.aspect : 1];
    for (let j = 0; j < n; j++) {
      const L = live[order[j]];
      attrs.pos.setXYZ(j, L.p.x + emitter.x, L.p.y + emitter.y, L.p.z + emitter.z);
      if (o.aspect === true) attrs.size.setXY(j, sw, sh);
      else attrs.size.setXY(j, L.size * sw * (o.tumble ? Math.abs(Math.cos(L.tumble)) + 0.08 : 1), L.size * sh);
      attrs.rot.setX(j, o.aspect === true ? 0 : L.rot);
      attrs.col.setXYZW(j, L.color.r * o.intensity, L.color.g * o.intensity, L.color.b * o.intensity, L.alpha);
      attrs.tile.setX(j, L.tile);
    }
    for (const a of Object.values(attrs)) a.needsUpdate = true;
    obj.geometry.instanceCount = n;
    if (o.lit) lightUniforms(obj.material, ctx);
  };
  obj.dispose = () => { registry.delete(obj); obj.removeFromParent(); obj.geometry.dispose(); obj.material.dispose(); };

  const host = parent?.isObject3D ? parent : parent?.group?.isObject3D ? parent.group : parent?.add && !parent.scene ? null : parent?.scene;
  if (host) host.add(obj);
  else if (typeof parent?.add === 'function' && !parent.isObject3D) parent.add(obj);
  registry.add(obj);
  return obj;
}

// Sun-shading for lit sprites: first visible DirectionalLight + hemisphere/ambient as the fill.
let sun = null, fill = null;
function lightUniforms(mat, ctx) {
  if (!sun?.parent || !sun.visible) {
    sun = null; fill = new THREE.Color(0, 0, 0);
    ctx.scene.traverseVisible((l) => {
      if (l.isDirectionalLight && !sun) sun = l;
      if (l.isHemisphereLight) fill.add(_c.copy(l.color).lerp(l.groundColor, 0.4).multiplyScalar(l.intensity));
      if (l.isAmbientLight) fill.add(_c.copy(l.color).multiplyScalar(l.intensity));
    });
  }
  const U = mat.uniforms;
  if (sun) {
    U.lightDir.value.subVectors(sun.getWorldPosition(_v), sun.target.getWorldPosition(_s)).normalize().transformDirection(ctx.camera.matrixWorldInverse);
    U.lightColor.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
  }
  U.ambient.value.copy(fill).multiplyScalar(0.55).addScalar(0.12 + 0.25 * (ctx.scene.environmentIntensity ?? 0));
}

// Called by evaluateFx after the camera is placed: rebuild every system that is visible in the scene graph.
export function frameParticles(ctx) {
  for (const p of registry) {
    let o = p, shown = true;
    while (o) { if (!o.visible) { shown = false; break; } o = o.parent; }
    if (shown && p.parent) p.frame(ctx);
  }
}

console.assert((() => { const T = TYPES.puff; return T.count > 0 && hash1(5, 3) === hash1(5, 3); })(), 'fx/particles self-check failed');
