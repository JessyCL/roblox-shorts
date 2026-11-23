// WORLD module: set builder API `S`, Roblox materials, lighting looks, sky, terrain, water, clouds, props, generators.
//
// Productions build sets with S (all units studs, +Y up, colours = BrickColor names or #hex):
//   S.part({ shape: 'block'|'wedge'|'cornerwedge'|'cylinder'|'ball', size, pos, rot (deg), color, material, transparency,
//            reflectance, anchor: 'name', parent, batch, light: { range, brightness } })     -> Mesh (null when batch: true)
//     Roblox semantics: centred; cylinders run along X (diameter = min(size.y, size.z)); balls use min(size);
//     wedge = full height at +Z sloping down to -Z; cornerwedge apex above the (+X, +Z) corner.
//   S.group(name, { pivot, keys: { pos: [{t,v}], rot: [{t,v}] (deg) } }?, build?) -> Group (rotates/moves about pivot;
//     animate it from keys (global time) or shot.update via ctx.set.S.groups[name]). Parts built inside `build`
//     (or with { parent: group }) are batched per group, so a whole town can tilt as one rigid body.
//   S.anchor(name, pos) · S.model(id, { pos, rot, scale, color }) (assets/library manifest.jsonl ids)
//   S.ground({ material, color, size, y }) · S.terrain(opts) · S.water(opts) · S.heightAt(x, z)
//   S.clouds({ style: 'puffy' | 'soft', ... }) · S.sky({ zenith, horizon, clouds, ... }) · S.look(spec) (see looks.js)
//   S.light({ type: 'point'|'spot'|'surface', pos, color, brightness, range, angle, dir, part, face, auto }) -> handle
//   S.text({ text: string | (t) => string | [{ t, v }], pos/rot/size or part+face, font, color, glow, bg, lines })
//   generators: S.building, S.street, S.house, S.tree, S.fence, S.lampPost, S.sign, S.car, S.food, S.crowdSpots
//   library: await S.kit(name, opts) (environment kits -> { anchors }) · await S.prop(name, { pos, yaw, scale, name, ... })
//   S.shadowArea(center, radius) pins the sun's shadow frustum (default: fitted to the set; follows the camera on huge sets).
// Faces are named by axis: front = +Z (toward the default camera, like characters), back = -Z, right = +X, left = -X.
// Set-level time-driven things (look keys, group keys, text functions, cloud drift, water) use GLOBAL time t.
//
// Exports used by the director: createSetBuilder, applyLook(scene, look, renderer), lookPost(set, ctx), updateSet(set, ctx).
// Contract note: updateSet(set, ctx) is the per-frame hook (already called by director.js); it re-applies animated looks
// with ctx.lt for shot looks / ctx.t for set looks.
import * as THREE from 'three';
import { rng, sampleKeys, deg } from '../core/math.js';
import { toColor } from './palette.js';
import { getMaterial, materialName, MATERIALS, setRenderer, updateMaterials, adoptMaterial, NIGHT_GLOW, neonGain, NEON_GAIN } from './materials.js';
import { applyLook, applyResolved, resolveLook, lookPost, fitShadow, LOOKS } from './looks.js';
import { createTerrain, createWater, createClouds } from './nature.js';
import { createText } from './text.js';
import { loadModel, listModels } from './models.js';
import * as G from './generators.js';

export { applyLook, lookPost, resolveLook, LOOKS, MATERIALS, getMaterial, listModels };

