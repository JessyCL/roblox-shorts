// Node tool (run once): converts CC0 animation clips into the characters module's semantic-pose JSON.
//   node engine/runtime/characters/tools/import-clips.mjs
// Sources (assets/_staging, CC0): Kenney Blocky Characters 2.0 (rigid 6-node rig, same part names and axes -> direct
// local-rotation copy) and Quaternius Universal Animation Library Standard (65-joint skeleton -> "aim" retarget:
// limb = direction upperarm->lowerarm / thigh->calf, torso/head = world rotation deltas, root = pelvis offset).
// Output: assets/library/characters/animations/{kenney-blocky,ual}.json (+ manifest.jsonl records, licenses/).
// Runtime clips appear as 'kenney.<name>' / 'ual.<name>' (anim.js registerClipLibrary). Channels are semantic degrees.
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const req = createRequire(path.join(ROOT, 'research/assets-scripts/package.json'));
const { NodeIO } = await import(pathToFileURL(req.resolve('@gltf-transform/core')).href);
const { ALL_EXTENSIONS } = await import(pathToFileURL(req.resolve('@gltf-transform/extensions')).href);
const io = () => new NodeIO().registerExtensions(ALL_EXTENSIONS);
const OUT = path.join(ROOT, 'assets/library/characters/animations');
fs.mkdirSync(OUT, { recursive: true });
const FPS = 30, R2D = 180 / Math.PI, r1 = (x) => Math.round(x * 10) / 10;

// sample a gltf-transform sampler at t (LINEAR / STEP; vec3 or quat)
function sample(sampler, t) {
  const inp = sampler.getInput().getArray(), out = sampler.getOutput().getArray(), n = sampler.getOutput().getElementSize();
  const get = (i) => Array.from(out.slice(i * n, i * n + n));
  if (t <= inp[0]) return get(0);
  if (t >= inp[inp.length - 1]) return get(inp.length - 1);
  let i = 0; while (inp[i + 1] < t) i++;
  const u = sampler.getInterpolation() === 'STEP' ? 0 : (t - inp[i]) / (inp[i + 1] - inp[i]), a = get(i), b = get(i + 1);
  if (n === 4) return new THREE.Quaternion(...a).slerp(new THREE.Quaternion(...b), u).toArray();
  return a.map((x, k) => x + (b[k] - x) * u);
}
const animDur = (a) => Math.max(...a.listChannels().map((c) => { const i = c.getSampler().getInput().getArray(); return i[i.length - 1]; }));
const eulerDeg = (q) => { const e = new THREE.Euler().setFromQuaternion(q, 'XYZ'); return [e.x * R2D, e.y * R2D, e.z * R2D]; };
// limb hanging down at rest -> semantic [fwd, side, twist] for a direction in the parent frame (mirrors anim.js aimLimb)
function aim(d, left) { d = d.clone().normalize(); const z = Math.asin(THREE.MathUtils.clamp(d.x, -1, 1)), x = Math.atan2(-d.z, -d.y); return [-x * R2D, z * R2D * (left ? 1 : -1), 0]; }
const limbSem = (q, left) => { const e = new THREE.Euler().setFromQuaternion(q, 'XYZ'); return [-e.x * R2D, e.z * R2D * (left ? 1 : -1), e.y * R2D * (left ? 1 : -1)]; };
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// ---------- Kenney Blocky ----------
async function kenney() {
  const file = path.join(ROOT, 'assets/_staging/kenney-blocky-characters/extracted/Models/GLB format/character-a.glb');
  const doc = await io().read(file);
  const nodes = Object.fromEntries(doc.getRoot().listNodes().map((n) => [n.getName(), n]));
  const hip = nodes['leg-left'].getTranslation()[1] || 0.5, scale = 2 / hip; // our leg = 2 studs
  const MAP = { torso: 'torso', head: 'head', 'arm-left': 'lArm', 'arm-right': 'rArm', 'leg-left': 'lLeg', 'leg-right': 'rLeg' };
  const clips = {};
  for (const a of doc.getRoot().listAnimations()) {
    const name = a.getName(), dur = Math.max(1 / FPS, animDur(a)), n = Math.round(dur * FPS) + 1;
    const ch = {};
    for (const c of a.listChannels()) ch[`${c.getTargetNode().getName()}.${c.getTargetPath()}`] = c.getSampler();
    const tracks = {};
    for (let f = 0; f < n; f++) {
      const t = f / FPS;
      for (const [node, key] of Object.entries(MAP)) {
        const s = ch[`${node}.rotation`]; if (!s) continue;
        const rest = new THREE.Quaternion(...nodes[node].getRotation()).invert();
        const q = rest.multiply(new THREE.Quaternion(...sample(s, t)));
        const v = key === 'torso' || key === 'head' ? eulerDeg(q) : limbSem(q, key[0] === 'l');
        (tracks[key] ??= []).push(...v.map(r1));
      }
      if (ch['root.translation']) { const p = sample(ch['root.translation'], t), r0 = nodes.root.getTranslation(); (tracks.off ??= []).push(...p.map((x, k) => Math.round((x - r0[k]) * scale * 100) / 100)); }
      if (ch['root.rotation']) (tracks.rot ??= []).push(...eulerDeg(new THREE.Quaternion(...sample(ch['root.rotation'], t))).map(r1));
    }
    const loop = /idle|walk|sprint|sit|drive|static|holding|wheelchair/.test(name) && !/shoot/.test(name);
    clips[name] = { fps: FPS, dur: +(dur).toFixed(4), loop, tracks };
  }
  return { file, clips };
}

