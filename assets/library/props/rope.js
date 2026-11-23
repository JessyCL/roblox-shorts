// "The Ropes": thin ropes from an ankle (or any point) straight up into the cloud. Built for "The Ropes"; reusable for any
// puppet-string / tether / leash story. Two builders (named exports, call them from a set builder; keep the handle):
//
//   const R = heroRope(S, { name, radius: 0.085, color, bell: true | { size }, cuff: true, segments: 220, autoHide: true })
//     autoHide (default): hidden at the start of every frame, shown by that frame's update() - shots that don't call it don't show it.
//     One high-detail tube (preallocated, vertices rewritten each frame). Call EVERY frame from shot.update (after the
//     actors are animated) with the full state - nothing persists between calls:
//     R.update({ from: character | [x,y,z] | Vector3,   // character -> its left ankle (follows walking legs); ankle: 'r' = right
//                top: [x, y, z] | (x, z) => y,           // cloud end (point) or a cloud height function (end above the tail)
//                tension: 'tight' | 'slack' | 'bow' | 'lifting' | 0..1,   // 1 = tight (straight, quivering), 0 = slack
//                trail: yawDeg | [dx, dz],               // slack: direction the tail lies on the grass (default: behind)
//                ground: 9.5,                            // slack: studs of rope lying on the grass
//                tailLift: 0.3,                          // slack: tail height above the ground (rides on top of grass blades; 0.1 on bare floors)
//                loose: 6,                               // slack: sideways bow of the rising part (studs)
//                ring: secondsSinceRing | null,          // brass bell swing (mild, decays in ~2.5 s)
//                quiver: 1, sway: 1, t })                // t = time for quiver / sway (shot-local lt is fine)
//     R.ankle(character) -> Vector3 (left ankle point); R.group (Object3D); R.visible(bool)
//   liftCharacter(character, height, { swing, t, tilt }) -> pull the actor up by the ankle (call after animate, i.e. in
//     shot.update, together with R.update({ tension: 'lifting' })). height in studs; tilt 0..1 leans the body back.
//
//   const F = ropeField(S, { name, count, autoHide: false (true = hidden each frame unless followCrowd/setPoints/commit ran), width: 0.16, minPx: 1.3, color, emissive: 0 (self-light, reads at night), top: (x, z) => y | number, sway: 0.25, quiver: 0.02 })
//     Hundreds of cheap ropes (instanced camera-facing ribbons, min 1.3 px wide with alpha falloff -> no shimmer):
//     F.setPoints([[x, y, z], ...])        static feet (houses, doorsteps) - call once at build time
//     F.followCrowd(crowdHandle)          every frame (shot.update): ropes from each crowd member's ankle (reads the
//                                          crowd's instance matrices, so call after crowd.update / the director's animate)
//     F.update(t)                          sway time (global or shot time); F.mesh; F.visible(bool); F.count(n) shows the first n
// Deterministic: everything is a function of the arguments (no clocks, no Math.random).

export const meta = {
  id: 'rope', tags: ['rope', 'string', 'tether', 'ankle', 'cloud', 'puppet', 'leash', 'bell', 'bow', 'knot', 'ropes'],
  description: 'Thin rope from an ankle straight up into the cloud: hero tube rope (tight / slack tail on the grass / tied in a bow / lifting, brass bell that rings) and an instanced rope field for crowds (hundreds of ropes from feet into the cloud). Prop thumbnail = a slack rope with bell rising 14 studs.',
  options: { demo: "prop preview: 'slack' (default) | 'tight' | 'bow'", height: 'preview rope height (14)', bell: 'preview bell (true)' },
  anchors: {},
};

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const TENSION = { tight: 1, lifting: 1, bow: 0.92, slack: 0 };