// ---------- shared unit geometries ----------
function convex(faces) { // faces: arrays of [x,y,z] (CCW or not; fixed to point outward), flat normals
  const pts = faces.flat(), c = pts.reduce((a, p) => a.map((v, i) => v + p[i] / pts.length), [0, 0, 0]);
  const pos = [], nrm = [], uv = [];
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  for (let f of faces) {
    let n = cross(sub(f[1], f[0]), sub(f[2], f[0]));
    const fc = f.reduce((a, p) => a.map((v, i) => v + p[i] / f.length), [0, 0, 0]);
    if (n[0] * (fc[0] - c[0]) + n[1] * (fc[1] - c[1]) + n[2] * (fc[2] - c[2]) < 0) { f = [...f].reverse(); n = n.map((v) => -v); }
    const l = Math.hypot(...n);
    for (let i = 1; i < f.length - 1; i++) for (const p of [f[0], f[i], f[i + 1]]) { pos.push(...p); nrm.push(n[0] / l, n[1] / l, n[2] / l); uv.push(p[0] + 0.5, p[1] + 0.5); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
const h = 0.5;
export const GEO = {
  block: new THREE.BoxGeometry(1, 1, 1),
  wedge: convex([
    [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]], [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]],
    [[-h, -h, -h], [h, -h, -h], [h, h, h], [-h, h, h]], [[h, -h, -h], [h, -h, h], [h, h, h]], [[-h, -h, -h], [-h, -h, h], [-h, h, h]],
  ]),
  cornerwedge: convex([
    [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]], [[h, -h, -h], [h, -h, h], [h, h, h]], [[-h, -h, h], [h, -h, h], [h, h, h]],
    [[-h, -h, -h], [h, -h, -h], [h, h, h]], [[-h, -h, -h], [-h, -h, h], [h, h, h]],
  ]),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 28).rotateZ(Math.PI / 2),
  ball: new THREE.SphereGeometry(0.5, 28, 18),
};
const shapeScale = (shape, s) => shape === 'cylinder' ? [s[0], Math.min(s[1], s[2]), Math.min(s[1], s[2])]
  : shape === 'ball' ? Array(3).fill(Math.min(...s)) : s;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const vec = (a, d = [0, 0, 0]) => (a == null ? d : a.isVector3 ? [a.x, a.y, a.z] : a);

