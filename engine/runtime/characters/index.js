// CHARACTERS module: original blocky 6-part avatars in the classic Roblox style.
//
// Exports (contract in engine/ARCHITECTURE.md):
//   createCharacter(spec, { THREE, assets }) -> { root, parts:{torso,head,lArm,rArm,lLeg,rLeg}, anchors:{head,face,hat,mouth,chest,back,
//       waist,hand_l,hand_r,feet}, setPose(nativePose), setExpression(name, blink?), dispose(), d (dims), scale, accessories }
//   animate(character, actorSpec, lt, ctx)  — evaluates at / yaw / face / lookAt / attach / anim for a shot (pure in lt)
//   crowd(opts) -> { root, update(lt) }       — instanced crowds for set builders (also usable as an actor: spec: { crowd: opts })
//   CLIPS, EXPRESSIONS, FACE_STYLES, SKIN, PRESETS, BUILDS, ANIMAL_KINDS (catalogues for production authors)
//
// Character spec (cast entry) — every field optional:
//   body: 'original' (default, our proportions) | 'classic' (R6-like 2x2x1 torso, 1x2x1 limbs)
//   build: 'normal'|'tall'|'child'|'heavy'|'slim'|'short' | { legY, torsoY, armY, w, torsoX, torsoZ, head }   (role through proportion)
//   scale: uniform (giants 30..100, baby 0.5) · height: target height in studs (overrides scale)
//   skin: SKIN name or hex (skinColor alias) · face: default expression · faceStyle: 'a'..'h' | {eyes,brows,mouth,glint,lashes,freckles,...}
//   shirt / pants: see clothing.js header (patterns: solid tshirt hoodie jacket zip suit hivis suspenders knit sweater cardigan plaid
//          stripes dress | plain jeans shorts skirt plaid cargo track overalls suit; shoes, belt, prints)
//   hair: style | { style, color } · hairColor · beard: 'beard'|'full'|'mustache' · hat: type | {type,color,color2}
//   acc: ['glasses', { type: 'goggles', on: 'eyes' }, 'backpack', ...] · hold: { r: 'phone', l: { type: 'sign', text: 'HI' } }
//   attach: ['cookie', { type: 'held_bell', key: 'bell' }] library attachments (assets/library/attachments.js: cookie jar needle
//          knitting held_bell held_boot boot_on_leg sewn_sleeve glow_eyes), toggled per shot with hide: [key]
//   label: 'FRAGILE' | { text, color, bg, border }  (chest plate) · detail: 'high'|'low' (texture density) · seed
//   hands: 'left' | 'right' | 'both' — visible blocky hands at the arm ends (default none, like classic avatars)
//   preset: 'lenny' — a library cast member (assets/library/cast/<id>.json, list: `node engine/cli/library.mjs list --type cast`);
//          other fields override it (object fields like shirt/pants/hair/crowd merge one level)
//   template: 'grandpa'|'grandpa_knit'|'grandma'|'noob'|'kid'|'baby'|'zombie'|'skeleton'|'vampire'|'ghost' (TEMPLATES; fields override)
//   animal: 'dog'|'puppy'|'wolf'|'tiger'|'cat'|'deer'|'owl'|'goose' (+ color, color2, collar) → blocky pet (animals.js)
//   crowd: { count, area|path, clip, speed, seed, lod: 'variant'|'pawn'|'dot', ... } → instanced crowd actor (crowd.js)
// actorSpec (per shot): see anim.js header. Extra: hide: ['sign'] hides accessories/props in this shot.
// Faces swap instantly on keys (no lip-sync, no blinks unless `blink: true`, per the style bible).
// Files: rig.js (proportions/geometry/pivots) · faces.js (decal faces) · clothing.js (shirt/pants atlas painter) ·
//   accessories.js (hair/hats/props/labels) · anim.js (clips + timeline) · crowd.js · animals.js · tools/import-clips.mjs (Node)
//
// Clip libraries imported from CC0 packs (Kenney Blocky Characters, Quaternius UAL) are loaded from
// /assets/library/characters/animations/*.json when present and appear as 'kenney.<clip>' / 'ual.<clip>'.
import * as THREE from 'three';
import { hashString } from '../core/math.js';
import { dimsFor, buildRig, applyNativePose, PRESETS, BUILDS } from './rig.js';
import { bodyTexture, skinColor, SKIN } from './clothing.js';
import { faceTexture, EXPRESSIONS, EXPRESSION_NAMES, FACE_STYLES, parseExpression } from './faces.js';
import { buildAccessories, addHands } from './accessories.js';
import { CLIPS, evaluateActor, toNative, registerClipLibrary } from './anim.js';
import { createCrowd } from './crowd.js';
import { createAnimal, ANIMAL_KINDS } from './animals.js';

