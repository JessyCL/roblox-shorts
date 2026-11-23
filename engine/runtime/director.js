// Timeline director: maps time t -> active shot, builds sets once, places/animates actors, evaluates camera and fx,
// and writes `post` (plain object read by pipeline.js every frame). Everything is a pure function of t.
import * as THREE from 'three';
import { clamp, rng } from './core/math.js';

const EPS = 1e-4;

export function validateProduction(p) {
  const err = (m) => { throw new Error(`production: ${m}`); };
  if (!p?.shots?.length) err('no shots');
  if (!p.sets) err('no sets');
  p.shots.forEach((s, i) => {
    if (!s.id) err(`shot ${i} has no id`);
    if (!(s.end > s.start)) err(`shot ${s.id}: end (${s.end}) must be > start (${s.start})`);
    if (!p.sets[s.set]) err(`shot ${s.id}: unknown set "${s.set}"`);
    if (i && Math.abs(s.start - p.shots[i - 1].end) > 1e-3) err(`shot ${s.id} starts at ${s.start} but previous ends at ${p.shots[i - 1].end} (shots must be contiguous)`);
    for (const id of Object.keys(s.actors ?? {})) if (!p.cast?.[id] && !s.actors[id].spec) err(`shot ${s.id}: actor "${id}" is not in cast and has no spec`);
  });
  if (Math.abs(p.shots[0].start) > 1e-3) err('first shot must start at 0');
  return p;
}

export async function createDirector(renderer, production, mods, { assets } = {}) {
  const P = validateProduction(production);
  const { world, characters, camera: cameraMod, fx } = mods;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, P.width / P.height, 0.1, 6000);
  scene.add(camera);
  const shots = P.shots;
  const duration = shots[shots.length - 1].end;

  // Sets: built once up front (asset loading is async), then only toggled.
  const sets = new Map();
  for (const [id, build] of Object.entries(P.sets)) {
    const group = new THREE.Group();
    group.name = `set:${id}`;
    group.visible = false;
    scene.add(group);
    const S = world.createSetBuilder({ THREE, renderer, scene, group, assets, setId: id });
    await build(S);
    await S.ready?.();
    sets.set(id, { id, group, S, anchors: S.anchors ?? {}, look: S.currentLook ?? P.look });
  }

  // Characters: cast created up front; per-shot extras (actors with `spec`) created lazily and cached by key.
  const actors = new Map();
  const getActor = async (key, spec) => {
    if (!actors.has(key)) {
      const c = await characters.createCharacter(spec, { THREE, assets });
      c.root.name = `actor:${key}`;
      c.root.visible = false;
      scene.add(c.root);
      actors.set(key, c);
    }
    return actors.get(key);
  };
  for (const [id, spec] of Object.entries(P.cast ?? {})) await getActor(id, spec);
  for (const s of shots) for (const [id, a] of Object.entries(s.actors ?? {})) if (a.spec) await getActor(`${s.id}/${id}`, a.spec);
  for (const s of shots) await s.prepare?.({ THREE, scene, characters, getActor, assets });

  const actorFor = (shot, id) => actors.get(shot.actors[id].spec ? `${shot.id}/${id}` : id);

  // Named anchor resolution: 'hero.head', 'hero' (root), 'set.door', [x,y,z], Vector3.
  const tmp = new THREE.Vector3();
  function resolve(ref, shot, out = new THREE.Vector3()) {
    if (ref == null) return null;
    if (ref.isVector3) return out.copy(ref);
    if (Array.isArray(ref)) return out.set(ref[0], ref[1], ref[2]);
    const [name, part = 'root'] = String(ref).split('.');
    if (name === 'set') {
      const a = sets.get(shot.set).anchors[part];
      if (!a) throw new Error(`shot ${shot.id}: unknown set anchor "${part}"`);
      return a.isObject3D ? a.getWorldPosition(out) : out.set(...a);
    }
    if (!shot.actors?.[name]) throw new Error(`shot ${shot.id}: unknown actor "${name}" in reference "${ref}"`);
    const c = actorFor(shot, name);
    const node = part === 'root' ? c.root : c.anchors[part] ?? c.parts[part];
    if (!node) throw new Error(`shot ${shot.id}: actor "${name}" has no anchor "${part}"`);
    c.root.updateMatrixWorld(true);
    return node.getWorldPosition(out);
  }

  let activeShot = null;
  const post = {};
  const ctx = { THREE, scene, camera, renderer, rng, actors: {}, set: null, shot: null, t: 0, lt: 0, resolve: null, production: P };

  function activate(shot) {
    for (const s of sets.values()) s.group.visible = s.id === shot.set;
    for (const c of actors.values()) c.root.visible = false;
    for (const id of Object.keys(shot.actors ?? {})) actorFor(shot, id).root.visible = true;
    const set = sets.get(shot.set);
    world.applyLook?.(scene, shot.look ?? set.look ?? P.look, renderer);
    ctx.set = set;
    ctx.shot = shot;
    ctx.actors = Object.fromEntries(Object.keys(shot.actors ?? {}).map((id) => [id, actorFor(shot, id)]));
    activeShot = shot;
  }

  function shotAt(t) {
    t = clamp(t, 0, duration - EPS);
    let lo = 0, hi = shots.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (shots[mid].start <= t) lo = mid; else hi = mid - 1; }
    return shots[lo];
  }

  // t: sample time; centre: frame-centre time that decides the shot (motion-blur sub-frames stay inside it).
  function setTime(t, centre = t) {
    const shot = shotAt(centre);
    if (shot !== activeShot) activate(shot);
    const st = clamp(t, shot.start, shot.end - EPS);
    const rawLt = st - shot.start;
    // Speed ramp / freeze (shot.time): actors, set and update use remapped time; camera and fx keep real time.
    const lt = shot.time && fx.remapTime ? fx.remapTime(shot.time, rawLt) : rawLt;
    const dur = shot.end - shot.start;
    Object.assign(ctx, { t: st, lt, rawLt, dur, resolve: (ref, out) => resolve(ref, shot, out) });

    world.updateSet?.(ctx.set, ctx);
    for (const [id, spec] of Object.entries(shot.actors ?? {})) characters.animate(ctx.actors[id], spec, lt, ctx);
    shot.update?.(ctx, lt);

    const cam = cameraMod.evaluateCamera(shot.camera ?? { move: 'static' }, rawLt, dur, ctx);
    camera.position.copy(cam.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(cam.target);
    if (cam.roll) camera.rotateZ(cam.roll);
    // near plane scales with the framing distance (0.1 for close-ups, up to 4 for aerials): depth precision on huge maps
    // is ~40x better, which removes z-flicker between nearby surfaces far from the camera. shot.camera.near overrides.
    const near = shot.camera?.near ?? Math.min(4, Math.max(0.1, cam.position.distanceTo(cam.target) * 0.02));
    if (camera.fov !== cam.fov || camera.near !== near) { camera.fov = cam.fov; camera.near = near; camera.updateProjectionMatrix(); }

    // post = look defaults <- shot.post <- fx (time-varying)
    for (const k of Object.keys(post)) delete post[k];
    Object.assign(post, world.lookPost?.(ctx.set, ctx) ?? {}, P.post ?? {}, shot.post ?? {});
    if (post.dof?.focus && !post.dof.focus.isVector3) post.dof = { ...post.dof, focus: resolve(post.dof.focus, shot, tmp.clone()) };
    fx.evaluateFx?.(shot.fx ?? [], rawLt, ctx, post);
  }

  return { scene, camera, renderer, post, setTime, shotAt, duration, shots, sets, actors, ctx };
}