// ---------- Quaternius UAL (aim retarget via FK) ----------
async function ual() {
  const file = path.join(ROOT, 'assets/_staging/quaternius-ual/extracted/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb');
  const doc = await io().read(file);
  const all = doc.getRoot().listNodes(), parent = new Map();
  for (const n of all) for (const c of n.listChildren()) parent.set(c, n);
  const byName = Object.fromEntries(all.map((n) => [n.getName(), n]));
  const need = ['pelvis', 'spine_03', 'Head', 'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'thigh_l', 'calf_l', 'thigh_r', 'calf_r', 'foot_l'];
  for (const k of need) if (!byName[k]) throw new Error(`UAL: missing bone ${k}`);
  function worldAt(chMap, t) {
    const memo = new Map();
    const W = (n) => {
      if (memo.has(n)) return memo.get(n);
      const tr = chMap.get(n) ?? {};
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...(tr.translation ? sample(tr.translation, t) : n.getTranslation())), new THREE.Quaternion(...(tr.rotation ? sample(tr.rotation, t) : n.getRotation())), new THREE.Vector3(...(tr.scale ? sample(tr.scale, t) : n.getScale())));
      const p = parent.get(n); if (p) m.premultiply(W(p));
      memo.set(n, m); return m;
    };
    const pos = (k) => new THREE.Vector3().setFromMatrixPosition(W(byName[k]));
    const rot = (k) => { const q = new THREE.Quaternion(); W(byName[k]).decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
    return { pos, rot };
  }
  const tpose = doc.getRoot().listAnimations().find((a) => a.getName() === 'A_TPose');
  const tposeMap = new Map(); for (const c of tpose?.listChannels() ?? []) { const nd = c.getTargetNode(); if (!tposeMap.has(nd)) tposeMap.set(nd, {}); tposeMap.get(nd)[c.getTargetPath()] = c.getSampler(); }
  const rest = worldAt(tposeMap, 0); // T-pose = upright neutral for pelvis/spine/head deltas
  const legLen = rest.pos('thigh_l').distanceTo(rest.pos('calf_l')) + rest.pos('calf_l').distanceTo(rest.pos('foot_l'));
  const scale = 2 / legLen;
  const restQ = Object.fromEntries(['pelvis', 'spine_03', 'Head'].map((k) => [k, rest.rot(k).invert()]));
  const pelvis0 = rest.pos('pelvis');
  const clips = {};
  for (const a of doc.getRoot().listAnimations()) {
    const name = a.getName(), dur = Math.max(1 / FPS, animDur(a)), n = Math.round(dur * FPS) + 1;
    const chMap = new Map();
    for (const c of a.listChannels()) { const nd = c.getTargetNode(); if (!chMap.has(nd)) chMap.set(nd, {}); chMap.get(nd)[c.getTargetPath()] = c.getSampler(); }
    const tracks = { off: [], rot: [], torso: [], head: [], lArm: [], rArm: [], lLeg: [], rLeg: [] };
    for (let f = 0; f < n; f++) {
      const w = worldAt(chMap, f / FPS);
      const dP = w.rot('pelvis').multiply(restQ.pelvis), dS = w.rot('spine_03').multiply(restQ.spine_03), dH = w.rot('Head').multiply(restQ.Head);
      const iP = dP.clone().invert(), iS = dS.clone().invert();
      tracks.rot.push(...eulerDeg(dP).map(r1));
      tracks.torso.push(...eulerDeg(iP.clone().multiply(dS)).map(r1));
      tracks.head.push(...eulerDeg(iS.clone().multiply(dH)).map(r1));
      const dir = (a2, b2) => w.pos(b2).sub(w.pos(a2));
      tracks.lArm.push(...aim(dir('upperarm_l', 'lowerarm_l').applyQuaternion(iS), true).map(r1));
      tracks.rArm.push(...aim(dir('upperarm_r', 'lowerarm_r').applyQuaternion(iS), false).map(r1));
      tracks.lLeg.push(...aim(dir('thigh_l', 'calf_l').applyQuaternion(iP), true).map(r1));
      tracks.rLeg.push(...aim(dir('thigh_r', 'calf_r').applyQuaternion(iP), false).map(r1));
      tracks.off.push(...w.pos('pelvis').sub(pelvis0).multiplyScalar(scale).toArray().map((x) => Math.round(x * 100) / 100));
    }
    clips[name] = { fps: FPS, dur: +dur.toFixed(4), loop: /loop|idle/i.test(name), tracks };
  }
  // the mannequin's relaxed stance holds arms/legs ~15 deg out; R6 limbs hang straight -> remove the idle side offset
  const idle = clips.Idle_Loop?.tracks;
  if (idle) for (const k of ['lArm', 'rArm', 'lLeg', 'rLeg']) { const o = idle[k][1]; for (const c of Object.values(clips)) for (let i = 1; i < c.tracks[k].length; i += 3) c.tracks[k][i] = r1(c.tracks[k][i] - o); }
  // its spine also leans ~20 deg forward in every clip relative to the T-pose; take the idle as the upright reference
  if (idle) for (const k of ['torso', 'head']) { const o = idle[k][0]; for (const c of Object.values(clips)) for (let i = 0; i < c.tracks[k].length; i += 3) c.tracks[k][i] = r1(c.tracks[k][i] - o); }
  delete clips.A_TPose;
  return { file, clips };
}