// ---------------------------------------------------------------- shared textures / geometry
let fiberTex = null;
function fiberTexture(THREE) {
  if (fiberTex) return fiberTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#d8c49c'; g.fillRect(0, 0, 64, 64);
  for (let k = -4; k < 8; k++) { // 3-strand twist: diagonal bands with darker grooves
    g.fillStyle = k % 3 === 0 ? '#b49a6c' : k % 3 === 1 ? '#e6d4ae' : '#c8b088';
    g.beginPath(); g.moveTo(k * 16, 0); g.lineTo(k * 16 + 16, 0); g.lineTo(k * 16 + 48, 64); g.lineTo(k * 16 + 32, 64); g.fill();
    g.strokeStyle = 'rgba(70,50,30,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(k * 16, 0); g.lineTo(k * 16 + 32, 64); g.stroke();
  }
  fiberTex = new THREE.CanvasTexture(c);
  fiberTex.wrapS = fiberTex.wrapT = THREE.RepeatWrapping; fiberTex.colorSpace = THREE.SRGBColorSpace; fiberTex.anisotropy = 8;
  return fiberTex;
}
// Brass bell (lathe), mouth down, hanging loop at the top; origin = loop top. size = bell height (studs).
export function makeBell(THREE, size = 0.55) {
  const g = new THREE.Group(); g.name = 'brass_bell';
  const prof = [[0.02, 0], [0.18, 0.02], [0.26, 0.1], [0.3, 0.35], [0.36, 0.7], [0.48, 0.92], [0.5, 1.0], [0.44, 1.0], [0.34, 0.9]].map(([r, y]) => new THREE.Vector2(r * size, -y * size)); // crown at the top (origin), mouth at -size
  const brass = new THREE.MeshStandardMaterial({ color: '#c99a3e', metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), brass); body.castShadow = true;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(size * 0.09, size * 0.025, 8, 16), brass); loop.position.y = size * 0.02;
  const rib = new THREE.Mesh(new THREE.TorusGeometry(size * 0.47, size * 0.025, 8, 28).rotateX(Math.PI / 2), brass); rib.position.y = -size * 0.97;
  const clap = new THREE.Mesh(new THREE.SphereGeometry(size * 0.1, 12, 8), new THREE.MeshStandardMaterial({ color: '#6a5232', metalness: 0.6, roughness: 0.5 })); clap.position.y = -size * 0.95;
  g.add(body, loop, rib, clap);
  g.userData.clapper = clap;
  return g;
}
// mild bell swing: radians, decays over ~2.5 s; null/negative = still
export function ringAngle(dt) {
  if (dt == null || dt < 0) return 0;
  return 0.55 * Math.exp(-dt * 1.4) * Math.sin(dt * 11.5) + 0.12 * Math.exp(-dt * 0.6) * Math.sin(dt * 4.1 + 0.6);
}

// ---------------------------------------------------------------- ankle helper
const _legLen = new WeakMap();
export function ankleOf(ch, out, THREE, side = 'l') {
  const leg = ch?.parts?.[side === 'r' ? 'rLeg' : 'lLeg'];
  if (!leg) return out.set(0, 0, 0);
  let L = _legLen.get(leg);
  if (L == null) { const m = leg.children.find((c) => c.isMesh); L = m ? -m.position.y * 2 : 1.8; _legLen.set(leg, L); }
  leg.updateWorldMatrix(true, false);
  return out.set(0, -(L - 0.3), 0).applyMatrix4(leg.matrixWorld);
}
export function liftCharacter(ch, h, o = {}) {
  if (!ch?.root) return;
  const t = o.t ?? 0, sw = (o.swing ?? 1) * Math.min(1, h / 3);
  ch.root.position.y += h;
  ch.root.rotation.z += 0.05 * sw * Math.sin(t * 2.1); // gentle pendulum, mild
  ch.root.rotation.x += -(o.tilt ?? 0) * 0.35;
  ch.root.updateMatrixWorld(true);
}