// ---------- builder ----------
export function createSetBuilder({ THREE: _T, renderer, scene, group, assets, setId } = {}) {
  setRenderer(renderer);
  const anchors = {}, groups = {}, texts = [], lights = [], clouds = [], waters = [], pending = [], animGroups = [];
  const batches = new Map();
  const stack = [{ parent: group, frame: new THREE.Matrix4() }];
  const top = () => stack[stack.length - 1];
  let lookSpec, lookOverrides = null, shadowPin = null, terrainHeight = null;
  const R = rng(`set:${setId ?? 'x'}`);

  const parentOf = (p) => (p ? p.userData?.inner ?? p : top().parent);
  // pos [x, y, z]; [x, z] = on the ground/terrain (S.heightAt). Non-finite input throws here (one NaN instance
  // would poison an instanced batch's bounding sphere and cull the whole batch).
  const pos3 = (p) => { p = vec(p); return p.length === 2 ? [p[0], S.heightAt(p[0], p[1]), p[1]] : p; };
  function matrixFor({ pos, rot, size = [1, 1, 1] }, what = 'part') {
    const P = pos3(pos), Rr = vec(rot);
    if (![...P, ...Rr, ...size].every(Number.isFinite) || P.length !== 3 || Rr.length !== 3 || size.length !== 3)
      throw new Error(`world: ${what} needs finite pos [x,y,z] or [x,z], rot [x,y,z], size [x,y,z]; got pos ${JSON.stringify(pos)} rot ${JSON.stringify(rot)} size ${JSON.stringify(size)}`);
    _e.set(...Rr.map(deg), 'XYZ');
    return new THREE.Matrix4().compose(_v.set(...P), _q.setFromEuler(_e), _s.set(...size)).premultiply(top().frame);
  }

  const S = {
    THREE, renderer, scene, root: group, anchors, groups, texts, lights, rng: R, setId,
    get currentLook() {
      if (!lookOverrides) return lookSpec;
      if (lookSpec == null) return { inherit: true, ...lookOverrides };
      const base = typeof lookSpec === 'object' ? lookSpec : typeof lookSpec === 'number' ? { clock: lookSpec } : { preset: lookSpec };
      return { ...base, ...lookOverrides, sky: { ...base.sky, ...lookOverrides.sky } };
    },

    part(o = {}) {
      const { shape = 'block', size = [4, 1, 2], material = 'Plastic', color, transparency = 0, reflectance = 0, batch = false, anchor, light } = o;
      if (!GEO[shape]) throw new Error(`world: unknown part shape "${shape}" (block, wedge, cornerwedge, cylinder, ball)`);
      const M = matrixFor({ pos: o.pos, rot: o.rot, size: shapeScale(shape, size) });
      const parent = parentOf(o.parent);
      const castShadow = o.castShadow ?? transparency < 0.5, glow = o.glow ?? 0;
      if (anchor) anchors[anchor] = new THREE.Vector3().setFromMatrixPosition(M).toArray();
      if (light) S.light({ type: 'point', ...light, pos: new THREE.Vector3().setFromMatrixPosition(M).toArray(), parent, color: light.color ?? color, raw: true });
      if (batch) {
        const key = `${parent.uuid}|${shape}|${materialName(material)}|${transparency}|${reflectance}|${castShadow}|${glow}|${o.emissive ?? ''}`;
        if (!batches.has(key)) batches.set(key, { shape, parent, castShadow, mat: getMaterial(material, null, { transparency, reflectance, instanced: true, glow, emissive: o.emissive }), M: [], C: [] });
        const b = batches.get(key);
        const ic = toColor(color ?? MATERIALS[materialName(material)][3]);
        if (materialName(material) === 'Neon') ic.multiplyScalar(neonGain(ic) / NEON_GAIN); // instance colours may exceed 1 (HDR)
        b.M.push(M); b.C.push(ic);
        return null;
      }
      const mesh = new THREE.Mesh(GEO[shape], getMaterial(material, color, { transparency, reflectance, glow, emissive: o.emissive }));
      M.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.castShadow = castShadow; mesh.receiveShadow = true;
      mesh.userData.part = { shape, size: shapeScale(shape, size), material: materialName(material) };
      parent.add(mesh);
      return mesh;
    },
    // Many parts sharing defaults: S.parts([{...}, ...], { material: 'Brick', batch: true })
    parts(list, defaults = {}) { return list.map((p) => S.part({ ...defaults, ...p })); },

    group(name, opts = {}, build) {
      if (typeof opts === 'function') { build = opts; opts = {}; }
      const pivot = S.toWorld(opts.pivot ?? [0, 0, 0]); // inside S.within (kits, props) the pivot follows the local frame
      const outer = new THREE.Group(), inner = new THREE.Group();
      outer.name = name; outer.position.set(...pivot); inner.position.set(-pivot[0], -pivot[1], -pivot[2]);
      outer.add(inner); outer.userData.inner = inner; outer.userData.pivot = pivot;
      parentOf(opts.parent).add(outer);
      if (name) groups[name] = outer;
      if (opts.keys) animGroups.push({ node: outer, keys: opts.keys, pivot });
      if (build) { stack.push({ parent: inner, frame: top().frame.clone() }); try { build(outer); } finally { stack.pop(); } }
      return outer;
    },
    // Local coordinate frame for generators: parts inside fn are placed relative to pos/yaw.
    within(pos, yaw, fn) {
      const p = pos3(pos);
      if (!p.every(Number.isFinite) || !Number.isFinite(yaw ?? 0)) throw new Error(`world: generator pos must be [x,y,z] or [x,z] (got ${JSON.stringify(pos)}, yaw ${yaw})`);
      const f = top().frame.clone().multiply(_m.compose(_v.set(...p), _q.setFromAxisAngle(_s.set(0, 1, 0), deg(yaw ?? 0)), _s.set(1, 1, 1)));
      stack.push({ parent: top().parent, frame: f });
      try { return fn(); } finally { stack.pop(); }
    },
    toWorld(p) { return new THREE.Vector3(...pos3(p)).applyMatrix4(top().frame).toArray(); },
    anchor(name, pos) { anchors[name] = S.toWorld(pos); return anchors[name]; },

    // Shared library (assets/library, see catalog.json / `node engine/cli/library.mjs list`):
    //   await S.kit(name, opts)  -> { anchors }  environment kit (assets/library/kits/<name>.js) built into this set
    //   await S.prop(name, opts) -> Group        procedural prop (assets/library/props/<name>.js) at opts.pos / yaw / scale,
    //                                            pivot = pos (animate it like any S.group; opts.name registers S.groups[name])
    async kit(name, opts = {}) {
      const mod = await importLibrary('kits', name);
      return (await mod.default(S, opts)) ?? { anchors: {} };
    },
    async prop(name, opts = {}) {
      const mod = await importLibrary('props', name);
      const p = opts.pos ?? [0, 0, 0];
      const g = S.group(opts.name ?? null, { pivot: p, keys: opts.keys }, () => S.within(p, opts.yaw ?? 0, () => mod.default(S, opts)));
      if (opts.scale != null) Array.isArray(opts.scale) ? g.scale.set(...opts.scale) : g.scale.setScalar(opts.scale);
      return g;
    },

    model(id, o = {}) {
      const holder = new THREE.Group();
      holder.name = `model:${id}`;
      matrixFor({ pos: o.pos, rot: o.rot, size: Array.isArray(o.scale) ? o.scale : Array(3).fill(o.scale ?? 1) }, `model ${id}`).decompose(holder.position, holder.quaternion, holder.scale);
      parentOf(o.parent).add(holder);
      pending.push(loadModel(id, o).then((obj) => holder.add(obj)));
      return holder;
    },

    ground(o = {}) {
      const { material = 'Grass', color, size = 2400, y = 0 } = o;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), getMaterial(material, color));
      m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
      m.userData.noShadowFit = true; m.name = 'ground';
      parentOf(o.parent).add(m);
      if (!terrainHeight) terrainHeight = () => y;
      return m;
    },
    terrain(o = {}) {
      const t = createTerrain(o);
      parentOf(o.parent).add(t.mesh);
      terrainHeight = t.heightAt;
      return t.mesh;
    },
    heightAt: (x, z) => (terrainHeight ? terrainHeight(x, z) : 0),
    water(o = {}) {
      const w = createWater({ ...o, heightAt: terrainHeight });
      parentOf(o.parent).add(w.mesh);
      waters.push(w);
      return w.mesh;
    },
    clouds(o = {}) {
      if ((o.style ?? 'puffy') === 'soft') {
        S.sky({ clouds: o.cover ?? 0.55, cloudScale: o.scale, cloudSpeed: o.speed, cloudColor: o.color, cloudShade: o.shade, cloudSoft: o.softness });
        return null;
      }
      const c = createClouds({ seed: setId, ...o });
      parentOf(o.parent).add(c.mesh);
      clouds.push(c);
      return c.mesh;
    },
    sky(o = {}) {
      const clean = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
      lookOverrides = { ...lookOverrides, sky: { ...lookOverrides?.sky, ...clean } };
    },
    look(spec) { lookSpec = spec; },
    shadowArea(center, radius) { shadowPin = { center: new THREE.Vector3(...vec(center)), radius }; },

    // Local lights are pooled per scene (fixed light count => no shader recompiles between sets). Returns a mutable
    // handle: productions may change handle.brightness / color / pos / enabled from shot.update.
    light(o = {}) {
      const type = o.type ?? 'point';
      let pos = vec(o.pos), dir = o.dir ? new THREE.Vector3(...o.dir).normalize() : new THREE.Vector3(0, -1, 0);
      if (o.part) { // surface light / light on a part face
        const p = o.part; p.updateMatrixWorld(true);
        const n = FACE_N[o.face ?? 'front'];
        dir = n.clone().applyQuaternion(p.quaternion).normalize();
        pos = new THREE.Vector3().copy(n).multiplyScalar(0.5).applyMatrix4(p.matrix).addScaledVector(dir, 0.1).toArray();
      } else if (!o.raw) pos = S.toWorld(pos);
      const hnd = {
        type: type === 'surface' ? 'spot' : type, pos: new THREE.Vector3(...pos), dir, color: toColor(o.color ?? '#ffd9a0'),
        brightness: o.brightness ?? 1, range: Math.min(o.range ?? 24, 120), angle: o.angle ?? (type === 'surface' ? 120 : 60),
        shadows: false, enabled: o.enabled ?? true, auto: o.auto ?? false, parent: parentOf(o.parent),
      };
      lights.push(hnd);
      return hnd;
    },

    text(o = {}) {
      const face = o.face ?? 'front';
      const t = createText({ ...o, size: o.size ?? (o.part ? FACE_DIMS[face].map((a) => [o.part.scale.x, o.part.scale.y, o.part.scale.z][a]) : [8, 2]) });
      if (o.part) placeOnPart(t.mesh, o.part, face, o.offset ?? 0.03);
      else matrixFor({ pos: o.pos, rot: o.rot }).decompose(t.mesh.position, t.mesh.quaternion, _s);
      (o.part ? o.part.parent : parentOf(o.parent)).add(t.mesh);
      if (t.dynamic) texts.push(t);
      return t.mesh;
    },

    async ready() {
      await Promise.all(pending);
      for (const b of batches.values()) {
        const im = new THREE.InstancedMesh(GEO[b.shape], b.mat, b.M.length);
        b.M.forEach((M, i) => { im.setMatrixAt(i, M); im.setColorAt(i, b.C[i]); });
        im.castShadow = b.castShadow; im.receiveShadow = true;
        im.computeBoundingSphere();
        b.parent.add(im);
      }
      batches.clear();
      group.updateMatrixWorld(true);
      // shadow-fit bounds: everything except ground/terrain/water/clouds
      const box = new THREE.Box3();
      group.traverse((o) => {
        if (o.userData.noShadowFit) return;
        if (o.isMesh && !hasFlag(o)) box.expandByObject(o);
      });
      const sphere = box.isEmpty() ? new THREE.Sphere(new THREE.Vector3(), 40) : box.getBoundingSphere(new THREE.Sphere());
      S._shadow = { sphere: { center: sphere.center, radius: Math.max(20, sphere.radius) }, box };
    },
    _state: { clouds, waters, animGroups, get shadowPin() { return shadowPin; } },
  };
  const hasFlag = (o) => { for (let p = o; p; p = p.parent) if (p.userData.noShadowFit) return true; return false; };
  // generators
  for (const [k, fn] of Object.entries(G)) if (typeof fn === 'function') S[k] = (...args) => fn(S, ...(args.length ? args : [{}]));
  (scene.userData.worldBuilders ??= []).push(S);
  return S;
}

