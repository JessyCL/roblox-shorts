// FX module: time-varying post parameters, 3D effect prefabs, particles, 2D overlays and the finishing shader.
//
//   evaluateFx(fxList, lt, ctx, post)  mutates `post` (called by the director after the camera is placed)
//   createFinishingEffect()            pmndrs Effect (grade/sharpen/flash/2D zoom-shake/blurs/glitch), see finishing.js
//   createOverlayPass({ width, height, director })  last pass: 2D stickers/bubbles/speed lines, see overlay.js
//   particles(parent, opts)            deterministic particle systems, see particles.js
//   remapTime(spec, lt)                speed ramp / freeze helper (needs a 2-line director hook, see below)
//
// A shot's fx list: [{ type, t (shot-local start, s), dur, ...params }]. `post` fields written here are read by
// pipeline.js (exposure, bloom, chromatic, vignette, grain) and by the finishing/overlay passes (grade, sharpen,
// flash, screen, radialBlur, dirBlur, glitch, overlays). Unknown types throw with the list of known types.
//
// Types:
//   flash | flash_white | flash_black   { color, alpha: 1, dur: 0.15, attack: 0 }       quick overlay, (1-u)^2 decay
//   fade | fade_black | fade_white      { dir: 'out' (to colour, default at shot end) | 'in', dur: 0.5, hold }
//                                       (S7 open: { type: 'fade_white', dir: 'in', hold: 0.28, dur: 0.82 })
//   zoom_punch { amount: 0.08, dur: 0.3 } bump | zoom_punch_in { amount: 0.25, dur: 0.25 } snap in + hold |
//   zoom_punch_out { amount: 0.3, dur: 0.25 } settle from zoomed                       (2D screen scale)
//   intro_zoom_blur { from: 1.6, blur: 0.35, roll: 0, dur: 0.13, blurDur }  S6 intro: 1.6x + radial blur -> 1.0 in
//                                       4 frames; S2 { roll: 15, dur: 0.27 }; S1 { from: 1.35, dur: 0.45, blurDur: 0.2 }
//   radial_blur { amount: 0.15, center, fade } | directional_blur { amount: 0.05, angle: 0, fade } |
//   blur_in { amount: 0.08, angle: 0, dur: 0.17 } decaying smear at a loop seam / editor whip transition
//   camera_shake_impact { amp: 0.025, rot: 1.2, freq: 16, decay: 0.15, dur: 0.6 } 2D screen shake | shake_2d (sustained)
//   color_grade_shift { keys: [{ t, preset?, ...gradeParams }] } or { from, to, t, dur }  | grade { preset, amount,
//   fade, ...params } | sepia { amount: 1 } | desaturate { amount: 1 } | vignette { darkness: 0.55, offset: 0.3 } |
//   chromatic_aberration { amount: 0.004, pulse } | glitch { amount: 0.6 } | bloom { amount: 0.6 }
//   glow_pulse { at: 'pacer.face', object: 'pacer.whistle', color: '#ff2a1a', dur: 0.45, light: 60, range: 16,
//                emissive: 4, flare: 0.6, sparkles: 5, puffs: 0, bloom: 0.8 }   S6 "whistle glow"
//   silhouette { target: 'lady', color: '#14100c', from: 1, to: 0, t, dur: 0.5, ease: 'outQuad' } or { amount: 0.9 }
//                                       Highlight-style flat fill overlay (S6 72 s reveal, 62-67 s dust figure)
//   particles { kind: 'dust_wall' | 'puff' | 'sparkle' | ... (particles.js TYPES), ...particle opts }
//   sparkles { at: 'hero.head', count: 6, dur: 0.5, area }    burst of 4-point stars at an anchor
//   draw_on { object: 'set.crack', dur: 0.15 }    reveals the object's children in order (neon line draw-on)
//   beam { from: 'hero.chest', to: [x,y,z], color: '#ffd23a', width: 0.35, intensity: 3, fade }  emissive ribbon
//   drop { object: 'set.crown', t, dur: 0.35, height: 14, ease: 'inQuad', dust: 8 }  group falls onto its rest position
//                                       (lands at t + dur) with a dust puff; don't also move it from shot.update
//   recipe { name, t, ...params }       named combos (fx/recipes.js): hand_reveal, bell_tolls, thunder_clap,
//                                       monster_entrance, drop_landing
//   overlays (2D, after grading): sticker | heart (❤️ pulse + rings) | x_stamp | bubble | speed_lines | stars |
//                                 path_draw | iris | ring   (fields in overlay.js; `dur` limits them, default whole shot)
//
// Speed ramp / freeze: `remapTime(shot.time, lt)` with shot.time = { speed: [{ t, rate }] } (piecewise-linear rate,
// integrated) or { freeze: [{ t, dur }] }. Director hook needed (not done here; see final report):
//   const rawLt = st - shot.start; const lt = fx.remapTime ? fx.remapTime(shot.time, rawLt) : rawLt;
//   ...actors/world/update use lt; camera + fx keep rawLt (camera keeps moving through a freeze); ctx.rawLt = rawLt.
import * as THREE from 'three';
import { clamp, ease, lerp, noise1, sampleKeys, hashString } from '../core/math.js';
import { FinishingEffect, combineGrade, resolveGrade, GRADE_PRESETS, NEUTRAL_GRADE } from './finishing.js';
import { particles, frameParticles, clock, TYPES as PARTICLE_TYPES } from './particles.js';
import { expandRecipes, RECIPES } from './recipes.js';