const manifest = path.join(ROOT, 'assets/library/manifest.jsonl');
const existing = fs.existsSync(manifest) ? fs.readFileSync(manifest, 'utf8') : '';
const records = [];
for (const [id, fn, outName, src] of [
  ['kenney.blocky.animations', kenney, 'kenney-blocky.json', { name: 'Kenney', pack: 'Blocky Characters 2.0', url: 'https://kenney.nl/assets/blocky-characters', attribution: 'Kenney (www.kenney.nl)', lic: 'kenney-blocky-characters/extracted/License.txt', how: 'local rotation copy (identical 6-node rig)' }],
  ['quaternius.ual.animations', ual, 'ual.json', { name: 'Quaternius', pack: 'Universal Animation Library Standard v3.0', url: 'https://quaternius.itch.io/universal-animation-library', attribution: 'Quaternius', lic: 'quaternius-ual/extracted/Universal Animation Library[Standard]/License.txt', how: 'aim retarget of upperarm/thigh directions, spine_03/Head deltas, pelvis offset (FK, 30 fps)' }],
]) {
  const { file, clips } = await fn();
  const out = path.join(OUT, outName);
  fs.writeFileSync(out, JSON.stringify({ source: src.pack, license: 'CC0-1.0', fps: FPS, clips }));
  fs.mkdirSync(path.join(ROOT, 'assets/library/licenses'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'assets/_staging', src.lic), path.join(ROOT, 'assets/library/licenses', outName.replace('.json', '.txt')));
  console.log(`${outName}: ${Object.keys(clips).length} clips, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  if (!existing.includes(`"id":"${id}"`)) records.push({
    id, kind: 'animation', category: 'animation/character', tags: ['animation', 'r6', 'character'], file: `characters/animations/${outName}`,
    units: 'stud', scaleApplied: 1, boundsStuds: null, pivot: 'bottom-center', forward: '+Z', tris: 0, materials: [], recolor: null,
    animations: Object.keys(clips), attachments: {}, rig: 'r6-blocky', clips: Object.entries(clips).map(([name, c]) => ({ name, duration: c.dur, loop: c.loop })),
    retargetedFrom: src.how,
    source: { name: src.name, pack: src.pack, url: src.url, file: path.relative(path.join(ROOT, 'assets/_staging'), file).split(path.sep).join('/'), downloaded: '2026-11-13', sha256: sha(file) },
    license: { id: 'CC0-1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', attributionRequired: false, attribution: src.attribution },
    recommendedUses: ['extra character clips (characters module: clip "' + (id.startsWith('kenney') ? 'kenney' : 'ual') + '.<name>")'], styleFit: 3, status: 'approved',
    notes: 'semantic-pose JSON generated by engine/runtime/characters/tools/import-clips.mjs',
  });
}
if (records.length) fs.appendFileSync(manifest, (existing.endsWith('\n') || !existing ? '' : '\n') + records.map((r) => JSON.stringify(r)).join('\n') + '\n');