// Library modules: /assets/library/<kind>/<name>.js; unknown names fail with the catalog's list of known ones.
async function importLibrary(kind, name) {
  if (!/^[a-z0-9_]+$/.test(name ?? '')) throw new Error(`world: ${kind.slice(0, -1)} name must be lowercase snake_case, got "${name}"`);
  try {
    return await import(`/assets/library/${kind}/${name}.js`);
  } catch (e) {
    const type = kind.slice(0, -1);
    const known = await fetch('/assets/library/catalog.json').then((r) => r.json()).then((c) => c.items.filter((x) => x.type === type).map((x) => x.id)).catch(() => []);
    if (known.length && !known.includes(name)) throw new Error(`world: unknown ${type} "${name}" (known: ${known.join(', ')})`);
    throw new Error(`world: ${type} "${name}" failed to load: ${e.message}`);
  }
}

const FACE_N = { front: new THREE.Vector3(0, 0, 1), back: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), left: new THREE.Vector3(-1, 0, 0), top: new THREE.Vector3(0, 1, 0), bottom: new THREE.Vector3(0, -1, 0) };
const FACE_ROT = { front: [0, 0, 0], back: [0, Math.PI, 0], right: [0, Math.PI / 2, 0], left: [0, -Math.PI / 2, 0], top: [-Math.PI / 2, 0, 0], bottom: [Math.PI / 2, 0, 0] };
const FACE_DIMS = { front: [0, 1], back: [0, 1], right: [2, 1], left: [2, 1], top: [0, 2], bottom: [0, 2] };
// SurfaceGui-like placement: a text plane sized to the part face (unless the text has its own size).
function placeOnPart(mesh, part, face, offset) {
  part.updateMatrix();
  const n = FACE_N[face], s = part.scale;
  const local = n.clone().multiply(s).multiplyScalar(0.5).addScaledVector(n, offset);
  mesh.position.copy(local.applyQuaternion(part.quaternion).add(part.position));
  mesh.quaternion.copy(part.quaternion).multiply(_q.setFromEuler(_e.set(...FACE_ROT[face])));
  if (!mesh.userData.explicitSize) { const [a, b] = FACE_DIMS[face], d = [s.x, s.y, s.z]; mesh.scale.set(d[a], d[b], 1); }
}

