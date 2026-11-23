// Shared library helper (browser only): THE GIANT of "The Ropes" - blocky, wet grey stone skin with cracks, heavy brow,
// huge deep-set eyes with small glowing amber pupils, a too-wide grin of long ladder teeth (some outside the lips), long
// thin fingers with boulder knuckles. Built with the _matkit part kit (X). Two builders share one head:
//   buildHead(X, S, { pos: [x,y,z] neck, prefix, eyeStyle: 'red' (glowing red iris + slit pupil) }) -> head rig (eyes, lids, grin covers, jaw) + setPose(p, t)
//   buildGiant(X, S, { pos: [x, z], cloudY, prefix, sleepers, villageRopes, mom, hole }) -> full seated giant with the
//     rope hand, hanging sleepers, village ropes, Toby's rope; returns api { set(p), apply(p), anchors, ... }.
// The giant always faces +Z (no yaw): joint rotations are about world axes.
// Pose params (all optional, a missing value = default): eyeL, eyeR (lid open 0 closed .. 0.5 half .. 1 wide; default 0.55),
//   look: [x, y] (-1..1 pupil aim) | lookAt: [x,y,z], grin 0..1 (corners tear wider), jaw 0..1, click 0..1 (teeth chatter),
//   breath 0..1 (default 1), head: [pitchDeg, yawDeg] extra, curl 0..1 (fingers close), stir 0..1 (fingers twitch),
//   untie (float: floor = knots undone, fraction = the next one sliding off and falling), mayor 0..1 (last knot slips),
//   village 0..1 (share of village ropes still in the fingers), swing 0..1 (sleepers sway, default 1), t (seconds).
import * as THREE from 'three';
import { rng, hash1 } from '../../../engine/runtime/core/math.js';
import { ropeField, heroRope } from '../props/rope.js';
import { cloudTopY } from './_cloud.js';

const D2R = Math.PI / 180;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
const SKIN = '#868b92', SKIN_D = '#6c727b', LIP = '#4a3a44';
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4();
const ZAX = new THREE.Vector3(0, 0, 1);

// box from a to b (long axis), thickness [w, h]
function limb(X, mat, a, b, w, h, color, extra = {}) {
  const d = _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
  _q.setFromUnitVectors(ZAX, d.normalize()); _e.setFromQuaternion(_q, 'XYZ');
  X.p({ mat, size: [w, h, L], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [_e.x / D2R, _e.y / D2R, _e.z / D2R], color, ...extra });
}
const rot = (p, piv, a) => { // rotate point p about X through pivot (forward hunch)
  const y = p[1] - piv[1], z = p[2] - piv[2], c = Math.cos(a), s = Math.sin(a);
  return [p[0], piv[1] + y * c - z * s, piv[2] + y * s + z * c];
};

