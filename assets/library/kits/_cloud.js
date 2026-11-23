// Shared library helper (browser only): the flat gray cloud of "The Ropes", seen from below (underside ceiling) or from
// above (moonlit top). One deterministic height function per side, so ropes can end exactly inside the cloud:
//   cloudUnderY(x, z, o) / cloudTopY(x, z, o)                -> studs (pure)
//   cloudLayer(S, { side: 'under'|'top', y, amp, R, segs, center, color, shade, glow, seed, holes: n, name })
//     -> { mesh, mat, setHole(i, { kind: 'eye'|'round', pos: [x, z], size: [rx, rz], open, rot, rim }), clearHoles(),
//          setGlow(v), heightAt(x, z) }
//     A displaced plane, dense in the centre (x = R (0.25 u + 0.75 u^3)), non-tiling world-space shading, up to 4 holes
//     (fragment discard + the lips curl into the hole in the vertex shader: an eyelid / a torn gap).
//   cloudWisps(S, { y, side, size, center, alpha, color, seed, name }) -> mesh   soft transparent mist sheet (depthWrite off)
//   puffs(S, { list: [[x, y, z, rx, ry, rz]], color, shade, glow, name }) -> InstancedMesh   cloud balls with the same shading
// Nothing here moves on its own (the story's cloud never moves); open holes / glow from the kit API each frame.
import * as THREE from 'three';
import { addWorldUniforms } from '../../../engine/runtime/world/materials.js';
import { toColor } from '../../../engine/runtime/world/palette.js';
import { fbm2, noise2, smooth } from './_matkit.js';

// ---------------------------------------------------------------- height functions (pure)
export function cloudUnderY(x, z, o = {}) {
  const y0 = o.y ?? 100, amp = o.amp ?? 9, s = o.seed ?? 7;
  const big = fbm2(x / 46, z / 46, s, 4), pil = noise2(x / 11 + 3.1, z / 11 - 1.7, s + 5), fine = noise2(x / 4.5, z / 4.5, s + 9);
  const hang = 0.5 * smooth(0.3, 0.8, big) + 0.4 * pil * pil * pil * 1.6 + 0.08 * fine; // mammatus pillows hanging down
  return y0 - amp * hang;
}
export function cloudTopY(x, z, o = {}) {
  const y0 = o.y ?? 0, amp = o.amp ?? 26, s = o.seed ?? 11;
  const big = fbm2(x / 160, z / 160, s, 4), mid = fbm2(x / 38, z / 38, s + 3, 3), bump = noise2(x / 9, z / 9, s + 7);
  return y0 + amp * (0.62 * smooth(0.28, 0.82, big) + 0.3 * mid + 0.08 * bump) - amp * 0.35;
}