export { createOverlayPass } from './overlay.js';
export { particles, PARTICLE_TYPES, GRADE_PRESETS, RECIPES };
export const createFinishingEffect = () => new FinishingEffect();

// ---------- envelopes ----------
const local = (e, lt) => lt - (e.t ?? 0);
function pulseEnv(e, lt, dur, attack = 0) { // rise over attack, then (1-u)^2 decay
  const x = local(e, lt), at = e.attack ?? attack;
  if (x < 0 || x > dur) return 0;
  if (x < at) return x / at;
  return (1 - (x - at) / Math.max(1e-6, dur - at)) ** 2;
}
function windowEnv(e, lt, shotDur, fade = 0) { // plateau inside [t, t+dur] with linear fades
  const x = local(e, lt), len = e.dur ?? shotDur - (e.t ?? 0), f = e.fade ?? fade;
  if (x < 0 || x > len) return 0;
  return f > 0 ? Math.min(clamp(x / f), clamp((len - x) / f)) : 1;
}
const progress = (e, lt, dur, name = 'linear') => ease(e.ease ?? name)(clamp(local(e, lt) / dur));

// ---------- post helpers ----------
function screen(post, { zoom = 1, offset = [0, 0], rotate = 0 }) {
  const s = (post.screen = { zoom: 1, offset: [0, 0], rotate: 0, ...post.screen });
  s.zoom *= zoom; s.offset = [s.offset[0] + offset[0], s.offset[1] + offset[1]]; s.rotate += rotate;
}
function flash(post, color, alpha) { if (alpha > (post.flash?.alpha ?? 0)) post.flash = { color, alpha: clamp(alpha) }; }
const maxInto = (post, key, field, v) => { post[key] = { ...post[key], [field]: Math.max(post[key]?.[field] ?? 0, v) }; };