// ---------- per-frame ----------
function ensurePool(scene, st) {
  if (st.pool) return st.pool;
  let np = 0, ns = 0;
  for (const S of scene.userData.worldBuilders ?? []) {
    np = Math.max(np, S.lights.filter((l) => l.type === 'point').length);
    ns = Math.max(ns, S.lights.filter((l) => l.type === 'spot').length);
  }
  const pool = { point: [], spot: [] };
  for (let i = 0; i < Math.min(np, 12); i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 1); l.name = 'world:point'; pool.point.push(l); scene.add(l); }
  for (let i = 0; i < Math.min(ns, 6); i++) { const l = new THREE.SpotLight(0xffffff, 0, 10, 1, 0.35, 1); l.name = 'world:spot'; pool.spot.push(l); scene.add(l, l.target); }
  st.pool = pool;
  // Shadow frustum is fitted right before each scene render, with the camera actually used for the frame.
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, sc, camera, target) {
    prev?.call(this, renderer, sc, camera, target);
    const S = st.activeSet;
    if (!S?._shadow || !camera.isPerspectiveCamera) return;
    const pin = S._state.shadowPin, sph = S._shadow.sphere;
    if (pin) fitShadow(st, pin.center, pin.radius);
    else if (sph.radius <= 90) fitShadow(st, sph.center, sph.radius);
    else { // huge set: follow the camera (centre ~35 studs ahead, clamped to the set box)
      camera.getWorldDirection(_v);
      const c = camera.getWorldPosition(new THREE.Vector3()).addScaledVector(_v, 35);
      S._shadow.box.clampPoint(c, c);
      fitShadow(st, c, 60);
    }
  };
  return pool;
}