// ======================================================================================== HEAD
// Head local frame (built at `pos` = neck top): x +-56, chin y -16, crown y ~126, face plane z F = 50, brow/nose to ~64.
export function buildHead(X, S, o = {}) {
  const P = o.prefix ?? 'giant', F = 50, r = rng(`${P}:head`);
  const [px, py, pz] = o.pos ?? [0, 0, 0];
  const W = (x, y, z) => [px + x, py + y, pz + z];
  const box = (mat, x0, x1, y0, y1, z0, z1, color, ex = {}) => X.p({ mat, size: [x1 - x0, y1 - y0, z1 - z0], pos: W((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color, ...ex });
  const rig = { prefix: P };
  rig.group = X.group(`${P}_head`, { pivot: W(0, 0, -12) }, () => {
    // ---- skull + face blocks (front pieces never share a plane with a neighbour: fronts staggered by >= 0.3)
    box('giantSkin', -56, 56, -6, 96, -46, F - 12, SKIN);                                         // skull (lower)
    box('giantSkin', -44, 44, 96, 124, -46, F - 12.2, SKIN);                                      // crown, narrower
    box('giantSkin', -56, 56, 96, 104, F - 12, F - 1, SKIN);                                      // forehead (lower band)
    box('giantSkin', -44, 44, 104, 122, F - 12, F - 1.3, SKIN);                                   // forehead (upper, narrower)
    for (const s of [-1, 1]) { // sloped corners: the head tapers toward the crown (no box silhouette)
      X.p({ shape: 'wedge', mat: 'giantSkin', size: [F - 12 + 46, 28, 12], pos: W(s * 50, 110, (F - 12 - 46) / 2), rot: [0, -s * 90, 0], color: SKIN });
      X.p({ shape: 'wedge', mat: 'giantSkin', size: [11, 18, 12], pos: W(s * 50, 113, F - 6.5), rot: [0, -s * 90, 0], color: SKIN });
    }
    for (const [x, y, z, sx, sy, sz] of [[-30, 118, -10, 46, 26, 60], [24, 121, -22, 54, 24, 58], [-6, 114, -40, 70, 30, 40], [44, 108, 6, 26, 28, 44], [-48, 106, -18, 22, 30, 50]]) X.p({ shape: 'hball', mat: 'giantSkinDark', size: [sx, sy, sz], pos: W(x, y, z), color: SKIN_D }); // lumpy skull
    for (const s of [-1, 1]) box('giantSkinDark', s > 0 ? 50 : -58, s > 0 ? 58 : -50, 64, 95, -30, F - 14, SKIN_D); // temple ridges
    for (const s of [-1, 1]) { // heavy brow, V-shaped (inner ends low = permanent scowl)
      X.p({ mat: 'giantSkinDark', size: [54, 16, 32], pos: W(s * 29, o.brow === 'flat' ? 99 : 94, o.brow === 'flat' ? F - 6 : F + 4), rot: [12, 0, s * (o.brow === 'flat' ? 18 : 21)], color: SKIN_D }); // heavy angry V brow, inner ends pressed down over the eyes; brow 'flat' = less overhang (cloud face, seen from above the brow line)
      box('giantSkin', s > 0 ? 44 : -56, s > 0 ? 56 : -44, 58, 96, F - 12, F - 0.4, SKIN);     // temples
      box('maw', s > 0 ? 9 : -45, s > 0 ? 45 : -9, 60, 95, F - 24, F - 12.5, '#0c0507');        // socket cavity (dark)
      box('giantSkin', s > 0 ? 9 : -57, s > 0 ? 57 : -9, 47, 63, F - 12, F + 1.3, SKIN);        // cheeks
      X.p({ mat: 'giantSkinDark', size: [40, 7, 16], pos: W(s * 32, 60, F - 1), rot: [0, s * 10, s * 6], color: SKIN_D }); // cheekbone ridge
      box('giantSkin', s > 0 ? 56 : -66, s > 0 ? 66 : -56, 56, 92, -16, 14, SKIN);              // ears
      X.p({ shape: 'wedge', mat: 'giantSkin', size: [10, 22, 30], pos: W(s * 61, 103, -1), color: SKIN });
    }
    box('giantSkin', -10, 10, 58, 96, F - 12, F + 2.2, SKIN);                                   // nose bridge
    for (const s of [-1, 1]) { // silhouette: cheekbones + jaw flare wider than the skull
      X.p({ mat: 'giantSkin', size: [14, 20, 46], pos: W(s * 60, 55, F - 18), rot: [0, s * -8, s * 6], color: SKIN });      // cheekbone flare
      X.p({ mat: 'giantSkinDark', size: [16, 26, 60], pos: W(s * 58, 10, F - 26), rot: [0, s * -6, s * -8], color: SKIN_D }); // jaw hinge flare
    }
    X.p({ mat: 'giantSkinDark', size: [16, 10, 10], pos: W(0, 90, F + 6), rot: [10, 0, 45], color: SKIN_D }); // frown knot
    box('giantSkin', -14, 14, 40, 64, F - 6, F + 13, SKIN);                                      // flat nose
    for (const s of [-1, 1]) X.p({ mat: 'maw', size: [7, 5, 6], pos: W(s * 6.5, 41.7, F + 8), rot: [0, s * 12, 0], color: '#0a0405' }); // nostrils
    // ---- eyes: dark socket, yellowed eyeball (red veins), dark iris, tiny glowing amber pupil; lids are spherical caps
    rig.eyes = [];
    for (const s of [-1, 1]) {
      const c = W(s * 27, 78, F - 7);
      const ball = X.group(`${P}_eye${s < 0 ? 'R' : 'L'}`, { pivot: c }, () => {
        X.p({ shape: 'hball', mat: 'eyeball', size: [23, 23, 23], pos: c, color: '#d3c79c' });
        if (o.eyeStyle === 'red') { // "The Door": big glowing blood-red iris with a black slit pupil (reads as a red eye at any distance)
          X.p({ shape: 'hball', mat: 'neon', size: [15, 15, 2.6], pos: [c[0], c[1], c[2] + 10.6], color: '#d0140a', gain: 2.6, fog: false, shadow: false });
          X.p({ shape: 'hball', mat: 'neon', size: [9, 9, 1.4], pos: [c[0], c[1], c[2] + 11.6], color: '#ff4a1a', gain: 3.2, fog: false, shadow: false });
          X.p({ mat: 'maw', size: [2.2, 9.5, 1.2], pos: [c[0], c[1], c[2] + 12.2], color: '#050203', fog: false });
          X.p({ shape: 'hball', mat: 'halo', size: [26, 26, 0.4], pos: [c[0], c[1], c[2] + 13], color: '#ff1a08', gain: 0.9, fog: false, shadow: false });
        } else {
        X.p({ shape: 'hball', mat: 'leather', size: [9.6, 9.6, 2.4], pos: [c[0], c[1], c[2] + 10.9], color: '#2a1a12' });
        X.p({ shape: 'hball', mat: 'neon', size: [1.9, 1.9, 1.0], pos: [c[0], c[1], c[2] + 11.9], color: '#ff3a10', gain: 7, fog: false, shadow: false }); // small fierce red-orange pupil
        X.p({ shape: 'hball', mat: 'neon', size: [0.8, 0.8, 0.7], pos: [c[0], c[1], c[2] + 12.3], color: '#ffc080', gain: 8, fog: false, shadow: false });
        X.p({ shape: 'hball', mat: 'halo', size: [5, 5, 0.4], pos: [c[0], c[1], c[2] + 12.6], color: '#ff2a08', gain: 0.75, fog: false, shadow: false });
        }
      });
      const skinMat = X.mat('giantSkinDark').clone(); // lids: near-black so the sockets read deep (no pale "bags" under the eyes)
      skinMat.color = new THREE.Color('#2a2a30'); skinMat.roughness = 0.8;
      const cap = (thetaLen) => new THREE.SphereGeometry(12.6, 40, 18, 0, Math.PI * 2, 0, thetaLen);
      const up = new THREE.Mesh(cap(Math.PI * 0.56), skinMat), lo = new THREE.Mesh(cap(Math.PI * 0.24), skinMat);
      for (const m of [up, lo]) { m.position.set(...c); m.castShadow = m.receiveShadow = true; m.scale.set(1.06, 1, 1); X.cur().add(m); }
      lo.rotation.set(Math.PI - 0.62, 0, 0); // lower lid: a thin cap from below, tilted up over the bottom of the eye
      rig.eyes.push({ s, ball, up, lo, c });
    }
    // ---- mouth: per-column face blocks leave a grin-shaped gap (stair-stepped, Roblox-blocky) over a dark maw
    const yU = (x) => 30 + 8 * Math.pow(Math.abs(x) / 52, 2), yL = (x) => 12 + 21 * Math.pow(Math.abs(x) / 52, 2.3);
    box('maw', -56, 56, 2, 44, F - 26, F - 13, '#100506');
    X.p({ mat: 'neon', size: [100, 30, 1], pos: W(0, 22, F - 12.6), color: '#4a0806', gain: 1.5, shadow: false }); // faint red glow deep in the maw
    box('gum', -54, 54, 26, 36, F - 13, F - 8, '#3a1418');                 // upper gum
    rig.covers = [[], []];
    rig.jaw = X.group(`${P}_jaw`, { pivot: W(0, 20, -20) }, () => {
      box('giantSkin', -50, 50, -16, 5, F - 12, F - 1.6, SKIN);              // jaw / chin
      box('giantSkinDark', -24, 24, -24, 3, F - 6, F + 7, SKIN_D);           // jutting, heavy chin
      box('gum', -50, 50, 6, 14, F - 13, F - 9, '#3a1418');                  // lower gum
      for (let x = -54; x < 54; x += 4) {
        const cx = x + 2, lo = yL(cx);
        if (lo - 3 > 5) box('giantSkin', x, x + 4, 5, lo - 3, F - 12, F - (Math.abs(cx) > 36 ? 0.7 : 0.35), SKIN);
        box('gum', x, x + 4, lo - 3, lo, F - 11, F + 1.8, LIP);              // lower lip
      }
      for (let x = -46, k = 0; x <= 46; x += 7.4, k++) { // a few short lower teeth (dark gaps between them)
        if (k % 4 === 2) continue;
        const h = 5 + r() * 4, lo = yL(x);
        X.p({ mat: 'tooth', size: [4.2, h, 4], pos: W(x, lo - 1 + h / 2, F - 7.5), rot: [0, 0, (r() - 0.5) * 8], color: '#cfc39a' });
      }
      for (const s of [-1, 1]) X.p({ mat: 'tooth', size: [4.6, 30, 4], pos: W(s * 23, yL(23) + 9, F + 4.5), rot: [-4, 0, s * -7], color: '#d8cca6' }); // fangs OUTSIDE the lips
    });
    for (let x = -54; x < 54; x += 4) { // upper face columns + upper lip
      const cx = x + 2, up = yU(cx);
      box('giantSkin', x, x + 4, up + 3, 47, F - 12, F - (Math.abs(cx) > 36 ? 0.7 : 0.35), SKIN);
      box('gum', x, x + 4, up, up + 3, F - 11, F + 2.1, LIP);
      if (Math.abs(cx) > 36) { // grin covers: fill the outer mouth corners at grin 0, slide back behind the maw as it widens
        const side = cx < 0 ? 0 : 1;
        rig.covers[side].push(X.group(`${P}_cov${side}_${x}`, { pivot: W(cx, 0, F) }, () => box('giantSkin', x + 0.05, x + 3.95, yL(cx) - 0.5, up + 0.5, F - 12, F - 0.9, SKIN)));
      }
    }
    for (let x = -50, k = 0; x <= 50; x += 5.4, k++) { // upper teeth: long, narrow, ladder-like (grooved stain bands), uneven, a few gaps
      if (k === 4 || k === 13) continue; // missing teeth
      const top = yU(x) + 1, len = 17 + 10 * (1 - Math.pow(Math.abs(x) / 52, 2)) + r() * 6;
      const out = [-32.4, -16.2, 16.2, 32.4].some((v) => Math.abs(v - x) < 1); // a few hang OUTSIDE the lower lip
      const L = out ? len + 9 : len, w = 3.3 + r() * 1.2;
      X.p({ mat: 'tooth', size: [w, L, 4], pos: W(x + (r() - 0.5) * 0.8, top - L / 2, out ? F + 3.6 : F - 4), rot: [out ? 6 : 0, 0, (r() - 0.5) * 9], color: ['#cbb98a', '#d6c89c', '#bba878', '#c4b282'][k % 4] });
    }
    // ---- neck
    box('giantSkinDark', -34, 34, -40, 2, -44, 22, SKIN_D);
  });
  rig.F = F;
  rig.pupil = (i) => rig.eyes[i].ball.userData.inner.localToWorld(_v.set(rig.eyes[i].c[0], rig.eyes[i].c[1], rig.eyes[i].c[2] + 12)).clone();
  rig.base = { pitch: o.pitch ?? 0, yaw: 0 };
  rig.setPose = (p = {}, t = 0) => {
    const br = p.breath ?? 1, nod = 0.012 * br * Math.sin((t / 5.6) * Math.PI * 2 + 0.8);
    const hp = (p.head?.[0] ?? 0) * D2R, hy = (p.head?.[1] ?? 0) * D2R;
    rig.group.rotation.set(rig.base.pitch + hp + nod, hy, 0);
    rig.group.updateMatrixWorld(true);
    // eyes
    for (const e of rig.eyes) {
      const open = cl(e.s < 0 ? p.eyeR ?? p.eyes ?? 0.55 : p.eyeL ?? p.eyes ?? 0.55);
      let lx = p.look?.[0] ?? 0, ly = p.look?.[1] ?? 0;
      if (p.lookAt) { // aim the eyeball at a world point (clamped)
        const c = e.ball.getWorldPosition(_v2), d = _v.set(...p.lookAt).sub(c).normalize();
        const inv = _m.copy(rig.group.matrixWorld).invert(); d.transformDirection(inv);
        lx = cl(Math.atan2(d.x, d.z) / 0.45, -1, 1); ly = cl(Math.asin(cl(d.y, -1, 1)) / 0.45, -1, 1);
      }
      e.ball.rotation.set(-ly * 0.42, lx * 0.45, 0);
      e.up.rotation.set((open <= 0.5 ? 30 - 100 * open : -20 - 50 * (open - 0.5)) * D2R, 0, e.s * 0.3 * sm(open / 0.3) * (1 - 0.5 * sm((open - 0.5) / 0.5))); // cap rim: 0 shut, 0.5 = just above the pupil (heavy half lid), 1 = tucked up; rolled so the inner corner sits lower (angry slant)
    }
    // grin: corner covers slide back (behind the maw) -> the smile tears wider, more teeth
    const g = cl(p.grin ?? 0);
    for (const side of [0, 1]) rig.covers[side].forEach((cv, k) => {
      const n = rig.covers[side].length, far = side === 0 ? n - 1 - k : k; // 0 = nearest the centre
      const u = sm((g * (n + 1.5) - far) / 1.5);
      cv.position.z = cv.userData.pivot[2] - 15 * u; cv.visible = u < 0.999;
    });
    const chat = (p.click ?? 0) * (0.5 + 0.5 * Math.sin(t * 9.5)) * (0.6 + 0.4 * Math.sin(t * 2.3));
    rig.jaw.rotation.set(((p.jaw ?? 0) * 7 + chat * 2.6) * D2R, 0, 0); // + = the chin drops (opens)
  };
  return rig;
}

// ======================================================================================== FULL GIANT
// Seated on a cloud mound at pos (feet on the cloud, y = cloudY), facing +Z. Main points (giant local, origin = pos):
// head ~ (0, 270, 85), right hand palm (-55, 100, 262) with fingers toward +Z, sleepers hang below the hand.
export function buildGiant(X, S, o = {}) {
  const P = o.prefix ?? 'giant', [ox, oy, oz] = o.pos ?? [0, 0, 0], r = rng(`${P}:body`);
  const W = (p) => [ox + p[0], oy + p[1], oz + p[2]];
  const HUNCH = 0.28, piv = [0, 60, -20];
  const api = { anchors: {} };
  const A = (n, p) => { api.anchors[n] = p; S.anchor(n, p); };
  // ---- legs, seat, left arm (static)
  for (const s of [-1, 1]) {
    const hip = [s * 48, 70, -5], knee = [s * 62, 100, 150], ankle = [s * 66, 14, 176];
    limb(X, 'giantSkin', W(hip), W(knee), 58, 56, SKIN);
    X.p({ shape: 'hball', mat: 'knuckle', size: [66, 60, 62], pos: W(knee), color: '#7c828b' });
    limb(X, 'giantSkin', W(knee), W(ankle), 44, 46, SKIN);
    X.p({ mat: 'giantSkinDark', size: [54, 20, 78], pos: W([s * 68, 8, 196]), color: SKIN_D });
    for (let k = 0; k < 4; k++) { X.p({ mat: 'giantSkin', size: [11, 12, 16], pos: W([s * (48 + k * 12.5), 6, 240]), color: SKIN }); X.p({ mat: 'nail', size: [9, 4, 7], pos: W([s * (48 + k * 12.5), 10.5, 246]), rot: [12, 0, 0], color: '#a89868' }); }
  }
  X.p({ mat: 'rag', size: [150, 44, 110], pos: W([0, 68, -10]), color: '#3f3830' });              // loincloth / pelvis wrap
  for (let k = 0; k < 9; k++) X.p({ mat: 'rag', size: [16, 30 + r() * 18, 3], pos: W([-64 + k * 16, 44, 46 + r() * 2]), rot: [8, 0, (r() - 0.5) * 10], color: k % 2 ? '#3a332c' : '#463e35' });
  { // left arm resting on the left knee, hand draped over it
    const sh = rot([88, 205, -10], piv, HUNCH), el = [118, 150, 70], wr = [82, 122, 152];
    limb(X, 'giantSkin', W(sh), W(el), 30, 30, SKIN); X.p({ shape: 'hball', mat: 'knuckle', size: [34, 34, 34], pos: W(el), color: '#7c828b' });
    limb(X, 'giantSkin', W(el), W(wr), 24, 24, SKIN);
    X.p({ mat: 'giantSkin', size: [56, 14, 44], pos: W([76, 128, 170]), rot: [-28, 0, 0], color: SKIN });
    for (let k = 0; k < 4; k++) { const fx = 56 + k * 13; limb(X, 'giantSkin', W([fx, 118, 188]), W([fx, 70, 205]), 9, 9, SKIN); X.p({ shape: 'hball', mat: 'knuckle', size: [13, 13, 13], pos: W([fx, 116, 190]), color: '#7c828b' }); X.p({ mat: 'nail', size: [7, 9, 3], pos: W([fx, 66, 207]), color: '#a89868' }); }
  }
  // ---- torso (hunched forward; breathing) with the head on top
  let head;
  const torso = X.group(`${P}_torso`, { pivot: W(piv) }, () => {
    const B = (mat, size, p, color, rr) => X.p({ mat, size, pos: W(p), color, rot: rr });
    B('giantSkin', [124, 76, 86], [0, 96, -18], SKIN);
    B('giantSkin', [158, 100, 98], [0, 168, -14], SKIN);
    for (const s of [-1, 1]) {
      B('giantSkinDark', [68, 38, 12], [s * 36, 186, 37], SKIN_D, [0, 0, s * -4]);                 // pecs
      for (let k = 0; k < 4; k++) B('giantSkinDark', [56 - k * 4, 7, 8], [s * 38, 150 - k * 12, 35 - k * 1.5], SKIN_D, [0, s * -12, s * 8]); // ribs
      X.p({ shape: 'hball', mat: 'giantSkin', size: [70, 62, 66], pos: W([s * 88, 205, -10]), color: SKIN });  // shoulders
      X.p({ shape: 'hball', mat: 'knuckle', size: [30, 26, 30], pos: W([s * 96, 236, -12]), color: '#7c828b' }); // bony shoulder knob
    }
    X.p({ shape: 'hball', mat: 'giantSkin', size: [124, 96, 78], pos: W([0, 196, -56]), color: SKIN }); // hump
    for (let k = 0; k < 6; k++) X.p({ shape: 'hball', mat: 'knuckle', size: [16, 14, 14], pos: W([0, 120 + k * 20, -62 - Math.sin(k * 0.6) * 16]), color: '#6e747c' }); // spine knobs
    B('giantSkin', [86, 34, 62], [0, 224, -14], SKIN);                                                    // traps
    for (let k = 0; k < 7; k++) B('rag', [30, 120 + r() * 40, 4], [-75 + k * 25, 150 - r() * 18, -98 + Math.abs(k - 3) * 4], k % 2 ? '#2e2924' : '#39322a', [10, (k - 3) * 6, 0]); // tattered cloak
    head = buildHead(X, S, { pos: W([0, 236, -4]), prefix: P, pitch: 0.18 });
  });
  // ---- right arm reaching forward; the rope hand (palm down, fingers toward +Z, thumb toward +X)
  const shR = rot([-88, 205, -10], piv, HUNCH), elR = [-112, 150, 120], wrR = [-58, 104, 226], H0 = [-55, 100, 262];
  limb(X, 'giantSkin', W(shR), W(elR), 30, 30, SKIN); X.p({ shape: 'hball', mat: 'knuckle', size: [36, 34, 36], pos: W(elR), color: '#7c828b' });
  limb(X, 'giantSkin', W(elR), W(wrR), 24, 22, SKIN); X.p({ shape: 'hball', mat: 'knuckle', size: [28, 26, 26], pos: W(wrR), color: '#7c828b' });
  X.p({ mat: 'giantSkin', size: [64, 15, 54], pos: W(H0), color: SKIN });
  X.p({ mat: 'giantSkinDark', size: [58, 6, 44], pos: W([H0[0], H0[1] + 9, H0[2] - 2]), color: SKIN_D }); // back-of-hand tendons
  const FING = [ // [x, len[], thick, spread yaw]
    [-33, [26, 20, 15], 10, 5], [-48, [29, 22, 16], 10.5, 1], [-63, [26, 20, 15], 10, -3], [-78, [20, 16, 12], 8.5, -8],
  ];
  const slots = []; // knot slots { inner, p: set coords, seg }
  const fingers = [];
  const wraps = (x, y, z, w, h) => { for (const dz of [0, 1.1]) for (const [dx, dy, sx, sy] of [[0, h / 2 + 0.3, w + 1.2, 0.6], [0, -h / 2 - 0.3, w + 1.2, 0.6], [w / 2 + 0.3, 0, 0.6, h + 1.2], [-w / 2 - 0.3, 0, 0.6, h + 1.2]]) X.p({ mat: 'rope', size: [sx, sy, 0.7], pos: [x + dx, y + dy, z + dz], color: '#a8936a' }); };
  const fingerChain = (name, base, dirYaw, lens, th, isThumb) => {
    const segs = [];
    let parent = null, z = base[2];
    const build = (i) => {
      const L = lens[i], z0 = z, piv2 = [base[0], base[1], z0];
      const g = X.group(`${P}_${name}${i}`, { pivot: W(piv2) }, (gg) => {
        X.p({ mat: 'giantSkin', size: [th, th * 0.95, L + 2], pos: W([base[0], base[1], z0 + L / 2]), color: SKIN });
        const kn = [16, 13.5, 11.5][i] * th / 10;
        X.p({ shape: 'hball', mat: 'knuckle', size: [kn * (1 + r() * 0.15), kn * 0.95, kn * (1 + r() * 0.1)], pos: W([base[0] + (r() - 0.5) * 1.5, base[1] - 0.5, z0]), color: i ? '#7a8088' : '#717780' }); // low enough that the first knot row (and anyone kneeling there) is not buried
        // knot slots along the underside
        for (let k = 0; k < Math.floor(L / 3.4); k++) for (const sx of [-th * 0.28, th * 0.28]) slots.push({ g: gg, p: W([base[0] + sx, base[1] - th * 0.48 - 0.9, z0 + 2 + k * 3.4]), c: W([base[0], base[1], z0 + 2 + k * 3.4 + (sx > 0 ? 0.55 : -0.55)]), top: W([base[0] + sx, base[1] + th * 0.475 + 0.75, z0 + 2 + k * 3.4 + (sx > 0 ? 0.55 : -0.55)]), th, seg: `${name}${i}`, f: name, i });
        z += L;
        if (i === lens.length - 1) { // claw nail
          X.p({ shape: 'wedge', mat: 'nail', size: [th * 0.62, th * 0.3, 8], pos: W([base[0], base[1] + th * 0.25, z0 + L + 2.6]), rot: [0, 180, 0], color: '#5e5440' });
        } else build(i + 1);
      });
      segs.unshift(g);
      return g;
    };
    const root = build(0);
    fingers.push({ name, segs, yaw: dirYaw, isThumb });
    return root;
  };
  FING.forEach(([x, lens, th, yaw], k) => fingerChain(`f${k}`, [x, H0[1] + 1, H0[2] + 27], yaw, lens, th));
  { // thumb: from the palm side toward +X/+Z
    const t0 = [-22, H0[1] - 3, H0[2] + 4];
    fingerChain('th', t0, 38, [22, 17], 11, true);
  }
  // ---- knots (instanced, rope colour) + sleepers + ropes (updated each frame)
  const NS = o.sleepers ?? 96, NV = o.villageRopes ?? 110;
  // deterministic slot assignment: Mom on the index finger middle segment, Mrs. Hale's husband next to her, sleepers spread
  const sr = rng(`${P}:slots`);
  const order = slots.map((s, i) => ({ s, i, k: sr() })).sort((a, b) => a.k - b.k).map((a) => a.s);
  const momSlot = slots.find((s) => s.seg === 'f01' && s.p[0] > ox - 33) ?? slots[0];
  const mayorSlot = slots.filter((s) => s.f === 'f3').sort((a, b) => b.p[2] - a.p[2])[0];
  const used = new Set([momSlot, mayorSlot]);
  const hubSlot = slots.find((s) => s.seg === 'f01' && !used.has(s) && Math.abs(s.p[2] - momSlot.p[2]) > 6) ?? order[1];
  used.add(hubSlot);
  const sleeperSlots = [momSlot, hubSlot, ...order.filter((s) => !used.has(s) && s.f !== 'th').slice(0, NS - 2)];
  sleeperSlots.forEach((s) => used.add(s));
  const villageSlots = order.filter((s) => !used.has(s)).slice(0, NV);
  const knotGeo = new THREE.SphereGeometry(1, 10, 8), ropeMat = X.mat('rope');
  const knotMesh = new THREE.InstancedMesh(knotGeo, ropeMat, sleeperSlots.length + villageSlots.length);
  knotMesh.castShadow = true; knotMesh.receiveShadow = true; knotMesh.frustumCulled = false; knotMesh.name = `${P}_knots`;
  for (let i = 0; i < knotMesh.count; i++) knotMesh.setColorAt(i, new THREE.Color(i % 3 ? '#9c8558' : '#8a7448'));
  S.root.add(knotMesh);
  // every rope also wraps once around its finger (band, 0.35 off the skin so it never z-fights) and shows a knot on top
  const NK = knotMesh.count + 1, bandGeo = new THREE.BoxGeometry(1, 1, 1);
  const bandMesh = new THREE.InstancedMesh(bandGeo, ropeMat, NK), topMesh = new THREE.InstancedMesh(knotGeo, ropeMat, NK);
  for (const [m, n] of [[bandMesh, 'knotBands'], [topMesh, 'knotTops']]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.name = `${P}_${n}`; S.root.add(m); }
  for (let i = 0; i < NK; i++) { const c = new THREE.Color(i % 3 ? '#9c8558' : '#8a7448'); bandMesh.setColorAt(i, c); topMesh.setColorAt(i, c.clone().multiplyScalar(1.12)); }
  const _bm = new THREE.Matrix4(), _bl = new THREE.Matrix4(), _bv = new THREE.Vector3(), _bq = new THREE.Quaternion();
  const knotOnFinger = (k, s, ks) => { // ks: 1 tied .. 0 gone
    if (ks <= 0.01) { bandMesh.setMatrixAt(k, ZERO); topMesh.setMatrixAt(k, ZERO); return; }
    const M2 = s.g.userData.inner.matrixWorld;
    bandMesh.setMatrixAt(k, _bm.multiplyMatrices(M2, _bl.compose(_bv.set(...s.c), _bq.identity(), _v2.set(s.th + 0.7, s.th * 0.95 + 0.7, 0.55 * ks))));
    topMesh.setMatrixAt(k, _bm.multiplyMatrices(M2, _bl.compose(_bv.set(...s.top), _bq.identity(), _v2.set(0.95 * ks, 0.7 * ks, 1.05 * ks))));
  };
  // sleepers: instanced blocky people hanging upside down by the left ankle, eyes shut
  const SK = ['#f2c39b', '#d9a77e', '#b97f55', '#8a5a3a', '#f5d0b0', '#e8b896'], SH = ['#7a2f2f', '#2f4f7a', '#3f6a3f', '#7a6a3a', '#5a3a6a', '#2f6a6a', '#8a4a2a', '#4a4a4a', '#a83a3a', '#3a5a9a'];
  const PA = ['#2f3e57', '#3b3b3b', '#5a4630', '#1f2a44', '#4a4a3a'], HA = ['#2a1b10', '#5a3720', '#121212', '#8a4a20', '#d8d0c8', '#b89a6a'];
  const people = sleeperSlots.map((s, i) => {
    const q = rng(`${P}:sl${i}`), pick = (a) => a[Math.floor(q() * a.length)];
    const p = { slot: s, L: 7 + q() * 26, yaw: q() * Math.PI * 2, ph: q() * 6.28, ph2: q() * 6.28, w: 0.55 + q() * 0.35, skin: pick(SK), shirt: pick(SH), pants: pick(PA), hair: pick(HA), bend: 0.5 + q() * 0.6, arm: q() };
    if (i === 0) Object.assign(p, { L: 13, yaw: 0.35, skin: '#f0c4a0', shirt: '#3f7a5a', pants: '#3f7a5a', hair: '#5a3720', mom: true });
    if (i === 1) Object.assign(p, { L: 18, skin: '#e8b896', shirt: '#6a4a2a', pants: '#3b3b3b', hair: '#d8d0c8' });
    return p;
  });
  const partGeo = new THREE.BoxGeometry(1, 1, 1), headGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.34, 20);
  const pm = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
  const mk = (geo, n, name) => { const m = new THREE.InstancedMesh(geo, pm, n); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.name = `${P}_${name}`; S.root.add(m); return m; };
  const NP = people.length;
  const parts = { legL: mk(partGeo, NP, 'legL'), legR: mk(partGeo, NP, 'legR'), torso: mk(partGeo, NP, 'torso'), armL: mk(partGeo, NP, 'armL'), armR: mk(partGeo, NP, 'armR'), head: mk(headGeo, NP, 'head'), hair: mk(partGeo, NP, 'hair'), lid: mk(partGeo, NP * 2, 'lids') };
  const col = new THREE.Color();
  people.forEach((p, i) => {
    parts.legL.setColorAt(i, col.set(p.pants)); parts.legR.setColorAt(i, col.set(p.pants)); parts.torso.setColorAt(i, col.set(p.shirt));
    parts.armL.setColorAt(i, col.set(p.shirt)); parts.armR.setColorAt(i, col.set(p.shirt)); parts.head.setColorAt(i, col.set(p.skin)); parts.hair.setColorAt(i, col.set(p.hair));
    parts.lid.setColorAt(i * 2, col.set('#2a1a14')); parts.lid.setColorAt(i * 2 + 1, col.set('#2a1a14'));
  });
  // local part transforms (sleeper frame: origin = ankle, +Y toward the knot, body hangs to -Y; face toward +Z)
  const LM = (pos, size, rz = 0, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(...size));
  const localParts = (p) => ({
    legL: LM([0.5, -0.9, 0], [0.96, 1.8, 0.96]),
    legR: LM([-0.5 - 0.55 * p.bend, -1.25, 0.1], [0.96, 1.8, 0.96], -0.9 * p.bend, 0.25),
    torso: LM([0, -2.78, 0], [2.0, 1.95, 1.05]),
    armL: LM([1.5 + 0.2 * p.arm, -4.3, 0.05], [0.9, 1.9, 0.9], 0.18 + 0.12 * p.arm),
    armR: LM([-1.5 - 0.2 * p.arm, -4.3, -0.05], [0.9, 1.9, 0.9], -0.16 - 0.1 * p.arm),
    head: LM([0, -4.42, 0], [1, 1, 1]),
    hair: LM([0, -5.02, -0.05], [1.5, 0.32, 1.5]),
    lid0: LM([0.3, -4.28, 0.73], [0.36, 0.08, 0.06]), lid1: LM([-0.3, -4.28, 0.73], [0.36, 0.08, 0.06]),
  });
  people.forEach((p) => { p.local = localParts(p); });
  // ropes: sleepers (knot -> ankle) + village ropes (knot -> down into the cloud), ribbons
  const field = ropeField(S, { name: `${P}_ropes`, count: NP + NV + 4, width: 0.3, minPx: 1.4, color: '#d9c8a2', topFade: 0.01, sway: 0, quiver: 0 });
  const cloudY = o.cloudY ?? 0, ctop = (x, z) => (o.cloudHeight ? o.cloudHeight(x, z) : cloudTopY(x, z, { y: cloudY }));
  // Toby's rope: from the arrival hole up to Mom's right wrist, wrapped ten times
  const toby = heroRope(S, { name: `${P}_tobyRope`, bell: false, cuff: false, radius: 0.16 });
  const mayorRope = heroRope(S, { name: `${P}_mayorRope`, bell: false, cuff: false, radius: 0.2, color: '#e8dcbc' });
  const coil = new THREE.Group(); coil.name = `${P}_momCoil`; S.root.add(coil);
  for (let k = 0; k < 10; k++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.15, 8, 20), ropeMat); m.rotation.x = Math.PI / 2; m.position.y = -0.2 - k * 0.17; m.rotation.z = k * 0.4; m.scale.set(1, 1 + 0.05 * (k % 3), 1); coil.add(m); }
  const momWrist = new THREE.Vector3(), momAnkle = new THREE.Vector3();
  // ---- anchors (static, default pose)
  A(`${P}_head`, W([0, 270, 88])); A(`${P}_hand`, W([H0[0], H0[1] + 10, H0[2]]));
  A(`${P}_hand_top`, W([H0[0] + 6, H0[1] + 13.2, H0[2] - 4])); A(`${P}_knuckles`, W([-48, H0[1] + 9, H0[2] + 27]));
  const holeXZ = o.hole ?? null;

  const M = new THREE.Matrix4(), Mb = new THREE.Matrix4(), Q = new THREE.Quaternion(), K = new THREE.Vector3(), Dv = new THREE.Vector3(), Av = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const sleeperFrame = (p, i, t, sw, fall) => {
    p.slot.g.userData.inner.localToWorld(K.set(...p.slot.p));
    const ax = sw * 0.035 * Math.sin(t * (2 * Math.PI / (5.2 + p.w * 2)) + p.ph), az = sw * 0.028 * Math.sin(t * (2 * Math.PI / (6.1 + p.w)) + p.ph2); // gentle lantern sway
    Dv.set(Math.sin(az), -Math.cos(ax) * Math.cos(az), Math.sin(ax)).normalize(); // rope direction knot -> ankle
    Av.copy(K).addScaledVector(Dv, p.L);
    let drop = 0, tumble = 0;
    if (fall > 0) { const slide = sm(fall / 0.25), ff = cl((fall - 0.25) / 0.75); drop = 1.6 * slide + 160 * ff * ff; tumble = ff * ff * 2.2; }
    Av.y -= drop;
    Q.setFromUnitVectors(UP, Dv.clone().negate());
    const spin = new THREE.Quaternion().setFromAxisAngle(UP, p.yaw + 0.08 * Math.sin(t * 0.3 + p.ph) * sw);
    const tq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tumble);
    M.compose(Av, Q.multiply(spin).multiply(tq), new THREE.Vector3(1, 1, 1));
    return M;
  };
  // ---- the per-frame pose (full state: anything missing = default)
  api.head = head; api.torso = torso; api.fingers = fingers; api.people = people; api.slots = { mom: momSlot, hub: hubSlot, mayor: mayorSlot }; api.field = field;
  api.apply = (p = {}) => {
    const t = p.t ?? 0, br = p.breath ?? 1;
    torso.rotation.set(HUNCH + 0.01 * br * Math.sin((t / 5.6) * Math.PI * 2), 0, 0);
    torso.scale.setScalar(1);
    head.setPose(p, t);
    const curl = cl(p.curl ?? 0), stir = cl(p.stir ?? 0);
    fingers.forEach((f, k) => f.segs.forEach((g, i) => {
      const base = f.isThumb ? [8, 14][i] : [10, 20, 26][i], add = f.isThumb ? [10, 20][i] : [14, 26, 30][i];
      const tw = stir * (2.5 + i) * Math.sin(t * (1.7 + k * 0.31) + k * 1.9 + i * 0.7) + stir * 3 * Math.sin(t * 0.6 + k);
      g.rotation.set((base + add * curl + tw) * D2R, i === 0 ? f.yaw * D2R : 0, f.isThumb && i === 0 ? -25 * D2R : 0);
    }));
    S.root.updateMatrixWorld(true);
    const untie = Math.max(0, p.untie ?? 0), sw = p.swing ?? 1;
    let ri = 0;
    const mtx = new THREE.Matrix4();
    const stay = !!p.momStays; // Mom keeps hanging (her knot is skipped; the count starts at the next sleeper)
    people.forEach((pp, i) => {
      const j = stay ? i - 1 : i;
      const mk = p.momKnot ?? (untie > 0 ? 1 : 0); // Mom's knot: 0 tied .. 1 untied (default: untied once the count starts)
      const fall = pp.mom && stay ? (mk >= 1 ? 2 : 0) : untie >= j + 1 ? 2 : untie > j ? untie - j : 0;
      const gone = fall >= 1 || (pp.mom && o.mom === 'empty');
      const F2 = sleeperFrame(pp, i, t, sw, Math.min(1, fall));
      if (pp.mom) { momAnkle.copy(Av); momWrist.set(-1.6, -5.3, 0).applyMatrix4(F2); coil.position.copy(momWrist); coil.quaternion.setFromRotationMatrix(mtx.extractRotation(F2)); coil.visible = fall < 1; api.momGone = fall >= 1; }
      for (const [k, m] of Object.entries(parts)) {
        if (k === 'lid') { for (const j of [0, 1]) m.setMatrixAt(i * 2 + j, gone || (pp.mom && o.mom === 'empty') ? ZERO : mtx.multiplyMatrices(F2, pp.local[`lid${j}`])); continue; }
        m.setMatrixAt(i, gone ? ZERO : mtx.multiplyMatrices(F2, pp.local[k]));
      }
      // knot: tight ball cluster while tied, shrinks as it slips
      pp.slot.g.userData.inner.localToWorld(K.set(...pp.slot.p));
      const ks = pp.mom && stay ? 1 - sm(mk) : fall > 0 ? 1 - sm(fall / 0.25) : 1;
      knotOnFinger(i, pp.slot, ks);
      knotMesh.setMatrixAt(i, ks <= 0.01 ? ZERO : mtx.makeScale(1.1 * ks, 0.85 * ks, 1.3 * ks).setPosition(K.x, K.y + 0.2, K.z));
      if (fall < 1) { // rope knot -> ankle (falls with the person)
        const top = fall > 0.25 ? _v2.copy(Av).addScaledVector(Dv, -pp.L) : K;
        field.seg(ri++, Av, top);
      }
    });
    const nv = Math.round(villageSlots.length * cl(p.village ?? 1));
    villageSlots.forEach((s, j) => {
      s.g.userData.inner.localToWorld(K.set(...s.p));
      const on = j < nv;
      knotMesh.setMatrixAt(people.length + j, on ? mtx.makeScale(0.95, 0.75, 1.15).setPosition(K.x, K.y + 0.2, K.z) : ZERO);
      knotOnFinger(people.length + j, s, on ? 1 : 0);
      if (on) field.seg(ri++, [K.x, ctop(K.x, K.z) - 4, K.z], K);
    });
    field.commit(ri);
    knotMesh.instanceMatrix.needsUpdate = true;
    knotOnFinger(NK - 1, mayorSlot, 1 - sm(cl(p.mayor ?? 0) / 0.3)); // the mayor's knot on the pinky tip
    bandMesh.instanceMatrix.needsUpdate = true; topMesh.instanceMatrix.needsUpdate = true;
    for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
    // the mayor's rope: thick and drum-tight from the pinky tip down into the cloud; slips off and drops when untied
    mayorSlot.g.userData.inner.localToWorld(K.set(...mayorSlot.p));
    const mu = cl(p.mayor ?? 0), slip = sm(mu / 0.3), dropM = 140 * Math.pow(cl((mu - 0.3) / 0.7), 2);
    mayorRope.update({ from: [K.x, ctop(K.x, K.z) - 4, K.z], top: [K.x, K.y + 0.3 - 1.5 * slip - dropM, K.z], tension: 1, quiver: 2 * (1 - slip), t, visible: K.y - dropM > ctop(K.x, K.z) - 2 });
    // Toby's rope: hole in the cloud -> Mom's wrist (ten wraps)
    const hx = holeXZ ? holeXZ[0] : momWrist.x, hz = holeXZ ? holeXZ[1] : momWrist.z;
    toby.update({ from: [hx, ctop(hx, hz) - 6, hz], top: [momWrist.x, momWrist.y - 0.2, momWrist.z], tension: 1, quiver: 0.6, t, visible: p.tobyRope !== false && !api.momGone });
    field.update(t);
    api.mom = { ankle: momAnkle.clone(), wrist: momWrist.clone(), knot: momSlot.g.userData.inner.localToWorld(new THREE.Vector3(...momSlot.p)) };
  };
  api.hand = { H0: W(H0) };
  // api.knotTop(which, out?) -> world point on top of the finger at that knot (after set/apply this frame):
  //   'mom' | 'hub' | 'mayor' | n = the knot the untie count opens n-th (0-based; with momStays the count skips Mom)
  //   | { village: j } (the j-th village rope; p.village keeps the first round(share * NV) tied)
  api.knotTop = (which, out = new THREE.Vector3(), stay = true) => {
    const s = which === 'mom' ? momSlot : which === 'hub' ? hubSlot : which === 'mayor' ? mayorSlot : typeof which === 'object' ? villageSlots[which.village] : people[Math.min(people.length - 1, which + (stay ? 1 : 0))].slot;
    return s.g.userData.inner.localToWorld(out.set(...s.top));
  };
  api.villageCount = villageSlots.length;
  return api;
}
