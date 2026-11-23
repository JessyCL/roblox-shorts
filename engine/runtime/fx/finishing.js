// Finishing effect (pmndrs postprocessing Effect, own EffectPass after SMAA): 2D zoom/offset/rotation (screen punch,
// 2D shake), radial + directional blur, glitch, unsharp-mask sharpen, colour grade, flash overlay.
// Everything is driven by `director.post` through `apply(post)`, called by pipeline.js every frame.
//
// post fields read here (all optional; evaluateFx resolves `grade` to absolute values first):
//   grade      { exposure (stops), contrast, saturation, vibrance, temperature (-1..1 warm), tint (-1..1 magenta),
//                lift, gamma, gain (number or [r,g,b]), curve (S-curve 0..1), tone ('#hex' duotone mid colour),
//                toneMix (0..1), sharpen, preset: 'crunchy'|'sepia'|'flashback'|'night'|'sunset'|'horror'|'storm'|
//                'memory'|'pastel'|'dreamy'|'desaturated'|'bw',
//                amount (preset mix), house: false (skip the house grade) }  |  false (neutral, no sharpen)
//   sharpen    unsharp amount (house default 0.6, the target look is "crunchy")
//   flash      { color: '#fff', alpha }            overlay after grading (white/black flashes, fades)
//   screen     { zoom: 1, offset: [x, y] (fractions of frame), rotate: deg }
//   radialBlur { amount (fraction of the distance to centre), center: [0.5, 0.5] }
//   dirBlur    { amount (fraction of frame width), angle: deg }
//   glitch     { amount 0..1, seed }
import * as THREE from 'three';
import { Effect, EffectAttribute } from 'postprocessing';
import { lerp } from '../core/math.js';

// House grade (S6 G / S8 F): saturation +20-30 %, mild S-curve, unsharp ~0.6.
export const HOUSE_GRADE = { saturation: 1.22, vibrance: 0.12, contrast: 1.04, curve: 0.22 };
export const HOUSE_SHARPEN = 0.6;
export const NEUTRAL_GRADE = { exposure: 0, contrast: 1, saturation: 1, vibrance: 0, temperature: 0, tint: 0, lift: 0, gamma: 1, gain: 1, curve: 0, tone: '#808080', toneMix: 0 };

// Presets are modifier layers: multiplicative for saturation/contrast/gamma/gain, additive for the rest,
// tone/toneMix replace. Sepia from S6 (sat x0.4, warm brown, luma 82-96 vs ~125, mean RGB ~99/80/51).
export const GRADE_PRESETS = {
  crunchy: {},
  sepia: { saturation: 0.3, exposure: -0.3, contrast: 1.04, tone: '#9a7448', toneMix: 0.75 },
  // STYLE_BIBLE: target-style nights stay saturated (sat 150-250, luma >= 35); horror is moody, not grey.
  night: { exposure: -0.6, temperature: -0.5, saturation: 1.15, tint: -0.05, lift: [0, 0.01, 0.035] },
  sunset: { temperature: 0.5, saturation: 1.08, gain: [1.05, 0.97, 0.86], exposure: -0.1 },
  horror: { saturation: 0.9, contrast: 1.15, exposure: -0.3, temperature: -0.2, tint: -0.1, lift: -0.02 },
  storm: { saturation: 0.55, contrast: 0.92 },
  memory: { temperature: 0.35, saturation: 0.9 },
  pastel: { sharpen: 0.25 },
  dreamy: { sharpen: 0.25, contrast: 0.95, lift: 0.03 },
  desaturated: { saturation: 0.15 },
  bw: { saturation: 0 },
};
GRADE_PRESETS.flashback = GRADE_PRESETS.sepia;
const MUL = new Set(['saturation', 'contrast', 'gamma', 'gain']);
const ABS = new Set(['sharpen']); // absolute values, blended by amount

const vec = (v) => (Array.isArray(v) ? v : [v, v, v]);
const mix3 = (a, b, f) => { const A = vec(a), B = vec(b); return A.map((x, i) => f(x, B[i])); };