// ---------- scene-object helpers ----------
function objectRef(ref, ctx) {
  if (ref == null) return null;
  if (ref.isObject3D) return ref;
  if (typeof ref === 'function') return ref(ctx);
  const [name, part] = String(ref).split('.');
  if (name === 'set') {
    const a = ctx.set?.anchors?.[part];
    const o = a?.isObject3D ? a : ctx.set?.group?.getObjectByName(part);
    if (!o) throw new Error(`fx: set has no object/anchor named "${part}"`);
    return o;
  }
  const a = ctx.actors?.[name];
  if (!a) throw new Error(`fx: unknown actor "${name}" in "${ref}" (actors in shot: ${Object.keys(ctx.actors ?? {}).join(', ')})`);
  if (!part) return a.root;
  const o = a.parts?.[part] ?? a.anchors?.[part] ?? a.accessories?.[part] ?? a.root.getObjectByName(part); // accessories: 'hero.hand_l_mesh', 'pip.cookie'
  if (!o) throw new Error(`fx: actor "${name}" has no part/anchor/object "${part}"`);
  return o;
}
// Highlight-style overlay meshes: a child per mesh sharing its geometry, drawn on top (depth LessEqual + offset).
function overlayMeshes(root, mat) {
  const out = [];
  const meshes = [];
  root.traverse((m) => { if (m.isMesh && !m.isInstancedMesh && !m.userData.fxOverlay && !m.name.startsWith('fx:')) meshes.push(m); });
  for (const m of meshes) {
    const o = new THREE.Mesh(m.geometry, mat);
    o.userData.fxOverlay = true;
    o.name = 'fx:overlay';
    o.renderOrder = 3;
    o.raycast = () => {};
    m.add(o);
    out.push(o);
  }
  return out;
}
const overlayMat = (params) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, ...params });
const setVisible = (list, v) => { for (const o of list) o.visible = v; };