const _w = new THREE.Vector3(), ORIGIN = new THREE.Vector3();
function updateLights(S, st, ctx) {
  // over budget: keep the lights nearest the set's focus (static => deterministic for any frame order)
  const pool = ensurePool(ctx.scene, st), camPos = S._state.shadowPin?.center ?? S._shadow?.sphere.center ?? ORIGIN, k = st.L.lights;
  for (const type of ['point', 'spot']) {
    const slots = pool[type];
    let list = S.lights.filter((l) => l.type === type && l.enabled);
    if (list.length > slots.length) list = list.map((l) => [l, l.parent.localToWorld(_w.copy(l.pos)).distanceToSquared(camPos)]).sort((a, b) => a[1] - b[1]).slice(0, slots.length).map((a) => a[0]);
    slots.forEach((L, i) => {
      const h = list[i];
      if (!h) { L.intensity = 0; return; }
      h.parent.updateWorldMatrix(true, false);
      h.parent.localToWorld(L.position.copy(h.pos));
      L.color.copy(h.color);
      L.distance = h.range;
      L.intensity = h.brightness * 9 * (h.auto ? k : 1); // Roblox Brightness 1 ~ 9 cd with decay 1 (soft Roblox falloff)
      if (type === 'spot') {
        L.angle = Math.min(deg(h.angle) / 2, 1.5);
        L.target.position.copy(L.position).add(_w.copy(h.dir).transformDirection(h.parent.matrixWorld));
        L.target.updateMatrixWorld();
      }
    });
  }
}

function setLook(set, ctx) {
  const st = ctx.scene.userData.worldLook;
  const shotLook = ctx.shot?.look;
  const spec = shotLook ?? set.look ?? set.S?.currentLook ?? ctx.production?.look;
  const time = shotLook != null ? ctx.lt : ctx.t;
  const L = resolveLook(spec, time, ctx.production?.look ?? 'day');
  if (!st || st.L !== L) return applyResolved(ctx.scene, L, ctx.renderer);
  return st;
}

export function updateSet(set, ctx) {
  const S = set.S;
  const st = setLook(set, ctx);
  st.activeSet = S;
  st.skyMat.uniforms.time.value = ctx.t;
  updateMaterials(ctx.t);
  // foreign materials (characters, fx) get the height-fog uniforms before their first compile
  ctx.scene.traverseVisible((o) => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) adoptMaterial(x, ctx.renderer); });
  if (!S) return;
  for (const g of S._state.animGroups) {
    const p = sampleKeys(g.keys.pos, ctx.t), r = sampleKeys(g.keys.rot, ctx.t);
    if (p) g.node.position.set(...p);
    if (r) g.node.rotation.set(...r.map(deg));
  }
  for (const t of S.texts) t.update(ctx.t);
  for (const c of S._state.clouds) c.update(ctx.t, st.L);
  for (const w of S._state.waters) w.update(ctx.t);
  updateLights(S, st, ctx);
}

export { NIGHT_GLOW };