// Apply a modifier layer (preset name or params) to an absolute grade with weight `amount` (0..1).
export function combineGrade(g, layer, amount = 1) {
  if (typeof layer === 'string') {
    if (!GRADE_PRESETS[layer]) throw new Error(`fx: unknown grade preset "${layer}" (known: ${Object.keys(GRADE_PRESETS).join(', ')})`);
    layer = GRADE_PRESETS[layer];
  }
  if (!(amount > 0)) return g;
  const out = { ...g };
  for (const [k, v] of Object.entries(layer)) {
    if (k === 'tone') out.tone = v;
    else if (k === 'toneMix') out.toneMix = lerp(g.toneMix ?? 0, v, amount);
    else if (ABS.has(k)) out[k] = lerp(g[k] ?? (g.off ? 0 : HOUSE_SHARPEN), v, amount);
    else if (!(k in NEUTRAL_GRADE)) continue;
    else if (MUL.has(k)) out[k] = mix3(g[k] ?? 1, v, (a, b) => a * lerp(1, b, amount));
    else out[k] = mix3(g[k] ?? 0, v, (a, b) => a + b * amount);
    if (Array.isArray(out[k]) && !Array.isArray(g[k]) && !Array.isArray(v)) out[k] = out[k][0];
  }
  return out;
}

// post.grade (shot/look value) -> absolute params: neutral <- house <- explicit fields <- preset layer.
export function resolveGrade(g) {
  if (g === false || g === 'none') return { ...NEUTRAL_GRADE, off: true };
  if (g?.resolved) return g;
  if (typeof g === 'string') g = { preset: g };
  const { preset, amount = 1, house = true, ...fields } = g ?? {};
  let out = { ...NEUTRAL_GRADE, ...(house ? HOUSE_GRADE : {}), ...fields };
  if (preset) out = combineGrade(out, preset, amount);
  out.resolved = true;
  return out;
}

const frag = /* glsl */ `
uniform float exposure;
uniform vec3 wb;
uniform vec3 lift;
uniform vec3 gammaInv;
uniform vec3 gain;
uniform float contrast;
uniform float curve;
uniform float saturation;
uniform float vibrance;
uniform vec3 toneColor;
uniform float toneMix;
uniform float sharpen;
uniform vec4 flash;
uniform vec4 xform;      // zoom, rotation (rad), offset x, offset y
uniform vec2 blurCenter;
uniform float radialAmount;
uniform vec3 dirBlur;    // amount (uv), dir.xy
uniform vec2 glitch;     // amount, seed

float ghash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 tap(vec2 p) { return textureLod(inputBuffer, p, 0.0).rgb; } // explicit LOD: sampled inside loops/branches

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 q = uv;
  float split = 0.0;
  if (glitch.x > 0.0) {
    float band = floor(q.y * 24.0 + glitch.y * 7.0);
    float h = ghash(vec2(band, glitch.y));
    if (h < glitch.x * 0.6) q.x += (ghash(vec2(band, glitch.y + 1.7)) - 0.5) * 0.12 * glitch.x;
    split = glitch.x * 0.012;
  }
  // 2D transform about the frame centre (aspect-correct rotation).
  vec2 p = q - 0.5;
  p.x *= aspect;
  float c = cos(xform.y), s = sin(xform.y);
  p = mat2(c, s, -s, c) * p / xform.x;
  p.x /= aspect;
  q = p + 0.5 - xform.zw;

  vec3 col;
  if (radialAmount > 1e-4 || dirBlur.x > 1e-4) {
    vec2 stepR = (blurCenter - q) * radialAmount / 15.0;
    vec2 stepD = vec2(dirBlur.y, dirBlur.z * aspect) * dirBlur.x / 15.0;
    col = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float k = float(i);
      col += tap(q + stepR * k + stepD * (k - 7.5));
    }
    col /= 16.0;
  } else {
    col = tap(q);
    if (sharpen > 0.0) {
      vec3 n = tap(q + vec2(texelSize.x, 0.0)) + tap(q - vec2(texelSize.x, 0.0)) + tap(q + vec2(0.0, texelSize.y)) + tap(q - vec2(0.0, texelSize.y));
      col = max(col + sharpen * (col - 0.25 * n), 0.0);
    }
  }
  if (split > 0.0) { col.r = tap(q + vec2(split, 0.0)).r; col.b = tap(q - vec2(split, 0.0)).b; }

  // Grade in display space (gamma 2.2 approximation), exposure + white balance in linear.
  col *= exposure * wb;
  vec3 g = pow(max(col, 0.0), vec3(1.0 / 2.2));
  g = gain * (g + lift * (1.0 - g));
  g = pow(max(g, 0.0), gammaInv);
  g = clamp((g - 0.5) * contrast + 0.5, 0.0, 1.0);
  g = mix(g, g * g * (3.0 - 2.0 * g), curve);
  float l = dot(g, vec3(0.2126, 0.7152, 0.0722));
  float chroma = max(g.r, max(g.g, g.b)) - min(g.r, min(g.g, g.b));
  g = mix(vec3(l), g, saturation * (1.0 + vibrance * (1.0 - chroma)));
  vec3 tone = l < 0.5 ? toneColor * (l * 2.0) : mix(toneColor, mix(toneColor, vec3(1.0), 0.6), l * 2.0 - 1.0); // highlights stay cream
  g = mix(g, tone, toneMix);
  g = mix(clamp(g, 0.0, 1.0), flash.rgb, flash.a);
  outputColor = vec4(pow(g, vec3(2.2)), inputColor.a);
}
`;