// ---------------------------------------------------------------- hero rope (tube)
export function heroRope(S, o = {}) {
  const THREE = S.THREE, N = o.segments ?? 220, RAD = 10, rad = o.radius ?? 0.085;
  const pos = new Float32Array((N + 1) * (RAD + 1) * 3), nrm = new Float32Array(pos.length), uv = new Float32Array((N + 1) * (RAD + 1) * 2), idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? '#efe2c4', map: fiberTexture(THREE), roughness: 0.86, metalness: 0 });
  const tube = new THREE.Mesh(geo, mat); tube.castShadow = true; tube.receiveShadow = true; tube.frustumCulled = false; tube.name = 'rope_tube';
  const group = new THREE.Group(); group.name = o.name ?? 'hero_rope'; group.userData.noShadowFit = true;
  group.add(tube);
  (o.parent ?? S.root).add(group);
  if (o.name) S.groups[o.name] = group;
  if (o.autoHide !== false && S.texts) S.texts.push({ update() { group.visible = false; } }); // hidden every frame unless this frame's update() shows it (no state leaks between shots)
  // ankle cuff + knot
  const fiber = new THREE.MeshStandardMaterial({ color: o.color ?? '#efe2c4', map: fiberTexture(THREE), roughness: 0.9 });
  const cuff = new THREE.Group();
  for (let k = 0; k < 2; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.56, rad * 0.95, 8, 24).rotateX(Math.PI / 2), fiber); r.position.y = 0.12 + k * 0.2; r.castShadow = true; cuff.add(r); }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(rad * 2.2, 12, 8), fiber); knot.position.set(0, 0.22, -0.6); knot.scale.set(1, 0.8, 1.2); cuff.add(knot);
  cuff.visible = o.cuff !== false; group.add(cuff);
  // bow (Mrs. Hale): two loops + two tails at the cuff knot
  const bow = new THREE.Group();
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.34, rad * 0.9, 8, 20), fiber); loop.scale.set(1.25, 0.75, 1); loop.position.set(s * 0.42, 0.06, 0); loop.rotation.set(0.2, 0, s * 0.35); bow.add(loop);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.85, rad * 0.7, 0.75, 8), fiber); tail.position.set(s * 0.22, -0.32, 0.05); tail.rotation.z = s * 0.45; bow.add(tail);
  }
  const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(rad * 1.9, 10, 8), fiber); bow.add(bowKnot);
  bow.position.set(0, 0.22, -0.62); bow.visible = false; cuff.add(bow);
  // bell
  const bellSpec = o.bell === false ? null : { size: 0.55, ...(typeof o.bell === 'object' ? o.bell : {}) };
  const bell = bellSpec ? makeBell(THREE, bellSpec.size) : null;
  const bellPivot = new THREE.Group(); if (bell) { bellPivot.add(bell); group.add(bellPivot); }

  const P = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const A = new THREE.Vector3(), T = new THREE.Vector3(), E = new THREE.Vector3(), D = new THREE.Vector3(), Q = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const Na = 8, Nb = 72; // points on the ankle drop / on the grass; the rest rise to the cloud
  const tAt = (s, o2) => {
    // tight line A -> Ttight, parameterised like the slack curve (bottom ~11 studs carry Na + Nb points)
    const Tt = o2.Tt, total = Tt.distanceTo(A), bottom = Math.min(total * 0.12, 0.6 + o2.ground);
    const i = s * N, d = i <= Na ? (i / Na) * 0.6 * (bottom / (0.6 + o2.ground)) : i <= Na + Nb ? bottom * ((0.6 + ((i - Na) / Nb) * o2.ground) / (0.6 + o2.ground)) : bottom + (total - bottom) * ((i - Na - Nb) / (N - Na - Nb));
    return tmp.copy(Tt).sub(A).multiplyScalar(d / Math.max(1e-4, total)).add(A);
  };
  const sAt = (s, o2, out) => {
    const i = s * N, gy = o2.groundY + o2.lift;
    if (i <= Na) { // ankle -> grass just behind the heel
      const u = i / Na;
      return out.set(A.x + D.x * 0.45 * u, A.y + (gy - A.y) * Math.sin(u * Math.PI / 2), A.z + D.z * 0.45 * u);
    }
    if (i <= Na + Nb) { // lying on the grass: gentle S-wiggle
      const u = (i - Na) / Nb, L = o2.ground, w = Math.sin(u * Math.PI * 2.2 + 0.4) * 0.45 * u + Math.sin(u * 9.0) * 0.08;
      return out.set(A.x + D.x * (0.45 + L * u) + Q.x * w, gy, A.z + D.z * (0.45 + L * u) + Q.z * w);
    }
    const v = (i - Na - Nb) / (N - Na - Nb), Ts = o2.Ts; // rising loosely from the end of the tail to the cloud
    const hx = 1 - Math.pow(1 - v, 4), hy = Math.pow(v, 1.12);
    const bulge = Math.sin(Math.PI * v) * Math.pow(1 - v, 0.4) * o2.loose * (1 + 0.08 * Math.sin(o2.t * 0.6) * o2.sway);
    out.set(E.x + (Ts.x - E.x) * hx + Q.x * bulge, E.y + (Ts.y - E.y) * hy, E.z + (Ts.z - E.z) * hx + Q.z * bulge);
    return out;
  };
  const Tt = new THREE.Vector3(), Ts = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), Nrm = new THREE.Vector3(), Bn = new THREE.Vector3(), Tg = new THREE.Vector3();
  const ankleV = new THREE.Vector3();

  const handle = {
    group, tube, bell, cuff,
    ankle: (ch) => ankleOf(ch, ankleV, THREE).clone(),
    visible(v) { group.visible = !!v; },
    update(p = {}) {
      group.visible = p.visible !== false;
      const from = p.from ?? [0, 0.4, 0];
      if (from?.parts) ankleOf(from, A, THREE, p.ankle); else if (from.isVector3) A.copy(from); else A.set(...from);
      const k = typeof p.tension === 'number' ? clamp01(p.tension) : TENSION[p.tension ?? 'tight'] ?? 1;
      const t = p.t ?? 0, ground = p.ground ?? 9.5, loose = p.loose ?? 6, sway = p.sway ?? 1;
      let yaw = 0;
      if (from?.root) { from.root.updateWorldMatrix(true, false); yaw = Math.atan2(from.root.matrixWorld.elements[8], from.root.matrixWorld.elements[10]); }
      if (Array.isArray(p.trail)) D.set(p.trail[0], 0, p.trail[1]).normalize();
      else { const ty = p.trail != null ? (p.trail * Math.PI) / 180 : yaw + Math.PI; D.set(Math.sin(ty), 0, Math.cos(ty)); }
      Q.set(-D.z, 0, D.x);
      const groundY = p.groundY ?? (from?.root ? from.root.position.y : Math.max(0, A.y - 0.45));
      E.set(A.x + D.x * (0.45 + ground), groundY + rad, A.z + D.z * (0.45 + ground));
      const topFn = typeof p.top === 'function' ? p.top : null;
      const topXZ = (x, z, def) => (topFn ? topFn(x, z) : Array.isArray(p.top) ? p.top[1] : def);
      if (Array.isArray(p.top)) { Tt.set(...p.top); Ts.set(...p.top); }
      else {
        Tt.set(A.x + 0.3, topXZ(A.x + 0.3, A.z - 0.2, 100) + 2, A.z - 0.2);
        Ts.set(E.x + D.x * 5 + Q.x * 3, topXZ(E.x + D.x * 5 + Q.x * 3, E.z + D.z * 5 + Q.z * 3, 100) + 2, E.z + D.z * 5 + Q.z * 3);
      }
      const o2 = { Tt, Ts, ground, loose, t, sway, groundY, lift: p.tailLift ?? 0.3 };
      const q = (p.quiver ?? 1) * k;
      for (let i = 0; i <= N; i++) {
        const s = i / N;
        sAt(s, o2, tmp2);
        const tp = tAt(s, o2);
        const pt = P[i].copy(tmp2).lerp(tp, k * k * (3 - 2 * k));
        if (q > 0) { // quiver: a fine standing wave, strongest in the lower third (mild)
          const env = Math.sin(Math.PI * Math.min(1, s * 1.4)) * 0.05 * q;
          pt.x += env * Math.sin(t * 29 + s * 40); pt.z += env * 0.7 * Math.sin(t * 23 + s * 31 + 1.3);
        }
      }
      // tube frames by parallel transport (no twist seams)
      Tg.copy(P[1]).sub(P[0]).normalize();
      Nrm.copy(Math.abs(Tg.y) > 0.9 ? tmp.set(1, 0, 0) : up).cross(Tg).normalize();
      let len = 0;
      for (let i = 0; i <= N; i++) {
        if (i > 0) len += P[i].distanceTo(P[i - 1]);
        Tg.copy(P[Math.min(N, i + 1)]).sub(P[Math.max(0, i - 1)]).normalize();
        Nrm.sub(tmp.copy(Tg).multiplyScalar(Nrm.dot(Tg))).normalize();
        Bn.copy(Tg).cross(Nrm);
        for (let j = 0; j <= RAD; j++) {
          const a = (j / RAD) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), q3 = (i * (RAD + 1) + j) * 3, q2 = (i * (RAD + 1) + j) * 2;
          const nx = Nrm.x * c + Bn.x * sn, ny = Nrm.y * c + Bn.y * sn, nz = Nrm.z * c + Bn.z * sn;
          pos[q3] = P[i].x + nx * rad; pos[q3 + 1] = P[i].y + ny * rad; pos[q3 + 2] = P[i].z + nz * rad;
          nrm[q3] = nx; nrm[q3 + 1] = ny; nrm[q3 + 2] = nz;
          uv[q2] = len * 1.6; uv[q2 + 1] = j / RAD;
        }
      }
      geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = geo.attributes.uv.needsUpdate = true;
      // cuff follows the ankle (and the leg's yaw)
      const leg = from?.parts?.[p.ankle === 'r' ? 'rLeg' : 'lLeg'];
      if (leg) { leg.getWorldQuaternion(cuff.quaternion); cuff.position.copy(A).add(tmp.set(0, -0.32, 0).applyQuaternion(cuff.quaternion)); } // follows a bent / kneeling leg
      else { cuff.position.copy(A).y -= 0.32; cuff.rotation.set(0, yaw, 0); }
      cuff.scale.setScalar(from?.root ? from.root.scale.x * (from.parts?.lLeg?.scale?.x ?? 1) : 1); // fits kid / adult legs
      bow.visible = p.tension === 'bow' || p.bow === true;
      // bell hangs from the rope ~1.6 studs from the ankle, swings when rung
      if (bell) {
        const bi = Math.min(N - 1, Na + Math.round(Nb * (1.15 / ground))), bp = P[bi];
        bellPivot.visible = p.bell !== false;
        bellPivot.position.copy(bp);
        Tg.copy(P[bi + 1]).sub(P[bi - 1]).normalize();
        const sw = ringAngle(p.ring);
        bellPivot.rotation.set(0, 0, 0);
        bellPivot.rotateOnWorldAxis(Tg, sw);
        bell.userData.clapper.position.x = -Math.sin(sw * 1.6) * 0.06;
      }
      return handle;
    },
  };
  return handle;
}