// Per-entry persistent state (lazily created scene objects). Entries not in the active shot get off() each frame.
const states = new Map();
function stateFor(e, make) {
  let s = states.get(e);
  if (!s) { s = make(); states.set(e, s); }
  return s;
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
let softDot = null;
const dotTexture = () => softDot ??= (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// ---------- handlers: (entry, lt, ctx, post, shotDur) ----------
const H = {
  flash: (e, lt, ctx, post) => flash(post, e.color ?? '#ffffff', (e.alpha ?? 1) * pulseEnv(e, lt, e.dur ?? 0.15)),
  flash_white: (e, ...a) => H.flash({ color: '#ffffff', ...e }, ...a),
  flash_black: (e, ...a) => H.flash({ color: '#000000', ...e }, ...a),
  fade: (e, lt, ctx, post, D) => {
    const dur = e.dur ?? 0.5, dirIn = e.dir === 'in', hold = e.hold ?? 0;
    const t0 = e.t ?? (dirIn ? 0 : D - dur);
    const u = ease(e.ease ?? (dirIn ? 'inOutSine' : 'inOutSine'))(clamp((lt - t0 - (dirIn ? hold : 0)) / dur));
    flash(post, e.color ?? '#000000', (e.alpha ?? 1) * (dirIn ? 1 - u : u));
  },
  fade_black: (e, ...a) => H.fade({ color: '#000000', ...e }, ...a),
  fade_white: (e, ...a) => H.fade({ color: '#ffffff', ...e }, ...a),

  zoom_punch: (e, lt, ctx, post) => {
    const u = clamp(local(e, lt) / (e.dur ?? 0.3));
    const bump = u <= 0 || u >= 1 ? 0 : u < 0.3 ? ease('outCubic')(u / 0.3) : 1 - ease('inOutSine')((u - 0.3) / 0.7);
    screen(post, { zoom: 1 + (e.amount ?? 0.08) * bump });
  },
  zoom_punch_in: (e, lt, ctx, post) => screen(post, { zoom: 1 + (e.amount ?? 0.25) * progress(e, lt, e.dur ?? 0.25, 'outCubic') }),
  zoom_punch_out: (e, lt, ctx, post) => screen(post, { zoom: 1 + (e.amount ?? 0.3) * (1 - progress(e, lt, e.dur ?? 0.25, 'outCubic')) }),
  intro_zoom_blur: (e, lt, ctx, post) => {
    const x = local(e, lt), dur = e.dur ?? 0.13;
    if (x < 0 || x >= dur) return;
    const u = ease(e.ease ?? 'outCubic')(x / dur);
    screen(post, { zoom: lerp(e.from ?? 1.6, 1, u), rotate: (e.roll ?? 0) * (1 - u) });
    maxInto(post, 'radialBlur', 'amount', (e.blur ?? 0.35) * (1 - ease('outQuad')(clamp(x / (e.blurDur ?? dur)))));
  },
  radial_blur: (e, lt, ctx, post, D) => {
    const k = windowEnv(e, lt, D, 0.05) * (e.amount ?? 0.15);
    if (k > 0) post.radialBlur = { amount: Math.max(post.radialBlur?.amount ?? 0, k), center: e.center ?? post.radialBlur?.center };
  },
  directional_blur: (e, lt, ctx, post, D) => {
    const k = windowEnv(e, lt, D, 0.03) * (e.amount ?? 0.05);
    if (k > (post.dirBlur?.amount ?? 0)) post.dirBlur = { amount: k, angle: e.angle ?? 0 };
  },
  blur_in: (e, lt, ctx, post) => {
    const k = (e.amount ?? 0.08) * (1 - progress(e, lt, e.dur ?? 0.17, 'outQuad')) * (local(e, lt) >= 0 ? 1 : 0);
    if (k > (post.dirBlur?.amount ?? 0)) post.dirBlur = { amount: k, angle: e.angle ?? 0 };
  },
  camera_shake_impact: (e, lt, ctx, post) => {
    const x = local(e, lt), dur = e.dur ?? 0.6;
    if (x < 0 || x > dur) return;
    const env = Math.min(1, x / 0.015) * (Number.isFinite(e.decay ?? 0.15) ? Math.exp(-x / (e.decay ?? 0.15)) : 1) * clamp((dur - x) / 0.05);
    const seed = hashString(`${ctx.shot?.id}:${e.t ?? 0}`), f = e.freq ?? 16, amp = (e.amp ?? 0.025) * env;
    screen(post, { zoom: 1 + 2.2 * amp, offset: [amp * noise1(x * f, seed), amp * noise1(x * f, seed + 9) * 0.5625], rotate: (e.rot ?? 1.2) * env * noise1(x * f * 0.8, seed + 17) });
  },
  shake_2d: (e, ...a) => H.camera_shake_impact({ decay: Infinity, amp: 0.008, rot: 0.4, freq: 6, dur: 1e9, ...e }, ...a),

  color_grade_shift: (e, lt, ctx, post) => {
    const keys = e.keys ?? [{ t: e.t ?? 0, ...e.from }, { t: (e.t ?? 0) + (e.dur ?? 1), ...e.to }];
    const layer = ({ t, ease: _, preset, amount = 1, ...p }) => combineGrade(combineGrade({ ...NEUTRAL_GRADE }, preset ?? {}, amount), p, 1);
    let i = 0;
    while (i < keys.length - 1 && lt >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const u = ease(b.ease ?? e.ease ?? 'inOutSine')(clamp((lt - a.t) / Math.max(1e-6, b.t - a.t)));
    const A = layer(a), B = layer(b), v3 = (x) => (Array.isArray(x) ? x : [x, x, x]), L = {};
    for (const f of Object.keys(NEUTRAL_GRADE)) {
      L[f] = f === 'tone' ? (u < 0.5 ? A.tone : B.tone) : Array.isArray(A[f]) || Array.isArray(B[f]) ? v3(A[f]).map((x, j) => lerp(x, v3(B[f])[j], u)) : lerp(A[f], B[f], u);
    }
    if (!A.toneMix && !B.toneMix) { delete L.tone; delete L.toneMix; } // untoned keys keep an existing sepia tone
    post.grade = combineGrade(post.grade, L, 1);
  },
  grade: (e, lt, ctx, post, D) => {
    const { type, t, dur, fade, amount = 1, preset, ...params } = e;
    const k = windowEnv(e, lt, D, 0) * amount;
    if (preset) post.grade = combineGrade(post.grade, preset, k);
    if (Object.keys(params).length) post.grade = combineGrade(post.grade, params, k);
  },
  sepia: (e, lt, ctx, post, D) => { post.grade = combineGrade(post.grade, 'sepia', (e.amount ?? 1) * windowEnv(e, lt, D)); },
  desaturate: (e, lt, ctx, post, D) => { post.grade = combineGrade(post.grade, { saturation: 1 - (e.amount ?? 1) }, windowEnv(e, lt, D, 0.2)); },
  vignette: (e, lt, ctx, post, D) => {
    const k = windowEnv(e, lt, D, e.fade ?? 0);
    post.vignette = { offset: lerp(post.vignette?.offset ?? 0.35, e.offset ?? 0.3, k), darkness: lerp(post.vignette?.darkness ?? 0.35, e.darkness ?? 0.55, k) };
  },
  chromatic_aberration: (e, lt, ctx, post, D) => { post.chromatic = (post.chromatic ?? 0) + (e.amount ?? 0.004) * (e.pulse ? pulseEnv(e, lt, e.dur ?? 0.3) : windowEnv(e, lt, D, 0.05)); },
  glitch: (e, lt, ctx, post, D) => {
    const f = Math.floor(lt * 30), k = windowEnv(e, lt, D) * (e.amount ?? 0.6) * (((f * 2654435761) >>> 0) % 7 < 4 ? 1 : 0.25);
    if (k > 0) { post.glitch = { amount: k, seed: f % 97 }; post.chromatic = (post.chromatic ?? 0) + 0.004 * k; }
  },
  bloom: (e, lt, ctx, post, D) => { post.bloom = { ...post.bloom, intensity: (post.bloom?.intensity ?? 0.4) + (e.amount ?? 0.6) * windowEnv(e, lt, D, 0.1) }; },

  glow_pulse: (e, lt, ctx, post) => {
    const dur = e.dur ?? 0.45, k = pulseEnv(e, lt, dur, 0.03);
    const color = new THREE.Color(e.color ?? '#ff2a1a');
    const S = stateFor(e, () => {
      const st = { objs: [], over: [] };
      if (e.light !== false) { st.light = new THREE.PointLight(color, 0, e.range ?? 16, 2); st.light.name = 'fx:glow-light'; ctx.scene.add(st.light); st.objs.push(st.light); }
      if (e.flare !== false) {
        st.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        st.flare.name = 'fx:glow-flare'; st.flare.renderOrder = 4; ctx.scene.add(st.flare); st.objs.push(st.flare);
      }
      if (e.object) { st.mat = overlayMat({ color: 0x000000, blending: THREE.AdditiveBlending }); st.over = overlayMeshes(objectRef(e.object, ctx), st.mat); }
      if (e.sparkles !== 0 && e.sparkles !== false) st.objs.push(particles(ctx.scene, { type: 'sparkle', count: e.sparkles ?? 5, bursts: [(e.t ?? 0) + 0.02], life: dur * 0.8, area: [1.2, 1.2, 1.2], follow: e.at ?? e.object, seed: hashString(`spk${e.t}`) }));
      if (e.puffs) st.objs.push(particles(ctx.scene, { type: 'glow_puffs', count: e.puffs, bursts: [e.t ?? 0], color: e.color ?? '#ffd84a', follow: e.at ?? e.object, seed: hashString(`gp${e.t}`) }));
      st.off = () => { setVisible(st.objs, false); setVisible(st.over, false); };
      return st;
    });
    const on = k > 0.001;
    setVisible(S.objs, on); setVisible(S.over, on);
    if (!on) return;
    const at = e.at ? ctx.resolve(e.at, _v) : objectRef(e.object, ctx).getWorldPosition(_v);
    if (S.light) { S.light.position.copy(at); S.light.intensity = (e.light ?? 60) * k; }
    if (S.flare) { S.flare.position.copy(at); S.flare.scale.setScalar((e.flare ?? 0.6) * (0.5 + 0.5 * k)); S.flare.material.color.copy(color).lerp(new THREE.Color(1, 1, 1), 0.5).multiplyScalar(3 * k); }
    if (S.mat) S.mat.color.copy(color).multiplyScalar((e.emissive ?? 4) * k);
    post.bloom = { ...post.bloom, intensity: (post.bloom?.intensity ?? 0.4) + (e.bloom ?? 0.8) * k };
  },
  silhouette: (e, lt, ctx, post) => {
    const amount = e.amount ?? lerp(e.from ?? 1, e.to ?? 0, progress(e, lt, e.dur ?? 0.5, 'outQuad'));
    const S = stateFor(e, () => {
      const st = { mat: overlayMat({ color: new THREE.Color(e.color ?? '#14100c'), fog: true }) };
      st.over = overlayMeshes(objectRef(e.target, ctx), st.mat);
      st.off = () => setVisible(st.over, false);
      return st;
    });
    setVisible(S.over, amount > 0.002);
    S.mat.opacity = clamp(amount);
  },
  particles: (e, lt, ctx) => {
    const S = stateFor(e, () => {
      const { type, kind, ...o } = e;
      const st = { sys: particles(ctx.scene, { ...o, type: kind }) };
      st.off = () => { st.sys.visible = false; };
      return st;
    });
    S.sys.visible = true;
  },
  sparkles: (e, ...a) => H.particles({ kind: 'sparkle', count: e.count ?? 6, bursts: [e.t ?? 0], life: e.dur ?? 0.5, follow: e.at, area: e.area ?? [1.5, 1.5, 1.5], ...e }, ...a),
  drop: (e, lt, ctx) => {
    const dur = e.dur ?? 0.35;
    const S = stateFor(e, () => {
      const obj = objectRef(e.object, ctx), st = { obj, rest: obj.position.clone() };
      if (e.dust !== 0) {
        const at = e.at ? ctx.resolve(e.at, new THREE.Vector3()) : obj.getWorldPosition(new THREE.Vector3());
        st.dust = particles(ctx.scene, { type: 'puff', count: e.dust ?? 8, bursts: [(e.t ?? 0) + dur], pos: [at.x, at.y + 0.2, at.z], seed: hashString(`drop:${e.object}:${e.t}`) });
      }
      st.off = () => { st.obj.position.copy(st.rest); if (st.dust) st.dust.visible = false; };
      return st;
    });
    const u = progress(e, lt, dur, 'inQuad');
    S.obj.position.copy(S.rest);
    S.obj.position.y += (e.height ?? 14) * (1 - u);
    if (S.dust) S.dust.visible = true;
  },
  draw_on: (e, lt, ctx) => {
    const S = stateFor(e, () => { const st = { obj: objectRef(e.object, ctx) }; st.off = () => st.obj.children.forEach((c) => { c.visible = true; }); return st; });
    const kids = S.obj.children, n = Math.ceil(kids.length * progress(e, lt, e.dur ?? 0.15));
    kids.forEach((c, i) => { c.visible = i < n; });
  },
  beam: (e, lt, ctx, post, D) => {
    const S = stateFor(e, () => {
      const geo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
      const mk = (c, o) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      const st = { core: mk(0xffffff, 1), glow: mk(new THREE.Color(e.color ?? '#ffd23a'), 0.6) };
      st.core.name = st.glow.name = 'fx:beam';
      ctx.scene.add(st.core, st.glow);
      st.off = () => { st.core.visible = st.glow.visible = false; };
      return st;
    });
    const k = windowEnv(e, lt, D, e.fade ?? 0.1);
    S.core.visible = S.glow.visible = k > 0.001;
    if (!S.core.visible) return;
    const A = ctx.resolve(e.from, _v), B = ctx.resolve(e.to, _w), len = A.distanceTo(B), w = e.width ?? 0.35;
    const flick = 0.85 + 0.15 * noise1(lt * 12, 3);
    for (const [m, r, c] of [[S.core, 0.35, new THREE.Color(1, 1, 1)], [S.glow, 1, new THREE.Color(e.color ?? '#ffd23a')]]) {
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      m.scale.set(w * r * 0.5, len, w * r * 0.5);
      m.material.color.copy(c).multiplyScalar((e.intensity ?? 3) * k * flick);
    }
  },
};
// 2D overlay items (drawn by overlay.js after grading).
const OVERLAYS = ['sticker', 'x_stamp', 'bubble', 'speed_lines', 'stars', 'path_draw', 'iris', 'ring'];
for (const kind of OVERLAYS) {
  H[kind] = (e, lt, ctx, post) => {
    const x = local(e, lt);
    if (x < 0 || (e.dur != null && x > e.dur)) return;
    (post.overlays ??= []).push({ ...e, kind, x });
    if (kind === 'x_stamp' && x < 0.15) screen(post, { rotate: (e.jolt ?? 0.8) * Math.exp(-x / 0.05) * Math.sin(x * 60) }); // 0.5-1 deg roll jolt
  };
}
H.heart = (e, lt, ...a) => { // S10 heart pulse: emoji pulsing at ~2 Hz with rings 0 -> 60 % W every 0.5 s
  if (e.rings !== false) H.ring({ pos: e.pos, t: e.t, dur: e.dur, size: 0.6, period: 0.5, color: '#ff5a7a', ...e.rings, type: 'ring' }, lt, ...a);
  H.sticker({ emoji: '❤️', pulse: { freq: 2, amount: 0.1 }, ...e }, lt, ...a);
};
export const FX_TYPES = Object.keys(H);

// ---------- main entry ----------
export function evaluateFx(list = [], lt, ctx, post) {
  list = expandRecipes(list);
  clock.t = ctx.t; clock.lt = ctx.lt ?? lt;
  post.grade = resolveGrade(post.grade);
  const D = ctx.dur ?? (ctx.shot ? ctx.shot.end - ctx.shot.start : 1e9);
  const active = new Set(list);
  for (const [e, s] of states) if (!active.has(e)) s.off?.();
  for (const e of list) {
    const h = H[e.type];
    if (!h) throw new Error(`fx: unknown type "${e.type}" in shot ${ctx.shot?.id} (known: ${FX_TYPES.join(', ')})`);
    h(e, lt, ctx, post, D);
  }
  frameParticles(ctx);
}

// ---------- time remap ----------
export function remapTime(spec, lt) {
  if (!spec) return lt;
  let keys = spec.keys ?? spec.speed;
  if (spec.freeze) {
    keys = [{ t: 0, rate: 1 }];
    for (const f of [].concat(spec.freeze)) keys.push({ t: f.t, rate: 1 }, { t: f.t + 1e-4, rate: 0 }, { t: f.t + f.dur, rate: 0 }, { t: f.t + f.dur + 1e-4, rate: 1 });
  }
  if (!keys?.length) return lt;
  const K = keys.map((k) => ({ t: k.t, v: k.rate, ease: 'linear' }));
  const ts = [0, ...keys.map((k) => k.t).filter((t) => t > 0 && t < lt), lt];
  let acc = 0;
  for (let i = 0; i + 1 < ts.length; i++) acc += ((sampleKeys(K, ts[i]) + sampleKeys(K, ts[i + 1])) / 2) * (ts[i + 1] - ts[i]);
  return acc;
}

console.assert(Math.abs(remapTime({ freeze: { t: 1, dur: 0.5 } }, 2) - 1.5) < 1e-3 && Math.abs(remapTime({ speed: [{ t: 0, rate: 0.5 }] }, 2) - 1) < 1e-9, 'fx remapTime self-check failed');