const U = (v) => new THREE.Uniform(v);
const srgb = new THREE.Color();
const display = (hex) => { srgb.set(hex); return [srgb.r, srgb.g, srgb.b].map((c) => Math.pow(c, 1 / 2.2)); }; // linear -> display

export class FinishingEffect extends Effect {
  constructor() {
    super('FinishingEffect', frag, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['exposure', U(1)], ['wb', U(new THREE.Vector3(1, 1, 1))], ['lift', U(new THREE.Vector3())],
        ['gammaInv', U(new THREE.Vector3(1, 1, 1))], ['gain', U(new THREE.Vector3(1, 1, 1))], ['contrast', U(1)],
        ['curve', U(0)], ['saturation', U(1)], ['vibrance', U(0)], ['toneColor', U(new THREE.Vector3(0.5, 0.5, 0.5))],
        ['toneMix', U(0)], ['sharpen', U(0)], ['flash', U(new THREE.Vector4())], ['xform', U(new THREE.Vector4(1, 0, 0, 0))],
        ['blurCenter', U(new THREE.Vector2(0.5, 0.5))], ['radialAmount', U(0)], ['dirBlur', U(new THREE.Vector3())],
        ['glitch', U(new THREE.Vector2())],
      ]),
    });
  }

  apply(post = {}) {
    const u = (k) => this.uniforms.get(k).value;
    const set = (k, v) => { this.uniforms.get(k).value = v; };
    const g = resolveGrade(post.grade);
    set('exposure', 2 ** g.exposure);
    const T = g.temperature, N = g.tint;
    const wb = [(1 + 0.15 * T) * (1 + 0.05 * N), (1 + 0.03 * T) * (1 - 0.08 * N), (1 - 0.15 * T) * (1 + 0.05 * N)];
    const lum = 0.2126 * wb[0] + 0.7152 * wb[1] + 0.0722 * wb[2];
    u('wb').set(wb[0] / lum, wb[1] / lum, wb[2] / lum);
    u('lift').set(...vec(g.lift));
    u('gammaInv').set(...vec(g.gamma).map((x) => 1 / Math.max(1e-3, x)));
    u('gain').set(...vec(g.gain));
    set('contrast', g.contrast); set('curve', g.curve); set('saturation', g.saturation); set('vibrance', g.vibrance);
    u('toneColor').set(...display(g.tone)); set('toneMix', g.toneMix);
    set('sharpen', post.sharpen ?? g.sharpen ?? (g.off ? 0 : HOUSE_SHARPEN));
    const f = post.flash;
    if (f?.alpha > 0) { const [r, gg, b] = display(f.color ?? '#ffffff'); u('flash').set(r, gg, b, Math.min(1, f.alpha)); } else u('flash').set(0, 0, 0, 0);
    const s = post.screen ?? {};
    u('xform').set(s.zoom ?? 1, THREE.MathUtils.degToRad(s.rotate ?? 0), s.offset?.[0] ?? 0, s.offset?.[1] ?? 0);
    set('radialAmount', post.radialBlur?.amount ?? 0);
    u('blurCenter').set(...(post.radialBlur?.center ?? [0.5, 0.5]));
    const db = post.dirBlur, a = THREE.MathUtils.degToRad(db?.angle ?? 0);
    u('dirBlur').set(db?.amount ?? 0, Math.cos(a), Math.sin(a));
    u('glitch').set(post.glitch?.amount ?? 0, post.glitch?.seed ?? 0);
  }
}

console.assert(Math.abs(combineGrade(resolveGrade({ saturation: 1 }), 'sepia', 0.5).saturation - 0.65) < 1e-9 && resolveGrade(false).saturation === 1, 'fx/finishing self-check failed');