// ---------------------------------------------------------------- shader pieces
const PARS = /* glsl */`
uniform vec4 uHole[4];   // cx, cz, rx, rz
uniform vec4 uHoleP[4];  // open, rot (rad), kind (0 eye almond, 1 round), rim (studs)
uniform float uSide;     // -1 under, +1 top
uniform float uPuffBump;
float cH( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float cN( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( cH( i ), cH( i + vec2( 1, 0 ) ), f.x ), mix( cH( i + vec2( 0, 1 ) ), cH( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float cF( vec2 p ) { return cN( p ) * 0.5 + cN( p * 2.03 + 7.1 ) * 0.27 + cN( p * 4.1 + 3.3 ) * 0.15 + cN( p * 8.3 + 1.7 ) * 0.08; }
// signed distance-ish (studs) to the hole boundary; < 0 inside
float holeD( vec2 w, int i ) {
  vec4 H = uHole[ i ], P = uHoleP[ i ];
  if ( P.x <= 0.001 ) return 1e4;
  vec2 d = w - H.xy; float c = cos( P.y ), s = sin( P.y ); d = vec2( c * d.x + s * d.y, -s * d.x + c * d.y );
  float wob = ( cN( w * 0.35 + float( i ) * 9.1 ) - 0.5 ) * 2.4;
  if ( P.z < 0.5 ) { // almond eye
    float ax = abs( d.x ) / H.z; if ( ax >= 1.0 ) return ( abs( d.x ) - H.z ) + abs( d.y ) + wob;
    float hh = H.w * P.x * pow( 1.0 - ax * ax, 0.75 );
    return abs( d.y ) - hh + wob;
  }
  return length( d / H.zw ) * min( H.z, H.w ) - min( H.z, H.w ) * P.x + wob;
}
float holeMin( vec2 w, out float rim ) {
  float m = 1e4; rim = 6.0;
  for ( int i = 0; i < 4; i++ ) { float d = holeD( w, i ); if ( d < m ) { m = d; rim = max( 1.0, uHoleP[ i ].w ); } }
  return m;
}
`;
const VERT_DISP = /* glsl */`
  #ifdef USE_INSTANCING
    { vec3 wp0 = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz; // cauliflower bumps on cloud balls
      float b = cF( wp0.xz * 0.09 + wp0.y * 0.05 ) * 0.6 + cN( wp0.xy * 0.24 + wp0.z * 0.11 ) * 0.4;
      transformed += normal * ( b - 0.45 ) * uPuffBump; }
    vCW = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
  #else
    vCW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
  #endif
  { float rim; float d = holeMin( vCW.xz, rim );
    float k = 1.0 - smoothstep( 0.0, rim, d );
    transformed.y -= uSide * k * k * rim * 0.9; } // the lip curls into the hole (up for the underside, down for the top)
`;
const FRAG = /* glsl */`
  { float rim; float d = holeMin( vCW.xz, rim );
    if ( d < 0.0 ) discard;
    float lip = 1.0 - smoothstep( 0.0, rim * 1.4, d );
    vec2 w = vCW.xz;
    float n = cF( w * 0.045 ), m = cF( w * 0.17 + 4.0 ), f = cN( w * 0.9 );
    float lift = clamp( ( vCW.y - uBaseY ) * uSide / max( 1.0, uAmp ), -1.0, 1.0 ); // top: crests brighter; under: hanging pillows brighter
    vec3 c = mix( uShade, uCol, clamp( 0.5 + 0.55 * lift + 0.4 * ( n - 0.5 ) + 0.2 * ( m - 0.5 ), 0.0, 1.0 ) );
    c *= 0.94 + 0.08 * f;
    c = mix( c, uShade * 0.45, lip * 0.75 ); // thick dark lip round an opening
    diffuseColor.rgb = c;
    cGlow = uGlow * ( 0.7 + 0.6 * n ) * ( 1.0 - lip * 0.8 );
  }
`;
// lighter distance fog on the cloud (uFogK x density^2): the ceiling keeps its shape far away instead of melting into haze
const FOG_SOFT = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth * uFogK );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth ) * uFogK;
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;
function cloudMaterial(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const holes = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 1, 1)), holeP = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 6));
  const U = { uHole: { value: holes }, uHoleP: { value: holeP }, uSide: { value: o.side === 'top' ? 1 : -1 }, uCol: { value: toColor(o.color ?? '#a7abb3') },
    uShade: { value: toColor(o.shade ?? '#5d636e') }, uGlow: { value: o.glow ?? 0 }, uGlowCol: { value: toColor(o.glowColor ?? '#8a9ac8') }, uBaseY: { value: o.baseY ?? 0 }, uAmp: { value: o.amp ?? 10 }, uPuffBump: { value: o.bump ?? 0.5 }, uFogK: { value: o.fogK ?? 1 } };
  m.onBeforeCompile = (sh) => {
    addWorldUniforms(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW;\n' + PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_DISP);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW;\nuniform vec3 uCol, uShade, uGlowCol;\nuniform float uGlow, uBaseY, uAmp;\nfloat cGlow = 0.0;\n' + PARS)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + FRAG)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += uGlowCol * cGlow;');
  };
  m.customProgramCacheKey = () => 'ropes-cloud-v1';
  m.userData.U = U;
  return m;
}