export { CLIPS, EXPRESSIONS, EXPRESSION_NAMES, FACE_STYLES, SKIN, PRESETS, BUILDS, ANIMAL_KINDS };

// Reusable character templates (`template: 'grandpa'`; spec fields override, shirt/pants merge).
export const TEMPLATES = {
  grandpa: { body: 'classic', skin: 'light', faceStyle: 'c', face: 'content', hair: { style: 'balding', color: '#eeeeee' }, beard: { style: 'full', color: '#f4f4f4' }, shirt: { pattern: 'waistcoat', color: '#7a4a2a', inner: '#f4f1e8', tie: '#efe3c4' }, pants: { pattern: 'plain', color: '#5b4a3a' } },
  grandpa_knit: { body: 'classic', skin: 'light', faceStyle: 'c', face: 'smile', hair: { style: 'balding', color: '#eeeeee' }, beard: { style: 'full', color: '#f4f4f4' }, hat: { type: 'flatcap', color: '#8a8a8a' }, shirt: { pattern: 'cardigan', color: '#8a5a3a' }, pants: { pattern: 'plain', color: '#4a4038' } },
  grandma: { skin: 'light', faceStyle: 'b', face: 'smile', hair: { style: 'bun', color: '#e6e6e6' }, acc: ['glasses'], shirt: { pattern: 'cardigan', color: '#b07ac8' }, pants: { pattern: 'skirt', color: '#5a4a6a', length: 1.4 } },
  noob: { body: 'classic', skin: 'yellow', faceStyle: 'c', face: 'smile', shirt: { pattern: 'solid', color: '#0d69ac' }, pants: { color: '#a4bd47', shoes: false } },
  kid: { build: 'child', faceStyle: 'e', face: 'smile', hair: { style: 'messy', color: '#5a3720' }, shirt: { pattern: 'tshirt', color: '#2f6fd6', print: 'star' }, pants: { pattern: 'shorts', color: '#2f3e57' } },
  baby: { build: 'child', scale: 0.6, faceStyle: 'b', face: 'happy', hair: 'bald', shirt: { pattern: 'solid', color: '#9fd3ff', sleeves: 'short' }, pants: { pattern: 'shorts', color: '#ffffff', shoes: false } },
  zombie: { skin: '#7fae6a', faceStyle: 'a', face: 'zombie', hair: { style: 'messy', color: '#3a3a2a' }, shirt: { pattern: 'tshirt', color: '#6a6a7a', torn: true }, pants: { pattern: 'jeans', color: '#3a4a5a', torn: true }, defaultClip: 'zombie' },
  skeleton: { skin: '#f2f0e6', faceStyle: 'a', face: 'skull', hair: 'bald', shirt: { pattern: 'skeleton' }, pants: { pattern: 'skeleton', shoes: false } },
  vampire: { skin: '#e9e4f2', faceStyle: 'f', face: 'fangs', hair: { style: 'slicked', color: '#111111' }, shirt: { pattern: 'suit', color: '#151515', tie: '#a01020' }, acc: ['cape'] },
  ghost: { monster: 'ghost', skin: '#bff5e0', face: 'googly_shock', hair: 'bald', shirt: null, torsoColor: '#bff5e0', pants: { color: '#bff5e0', shoes: false }, defaultClip: 'float' },
};
function applyTemplate(spec) {
  const T = TEMPLATES[spec.template];
  if (!spec.template) return spec;
  if (!T) throw new Error(`characters: unknown template "${spec.template}" (known: ${Object.keys(TEMPLATES).join(', ')})`);
  const o = { ...T, ...spec };
  for (const k of ['shirt', 'pants']) if (T[k] && spec[k] !== undefined && spec[k] !== null && typeof spec[k] === 'object') o[k] = { ...T[k], ...spec[k] };
  return o;
}

const LIBS = [['kenney', 'kenney-blocky.json'], ['ual', 'ual.json']];
let libsLoaded = null;
function loadClipLibraries() {
  libsLoaded ??= Promise.all(LIBS.map(async ([prefix, file]) => {
    try {
      const res = await fetch(`/assets/library/characters/animations/${file}`);
      if (res.ok) registerClipLibrary(prefix, await res.json());
    } catch { /* optional library */ }
  }));
  return libsLoaded;
}