// ---------------------------------------------------------------- rope field (instanced ribbons)
const FIELD_PARS = /* glsl */`
attribute float aS; attribute float aSide;
attribute vec3 aA; attribute vec3 aB; attribute vec4 aP;
uniform float uTime, uWidth, uMinPx, uResY, uTopFade;
varying float vAlpha; varying vec2 vRUv;
vec3 rP; vec3 rSide;
`;
const FIELD_NORMAL = /* glsl */`
  vec3 axis = aB - aA; float L = length( axis );
  float s = aS;
  rP = aA + axis * s;
  float env = sin( 3.14159 * s );
  float ph = aP.y * 6.2831;
  vec2 dir = vec2( cos( ph ), sin( ph ) );
  float sw = aP.x * env * sin( uTime * 0.55 + aP.y * 17.0 ) + aP.z * sin( 3.14159 * min( 1.0, s * 3.0 ) ) * sin( uTime * 21.0 + aP.y * 53.0 );
  rP.xz += dir * sw + vec2( -dir.y, dir.x ) * aP.w * env;
  vec3 wp = ( modelMatrix * vec4( rP, 1.0 ) ).xyz;
  vec3 V = normalize( cameraPosition - wp );
  vec3 Tg = normalize( axis );
  rSide = normalize( cross( Tg, V ) );
  float dist = length( cameraPosition - wp );
  float pix = 2.0 * dist / ( projectionMatrix[ 1 ][ 1 ] * uResY );
  float w = max( uWidth, pix * uMinPx );
  vAlpha = clamp( uWidth / w, 0.0, 1.0 ) * smoothstep( L, L - uTopFade, s * L );
  vRUv = vec2( s * L, aSide );
  rSide *= w * 0.5;
  vec3 objectNormal = normalize( V * 0.8 + normalize( rSide ) * aSide * 0.6 );
`;
export function ropeField(S, o = {}) {
  const THREE = S.THREE, max = o.count ?? 1000, seg = o.segs ?? 12;
  const base = new THREE.InstancedBufferGeometry();
  const vs = [], ss = [], sd = [], ix = [];
  for (let i = 0; i <= seg; i++) for (const side of [-1, 1]) { vs.push(0, 0, 0); ss.push(i / seg); sd.push(side); }
  for (let i = 0; i < seg; i++) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  base.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3));
  base.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
  base.setAttribute('aSide', new THREE.Float32BufferAttribute(sd, 1));
  base.setIndex(ix);
  const aA = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const aB = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  base.setAttribute('aA', aA); base.setAttribute('aB', aB); base.setAttribute('aP', aP);
  base.instanceCount = 0;
  base.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e5);
  const U = { uTime: { value: 0 }, uWidth: { value: o.width ?? 0.16 }, uMinPx: { value: o.minPx ?? 1.3 }, uResY: { value: 1920 }, uTopFade: { value: o.topFade ?? 6 } };
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? '#e2d2b0', roughness: 0.9, transparent: true, depthWrite: false, side: THREE.DoubleSide, emissive: o.color ?? '#e2d2b0', emissiveIntensity: o.emissive ?? 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FIELD_PARS)
      .replace('#include <beginnormal_vertex>', FIELD_NORMAL)
      .replace('#include <begin_vertex>', 'vec3 transformed = rP + rSide * aSide;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha; varying vec2 vRUv;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float tw = 0.82 + 0.18 * sin( ( vRUv.x * 5.0 + vRUv.y * 0.8 ) * 6.2831 );
        diffuseColor.rgb *= tw;
        diffuseColor.a *= vAlpha;`);
  };
  mat.customProgramCacheKey = () => 'ropes-field-v1';
  const mesh = new THREE.Mesh(base, mat);
  mesh.name = o.name ?? 'rope_field'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.renderOrder = o.renderOrder ?? 3; mesh.userData.noShadowFit = true;
  const _sz = new THREE.Vector2();
  mesh.onBeforeRender = (renderer) => { const rt = renderer.getRenderTarget(); U.uResY.value = rt ? rt.height : renderer.getDrawingBufferSize(_sz).y; };
  (o.parent ?? S.root).add(mesh);
  if (o.name) S.groups[o.name] = mesh;
  if (o.autoHide && S.texts) S.texts.push({ update() { mesh.visible = false; } }); // per-frame: shown only by this frame's followCrowd/setPoints/commit
  const topOf = typeof o.top === 'function' ? o.top : () => o.top ?? 100;
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const setParams = (i) => {
    aP.setXYZW(i, (o.sway ?? 0.25) * (0.5 + hash(i, 1)), hash(i, 2), (o.quiver ?? 0.02) * hash(i, 3), (o.slack ?? 0) * (hash(i, 4) - 0.5) * 2);
  };
  for (let i = 0; i < max; i++) setParams(i);
  aP.needsUpdate = true;
  let shown = Infinity, n = 0;
  const setFoot = (i, x, y, z) => {
    aA.setXYZ(i, x, y, z);
    const dx = (hash(i, 5) - 0.5) * (o.lean ?? 0.6), dz = (hash(i, 6) - 0.5) * (o.lean ?? 0.6);
    aB.setXYZ(i, x + dx, topOf(x + dx, z + dz) + (o.inside ?? 3), z + dz);
  };
  const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
  const F = {
    mesh, uniforms: U,
    setPoints(list) {
      n = Math.min(max, list.length);
      list.slice(0, n).forEach((p, i) => setFoot(i, p[0], p[1], p[2]));
      aA.needsUpdate = aB.needsUpdate = true;
      base.instanceCount = Math.min(n, shown); mesh.visible = true;
      return F;
    },
    followCrowd(crowd, o2 = {}) {
      const im = crowd?.root?.children?.find((c) => c.isInstancedMesh && c.count === crowd.agents?.length) ?? crowd?.root?.children?.find((c) => c.isInstancedMesh);
      if (!im) return F;
      crowd.root.updateWorldMatrix(true, false);
      n = Math.min(max, im.count);
      const y0 = crowd.root.getWorldPosition(_v).y + (o2.ankle ?? 0.35);
      for (let i = 0; i < n; i++) {
        im.getMatrixAt(i, _m); _v.setFromMatrixPosition(_m).applyMatrix4(crowd.root.matrixWorld);
        setFoot(i, _v.x + (o2.dx ?? 0.25), y0, _v.z);
      }
      aA.needsUpdate = aB.needsUpdate = true;
      base.instanceCount = Math.min(n, shown); mesh.visible = true;
      return F;
    },
    // explicit ropes: seg(i, bottom, top) for i < k, then commit(k) (per frame for moving ends, e.g. a giant's fingers)
    seg(i, a, b) { aA.setXYZ(i, a.x ?? a[0], a.y ?? a[1], a.z ?? a[2]); aB.setXYZ(i, b.x ?? b[0], b.y ?? b[1], b.z ?? b[2]); return F; },
    commit(k) { n = Math.min(max, k); aA.needsUpdate = aB.needsUpdate = true; base.instanceCount = Math.min(n, shown); mesh.visible = true; return F; },
    count(k) { shown = k == null ? Infinity : Math.max(0, k); base.instanceCount = Math.min(n, shown); return F; },
    update(t) { U.uTime.value = t; return F; },
    visible(v) { mesh.visible = !!v; return F; },
  };
  return F;
}

// ---------------------------------------------------------------- prop preview (S.prop('rope'))
export default function rope(S, o = {}) {
  const g = S.group(null, { pivot: [0, 0, 0] });
  const R = heroRope(S, { parent: g, bell: o.bell !== false, autoHide: false });
  const H = o.height ?? 14;
  R.update({ from: [0, 0.45, 0], top: [o.demo === 'tight' ? 0 : -2.5, H, o.demo === 'tight' ? 0 : -7], tension: o.demo ?? 'slack', trail: 180, ground: 5, loose: 2, groundY: 0, t: 0.3, ring: 0.25 });
  R.cuff.position.set(0, 0.13, 0);
  return g;
}