// ---------------------------------------------------------------- layer
export function cloudLayer(S, o = {}) {
  const side = o.side ?? 'under', R = o.R ?? 1500, segs = o.segs ?? 300, [cx, cz] = o.center ?? [0, 0];
  const hf = side === 'top' ? (x, z) => cloudTopY(x, z, o) : (x, z) => cloudUnderY(x, z, o);
  const geo = new THREE.PlaneGeometry(2, 2, segs, segs).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const map = (u) => R * (0.25 * u + 0.75 * u * u * u);
  for (let i = 0; i < p.count; i++) {
    const x = cx + map(p.getX(i)), z = cz + map(p.getZ(i));
    p.setXYZ(i, x, hf(x, z), z);
  }
  if (side === 'under') geo.index.array.reverse(); // face down (normals point -Y after computeVertexNormals)
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const baseY = side === 'top' ? o.y ?? 0 : (o.y ?? 100) - (o.amp ?? 9) * 0.5;
  const mat = cloudMaterial({ ...o, side, baseY, amp: o.amp ?? (side === 'top' ? 26 : 9) });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = o.name ?? `cloud_${side}`; mesh.castShadow = false; mesh.receiveShadow = side === 'top'; mesh.userData.noShadowFit = true;
  (o.parent ?? S.root).add(mesh);
  const U = mat.userData.U;
  return {
    mesh, mat, heightAt: hf,
    setHole(i, h = {}) {
      const [x, z] = h.pos ?? [0, 0], [rx, rz] = h.size ?? [20, 10];
      U.uHole.value[i].set(x, z, rx, rz);
      U.uHoleP.value[i].set(Math.max(0, h.open ?? 0), ((h.rot ?? 0) * Math.PI) / 180, h.kind === 'round' ? 1 : 0, h.rim ?? 6);
    },
    clearHoles() { for (const v of U.uHoleP.value) v.x = 0; },
    setGlow(v) { U.uGlow.value = v; },
  };
}

// ---------------------------------------------------------------- wisps (soft mist sheets)
export function cloudWisps(S, o = {}) {
  const size = o.size ?? 1400, [cx, cz] = o.center ?? [0, 0];
  const m = new THREE.MeshBasicMaterial({ color: toColor(o.color ?? '#9aa0aa'), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  const U = { uA: { value: o.alpha ?? 0.45 }, uSeed: { value: o.seed ?? 1 }, uScale: { value: o.scale ?? 0.03 } };
  m.onBeforeCompile = (sh) => {
    addWorldUniforms(sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;\nuniform float uA, uSeed, uScale;\n' + PARS.split('// signed')[0])
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec2 w = vWW.xz * uScale + uSeed * 13.7;
        float n = cF( w ) * 0.65 + cF( w * 3.1 + 2.0 ) * 0.35;
        diffuseColor.a *= uA * smoothstep( 0.42, 0.75, n );
        diffuseColor.rgb *= 0.9 + 0.2 * cN( w * 6.0 );`);
  };
  m.customProgramCacheKey = () => 'ropes-wisp-v1';
  const geo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(cx, o.y ?? 92, cz); mesh.name = o.name ?? 'wisps'; mesh.renderOrder = o.renderOrder ?? 2;
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.userData.noShadowFit = true;
  (o.parent ?? S.root).add(mesh);
  return mesh;
}

// ---------------------------------------------------------------- puffs (instanced cloud balls)
let puffGeo = null;
export function puffs(S, o = {}) {
  puffGeo ??= new THREE.IcosahedronGeometry(1, 4);
  const mat = cloudMaterial({ side: o.side ?? 'top', color: o.color ?? '#c3cbd9', shade: o.shade ?? '#5a6478', glow: o.glow ?? 0, glowColor: o.glowColor, baseY: o.baseY ?? 0, amp: o.amp ?? 30 });
  const list = o.list ?? [];
  const mesh = new THREE.InstancedMesh(puffGeo, mat, Math.max(1, list.length));
  const M = new THREE.Matrix4();
  list.forEach(([x, y, z, rx, ry, rz], i) => mesh.setMatrixAt(i, M.makeScale(rx, ry ?? rx, rz ?? rx).setPosition(x, y, z)));
  if (!list.length) mesh.count = 0;
  mesh.computeBoundingSphere();
  mesh.castShadow = false; mesh.receiveShadow = !!o.receiveShadow; mesh.name = o.name ?? 'puffs'; mesh.userData.noShadowFit = true;
  (o.parent ?? S.root).add(mesh);
  mesh.userData.setGlow = (v) => { mat.userData.U.uGlow.value = v; };
  return mesh;
}