// Library cast presets: { preset: 'lenny', ...overrides } -> the preset's spec with overrides merged (plain objects one level).
const presetCache = new Map();
export async function resolvePreset(spec) {
  if (!spec?.preset) return spec;
  const { preset: id, ...over } = spec;
  if (!presetCache.has(id)) presetCache.set(id, fetch(`/assets/library/cast/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const file = await presetCache.get(id);
  if (!file?.spec) {
    const known = await fetch('/assets/library/catalog.json').then((r) => r.json()).then((c) => c.items.filter((x) => x.type === 'cast').map((x) => x.id)).catch(() => []);
    throw new Error(`characters: unknown cast preset "${id}" (known: ${known.join(', ') || 'see assets/library/cast/'})`);
  }
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const o = { ...file.spec };
  for (const [k, v] of Object.entries(over)) o[k] = isObj(v) && isObj(o[k]) ? { ...o[k], ...v } : v;
  return o;
}

export async function createCharacter(spec = {}) {
  await loadClipLibraries();
  spec = applyTemplate(await resolvePreset(spec));
  if (spec.crowd) return createCrowd(spec.crowd);
  if (spec.animal) return createAnimal(spec);
  const d = dimsFor(spec);
  const skin = skinColor(spec);
  const ppu = { high: 256, low: 96 }[spec.detail] ?? 192;
  const faceStyle = spec.faceStyle ?? 'a';
  const faceWidth = { high: 2048, low: 768 }[spec.detail] ?? 1536;
  const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTexture(spec, { ppu }), roughness: 0.62 });
  const headMat = new THREE.MeshStandardMaterial({ map: faceTexture({ head: d.head, skin, expr: spec.face ?? 'neutral', style: faceStyle, width: faceWidth }), roughness: 0.42 });
  const rig = buildRig(d, bodyMat, headMat);
  const accessories = buildAccessories(rig, d, spec);
  if (spec.hands) Object.assign(accessories, addHands(rig, d, spec.hands, skin)); // visible hands: 'left'|'right'|'both'
  if (spec.monster === 'ghost') { // translucent mint body with a tapered tail instead of legs
    for (const m of [bodyMat, headMat]) Object.assign(m, { transparent: true, opacity: spec.opacity ?? 0.55, depthWrite: false });
    rig.meshes.lLeg.visible = rig.meshes.rLeg.visible = false;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(d.torso[0] * 0.45, d.leg[1] * 1.3, 16).rotateX(Math.PI).translate(0, -d.leg[1] * 0.6, -0.15), bodyMat);
    tail.rotation.x = 0.35; rig.body.add(tail);
    for (const m of Object.values(rig.meshes)) m.castShadow = false;
  }
  const scale = spec.height ? spec.height / d.height : spec.scale ?? 1;
  rig.root.scale.setScalar(scale);
  const seed = spec.seed ?? hashString(JSON.stringify(spec));
  let current = '';
  const c = {
    kind: 'human', defaultClip: spec.defaultClip, root: rig.root, parts: rig.parts, anchors: rig.anchors, meshes: rig.meshes, d, scale, spec, seed,
    phase: ((seed >>> 0) % 1000) / 1000, accessories,
    setPose(p) { applyNativePose(rig, d, p); },
    setExpression(name = 'neutral', blink = false) {
      const key = name + (blink ? '|b' : '');
      if (key === current) return;
      parseExpression(name); // validates
      headMat.map = faceTexture({ head: d.head, skin, expr: name, style: faceStyle, blink, width: faceWidth });
      current = key;
    },
    dispose() { bodyMat.dispose(); headMat.dispose(); },
  };
  c.setExpression(spec.face ?? 'neutral');
  if (spec.attach) { // library attachments (assets/library/attachments.js): attach: ['cookie', { type: 'held_bell', key: 'bell' }]
    const { attach } = await import('/assets/library/attachments.js');
    for (const it of [].concat(spec.attach)) attach(THREE, c, it);
  }
  return c;
}

export function animate(c, spec = {}, lt = 0, ctx = {}) {
  if (c.kind === 'crowd') {
    const at = Array.isArray(spec.at) ? spec.at : [0, 0, 0];
    c.root.position.set(at[0], at[1], at[2]);
    c.root.rotation.y = ((spec.yaw ?? 0) * Math.PI) / 180;
    c.update(lt);
    return;
  }
  const r = evaluateActor(c, spec, lt, ctx);
  c.root.position.set(r.pos[0], r.pos[1], r.pos[2]);
  c.root.rotation.set(0, r.yaw, 0);
  const n = toNative(r.pose);
  if (r.pose.tail) n.tail = r.pose.tail.map((x) => (x * Math.PI) / 180);
  c.setPose(n);
  c.setExpression(r.expr, r.blink);
  if (c.accessories) for (const [k, o] of Object.entries(c.accessories)) o.visible = !spec.hide?.includes(k);
}

// Crowd helper for set builders / shot.update: returns { root, update(lt), agents }.
export function crowd(opts = {}) { return createCrowd(opts); }
