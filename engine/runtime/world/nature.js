// Terrain, water and Roblox-style puffy part-clouds.
//   S.terrain({ preset: 'plains'|'hills'|'mountains'|'savanna'|'dunes', size: [w, d], center: [x, z], res, seed,
//               height: (x, z) => y | { amp, scale, octaves, ridged }, flatten: [{ pos: [x, z], radius, height }],
//               edgeHills: { start, height }, base: 'Grass'|'Ground'|'Pebble'|'Sand', snowLine, sandLine, rockSlope, colors: { Grass: '#..' } })
//               paint: (x, y, z, slope) => 0..1 extra coverage of the 4th material (sand slot: set sand: 'Ground' for dirt roads/patches),
//     Smooth heightfield with Roblox terrain-like material bands blended per vertex (slope -> Rock, height -> Snow with a
//     jagged line, low -> Sand) and triplanar stud-space textures + derivative bump. Returns { mesh, heightAt }.
//   S.water({ level, size, center, color, shallowColor, waveHeight, waveLength, waveSpeed, opacity, foam })
//     Stylised waves (vertex sines + scrolling ripple normals), sky reflections via the environment + fresnel,
//     depth-tinted shallows and shoreline foam when a terrain exists.
//   S.clouds({ style: 'puffy', count, area: [x0, z0, x1, z1] | center + radius, height: [lo, hi], size: [lo, hi], drift: [vx, vz], clusters })
//     Clusters of white balls (as in Roblox builds, e.g. "[Cryptic Phrase]"); one InstancedMesh.
import * as THREE from 'three';
import { hash1, hashString, rng, smoothstep, clamp } from '../core/math.js';
import { MATERIALS, materialName, textureFor, addWorldUniforms, worldCompile } from './materials.js';
import { toColor } from './palette.js';

// 2D value noise / fbm (deterministic, seeded)
const h2 = (x, y, s) => hash1((x * 73856093) ^ (y * 19349663), s);
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 5, ridged = false) {
  let a = 0.5, t = 0, n = 0, f = 1;
  for (let o = 0; o < oct; o++) {
    let v = vnoise(x * f, y * f, s + o * 31);
    if (ridged) v = 1 - Math.abs(v * 2 - 1), v *= v;
    t += a * v; n += a; a *= 0.5; f *= 2.03;
  }
  return t / n;
}

const PRESETS = {
  plains: { amp: 3, scale: 120, base: 'Grass' },
  hills: { amp: 22, scale: 140, base: 'Grass', rockSlope: 0.5 },
  mountains: { amp: 150, scale: 260, ridged: true, base: 'Grass', snowLine: 95, rockSlope: 0.42, sandLine: null },
  savanna: { amp: 1.2, scale: 90, base: 'Pebble', colors: { Pebble: '#ad8a5e' }, edgeHills: { start: 260, height: 45 } },
  dunes: { amp: 9, scale: 70, base: 'Sand', rockSlope: 0.75 },
};
const TERRAIN_COLORS = { Grass: '#6d9a3c', LeafyGrass: '#5e8a3a', Ground: '#7a6046', Pebble: '#8c8a80', Sand: '#d9c48c', Rock: '#7c7f82', Snow: '#f4f7fa', Mud: '#5a4535', Sandstone: '#c4875a', Slate: '#5f6164', Basalt: '#4a4a50', Asphalt: '#555558' };

const TERRAIN_VERT_PARS = 'attribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vTW;\nvarying vec3 vTN;\n';
const TERRAIN_VERT = 'vSplat = splat;\nvTW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvTN = normalize( mat3( modelMatrix ) * objectNormal );\n';
const TERRAIN_FRAG_PARS = `
varying vec4 vSplat; varying vec3 vTW; varying vec3 vTN;
uniform sampler2D tTex0, tTex1, tTex2, tTex3;
uniform vec3 tCol0, tCol1, tCol2, tCol3;
uniform vec2 tTile0, tTile1, tTile2, tTile3;
uniform float tBump;
uniform vec4 tBumps;
vec2 triS( sampler2D t, vec2 tile, vec3 w ) {
  vec3 n = abs( normalize( vTN ) ); n = pow( n, vec3( 6.0 ) ); n /= n.x + n.y + n.z;
  vec2 a = texture2D( t, vTW.xz / tile ).rg, b = texture2D( t, vTW.zy / tile ).rg, c = texture2D( t, vTW.xy / tile ).rg;
  return a * n.y + b * n.x + c * n.z;
}
`;
const TERRAIN_MAP = `
vec2 s0 = triS( tTex0, tTile0, vTW ), s1 = triS( tTex1, tTile1, vTW ), s2 = triS( tTex2, tTile2, vTW ), s3 = triS( tTex3, tTile3, vTW );
vec4 tw = vSplat * ( vec4( s0.y, s1.y, s2.y, s3.y ) * 1.4 + 0.15 );   // height-aware blend: ragged, natural transitions
tw = pow( tw, vec4( 2.0 ) ); tw /= max( 1e-4, tw.x + tw.y + tw.z + tw.w );
diffuseColor.rgb = tCol0 * s0.x * tw.x + tCol1 * s1.x * tw.y + tCol2 * s2.x * tw.z + tCol3 * s3.x * tw.w;
float tH = dot( tw * tBumps, vec4( s0.y, s1.y, s2.y, s3.y ) );
`;
const TERRAIN_NORMAL = `
{
  vec3 dpdx = dFdx( - vViewPosition ), dpdy = dFdy( - vViewPosition );
  float hx = dFdx( tH ) * tBump, hy = dFdy( tH ) * tBump;
  vec3 r1 = cross( dpdy, normal ), r2 = cross( normal, dpdx );
  float det = dot( dpdx, r1 ) * faceDirection;
  normal = normalize( abs( det ) * normal - sign( det ) * ( hx * r1 + hy * r2 ) );
}
`;

export function createTerrain(o = {}) {
  const P = { ...PRESETS[o.preset ?? 'plains'], ...o, colors: { ...TERRAIN_COLORS, ...PRESETS[o.preset ?? 'plains']?.colors, ...o.colors } };
  const [W, D] = Array.isArray(P.size) ? P.size : [P.size ?? 600, P.size ?? 600];
  const [cx, cz] = P.center ?? [0, 0];
  const res = Math.max(P.res ?? Math.max(2, Math.max(W, D) / 300), Math.max(W, D) / 400);
  const nx = Math.round(W / res), nz = Math.round(D / res), seed = typeof P.seed === 'string' ? hashString(P.seed) : P.seed ?? 7;
  const fn = typeof P.height === 'function' ? P.height : (x, z) => {
    let y = (fbm(x / P.scale, z / P.scale, seed, 6, !!P.ridged) - (P.ridged ? 0.25 : 0.5)) * P.amp * (P.ridged ? 1.6 : 2);
    if (P.edgeHills) {
      const dist = Math.hypot(x - cx, z - cz);
      y += smoothstep(P.edgeHills.start, P.edgeHills.start + 220, dist) * (fbm(x / 160, z / 160, seed + 5, 4) * 1.3) * P.edgeHills.height;
    }
    for (const f of P.flatten ?? []) {
      const k = smoothstep(f.radius + (f.falloff ?? f.radius), f.radius, Math.hypot(x - f.pos[0], z - f.pos[1]));
      y += ((f.height ?? 0) - y) * k;
    }
    return y + (P.y ?? 0);
  };
  const geo = new THREE.PlaneGeometry(W, D, nx, nz).rotateX(-Math.PI / 2).translate(cx, 0, cz);
  const pos = geo.attributes.position, grid = new Float32Array((nx + 1) * (nz + 1));
  for (let i = 0; i < pos.count; i++) { const y = fn(pos.getX(i), pos.getZ(i)); pos.setY(i, y); grid[i] = y; }
  geo.computeVertexNormals();
  // material slots: 0 base, 1 rock, 2 snow, 3 sand
  const slots = [materialName(P.base ?? 'Grass'), materialName(P.rock ?? 'Rock'), materialName(P.snow ?? 'Snow'), materialName(P.sand ?? 'Sand')];
  const splat = new Float32Array(pos.count * 4), nrm = geo.attributes.normal;
  const rockSlope = P.rockSlope ?? 0.55, snow = P.snowLine ?? null, sand = P.sandLine === undefined ? (P.water != null ? P.water + 1.5 : null) : P.sandLine;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), slope = 1 - nrm.getY(i);
    const rock = smoothstep(rockSlope - 0.08, rockSlope + 0.08, slope);
    const jag = (fbm(x / 18, z / 18, seed + 11, 3) - 0.5) * 22;
    const sn = snow == null ? 0 : smoothstep(snow - 4, snow + 4, y + jag) * (1 - rock * 0.55);
    let sa = sand == null ? 0 : smoothstep(sand + 1.2, sand - 0.8, y) * (1 - rock);
    if (P.paint) sa = Math.max(sa, clamp(P.paint(x, y, z, slope), 0, 1) * (1 - rock * 0.6) * (1 - sn)); // extra slot-3 coverage (dirt roads, patches)
    const base = Math.max(0, 1 - rock - sn - sa);
    splat.set([base, rock * (1 - sn * 0.6), sn, sa], i * 4);
  }
  geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 });
  const tex = slots.map((n) => textureFor(MATERIALS[n][2] ?? 'plastic'));
  const cols = slots.map((n) => toColor(P.colors[n] ?? MATERIALS[n][3]));
  mat.onBeforeCompile = (shader) => {
    addWorldUniforms(shader);
    tex.forEach((t, i) => { shader.uniforms[`tTex${i}`] = { value: t }; shader.uniforms[`tCol${i}`] = { value: cols[i] }; shader.uniforms[`tTile${i}`] = { value: new THREE.Vector2(...t.userData.tile) }; });
    shader.uniforms.tBump = { value: P.bump ?? 1 };
    shader.uniforms.tBumps = { value: new THREE.Vector4(...tex.map((t) => Math.min(1.6, t.userData.bump * 22))) }; // per-material relief
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + TERRAIN_VERT_PARS).replace('#include <fog_vertex>', '#include <fog_vertex>\n' + TERRAIN_VERT);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + TERRAIN_FRAG_PARS)
      .replace('#include <map_fragment>', TERRAIN_MAP).replace('#include <normal_fragment_maps>', TERRAIN_NORMAL);
  };
  mat.customProgramCacheKey = () => 'world-terrain';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true; mesh.castShadow = P.castShadow ?? P.amp > 8;
  mesh.name = 'terrain'; mesh.userData.noShadowFit = true;
  const x0 = cx - W / 2, z0 = cz - D / 2;
  const heightAt = (x, z) => { // bilinear on the mesh grid (matches the rendered surface closely)
    const gx = clamp((x - x0) / res, 0, nx - 1e-4), gz = clamp((z - z0) / res, 0, nz - 1e-4), ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
    const g = (i, j) => grid[j * (nx + 1) + i];
    return (g(ix, iz) * (1 - fx) + g(ix + 1, iz) * fx) * (1 - fz) + (g(ix, iz + 1) * (1 - fx) + g(ix + 1, iz + 1) * fx) * fz;
  };
  return { mesh, heightAt };
}

// ---------- water ----------
let rippleTex = null;
function ripples() { // tileable ripple normal map (RGB normal), drawn once
  if (rippleTex) return rippleTex;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d'), img = ctx.createImageData(N, N), H = new Float32Array(N * N);
  const vn = (u, v, p, s) => { const x = u * p, y = v * p, ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, a = fx * fx * (3 - 2 * fx), b = fy * fy * (3 - 2 * fy);
    const per = (i) => ((i % p) + p) % p; const q = (i, j) => h2(per(i), per(j), s);
    return q(ix, iy) + (q(ix + 1, iy) - q(ix, iy)) * a + (q(ix, iy + 1) - q(ix, iy)) * b + (q(ix, iy) - q(ix + 1, iy) - q(ix, iy + 1) + q(ix + 1, iy + 1)) * a * b; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; H[y * N + x] = vn(u, v, 6, 3) * 0.6 + vn(u, v, 12, 5) * 0.3 + vn(u, v, 24, 7) * 0.1; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = H[y * N + ((x + 1) % N)] - H[y * N + ((x - 1 + N) % N)], dy = H[((y + 1) % N) * N + x] - H[((y - 1 + N) % N) * N + x];
    const n = new THREE.Vector3(-dx * 6, -dy * 6, 1).normalize(), i = (y * N + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  rippleTex = new THREE.CanvasTexture(c);
  rippleTex.wrapS = rippleTex.wrapT = THREE.RepeatWrapping;
  rippleTex.colorSpace = THREE.NoColorSpace;
  return rippleTex;
}

const WATER_VERT_PARS = `
attribute float wDepth;
uniform float wTime, wAmp, wLen, wSpeed;
varying float vDepth; varying vec2 vWXZ;
vec3 waveAt( vec2 p, out vec3 n ) {
  float k = 6.2831853 / wLen, y = 0.0; vec2 g = vec2( 0.0 );
  vec2 D[3]; D[0] = vec2( 1.0, 0.25 ); D[1] = vec2( -0.4, 1.0 ); D[2] = vec2( 0.7, -0.7 );
  float A[3]; A[0] = 1.0; A[1] = 0.6; A[2] = 0.35;
  float F[3]; F[0] = 1.0; F[1] = 1.7; F[2] = 2.6;
  for ( int i = 0; i < 3; i++ ) {
    vec2 d = normalize( D[i] ); float kk = k * F[i], ph = dot( d, p ) * kk + wTime * wSpeed * sqrt( kk * 9.8 ) * 0.35;
    y += A[i] * sin( ph ); g += A[i] * kk * cos( ph ) * d;
  }
  float amp = wAmp * clamp( wDepth / 3.0, 0.15, 1.0 );
  n = normalize( vec3( - g.x * amp, 1.0, - g.y * amp ) );
  return vec3( 0.0, y * amp, 0.0 );
}
`;
const WATER_FRAG_PARS = `
uniform float wTime, wFoam, wDepthFade, wNormal;
uniform vec3 wDeep, wShallow;
uniform sampler2D wRipple;
varying float vDepth; varying vec2 vWXZ;
`;

export function createWater(o = {}) {
  const level = o.level ?? 0, [W, D] = Array.isArray(o.size) ? o.size : [o.size ?? 800, o.size ?? 800], [cx, cz] = o.center ?? [0, 0];
  const res = o.res ?? Math.max(2, Math.max(W, D) / 260);
  const geo = new THREE.PlaneGeometry(W, D, Math.round(W / res), Math.round(D / res)).rotateX(-Math.PI / 2).translate(cx, level, cz);
  const p = geo.attributes.position, depth = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) depth[i] = o.heightAt ? level - o.heightAt(p.getX(i), p.getZ(i)) : 30;
  geo.setAttribute('wDepth', new THREE.BufferAttribute(depth, 1));
  const U = {
    wTime: { value: 0 }, wAmp: { value: o.waveHeight ?? 0.35 }, wLen: { value: o.waveLength ?? 22 }, wSpeed: { value: o.waveSpeed ?? 1 },
    wFoam: { value: o.foam === false ? 0 : 1 }, wDepthFade: { value: o.depthFade ?? 9 }, wNormal: { value: o.ripple ?? 0.35 },
    wDeep: { value: toColor(o.color ?? '#0f6f8c') }, wShallow: { value: toColor(o.shallowColor ?? '#3fd0d4') }, wRipple: { value: ripples() },
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.roughness ?? 0.05, metalness: 0, transparent: true, opacity: o.opacity ?? 0.88, envMapIntensity: o.reflect ?? 1.25, depthWrite: false });
  mat.onBeforeCompile = (shader) => {
    addWorldUniforms(shader);
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + WATER_VERT_PARS)
      .replace('#include <beginnormal_vertex>', 'vec3 wN; vec3 wOff = waveAt( ( modelMatrix * vec4( position, 1.0 ) ).xz, wN );\nvec3 objectNormal = wN;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = position + wOff;\nvDepth = wDepth; vWXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + WATER_FRAG_PARS)
      .replace('#include <map_fragment>', `
        float wk = smoothstep( 0.0, wDepthFade, vDepth );
        diffuseColor.rgb = mix( wShallow, wDeep, wk );
        diffuseColor.a *= mix( 0.55, 1.0, wk );
        float foamN = texture2D( wRipple, vWXZ / 9.0 + vec2( wTime * 0.03, 0.0 ) ).r;
        float foam = wFoam * smoothstep( 1.1 + 0.25 * sin( wTime * 1.3 + vWXZ.x * 0.15 ), 0.25, vDepth + foamN * 0.6 );
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), foam * 0.9 );
        diffuseColor.a = mix( diffuseColor.a, 1.0, foam );`)
      .replace('#include <normal_fragment_maps>', `{
        vec3 r1 = texture2D( wRipple, vWXZ / 23.0 + vec2( wTime * 0.021, wTime * 0.013 ) ).xyz * 2.0 - 1.0;
        vec3 r2 = texture2D( wRipple, vWXZ / 41.0 + vec2( - wTime * 0.017, wTime * 0.024 ) ).xyz * 2.0 - 1.0;
        vec2 rp = ( r1.xy + r2.xy ) * wNormal;
        normal = normalize( normal + mat3( viewMatrix ) * vec3( rp.x, 0.0, rp.y ) );
      }`);
  };
  mat.customProgramCacheKey = () => 'world-water';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true; mesh.name = 'water'; mesh.userData.noShadowFit = true; mesh.renderOrder = 1;
  return { mesh, update(t) { U.wTime.value = t; } };
}

// ---------- puffy part clouds ----------
let cloudMat = null;
export function createClouds(o = {}) {
  const r = rng(`clouds:${o.seed ?? 1}:${o.count ?? 6}`);
  const [hlo, hhi] = o.height ?? [70, 110], [slo, shi] = o.size ?? [9, 18];
  const area = o.area ?? (o.center ? [o.center[0] - (o.radius ?? 150), o.center[1] - (o.radius ?? 150), o.center[0] + (o.radius ?? 150), o.center[1] + (o.radius ?? 150)] : [-160, -220, 160, 60]);
  const clusters = o.clusters ?? Array.from({ length: o.count ?? 6 }, () => ({
    pos: [area[0] + (area[2] - area[0]) * r(), hlo + (hhi - hlo) * r(), area[1] + (area[3] - area[1]) * r()], size: slo + (shi - slo) * r(),
  }));
  const balls = [];
  for (const c of clusters) {
    const R0 = c.size, n = c.balls ?? 7 + Math.floor(r() * 6), base = c.pos[1] - R0 * 0.35;
    balls.push([c.pos[0], c.pos[1], c.pos[2], R0]);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.8, d = R0 * (0.75 + 0.55 * r()), rr = R0 * (0.5 + 0.35 * r());
      const y = Math.max(base + rr * 0.6, c.pos[1] + (r() - 0.6) * R0 * 0.5);
      balls.push([c.pos[0] + Math.cos(a) * d * 1.25, y, c.pos[2] + Math.sin(a) * d * 0.8, rr]);
    }
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) balls.push([c.pos[0] + (r() - 0.5) * R0, c.pos[1] + R0 * (0.45 + 0.3 * r()), c.pos[2] + (r() - 0.5) * R0 * 0.6, R0 * (0.55 + 0.25 * r())]);
  }
  cloudMat ??= (() => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.55 });
    m.onBeforeCompile = worldCompile;
    return m;
  })();
  const mat = o.color || o.transparency ? new THREE.MeshStandardMaterial({ color: toColor(o.color ?? '#ffffff'), roughness: 0.95, emissive: toColor(o.color ?? '#ffffff'), emissiveIntensity: 0.55, transparent: !!o.transparency, opacity: 1 - (o.transparency ?? 0), depthWrite: !o.transparency }) : cloudMat;
  const geo = new THREE.SphereGeometry(1, 24, 16);
  const mesh = new THREE.InstancedMesh(geo, mat, balls.length);
  mesh.castShadow = !!o.shadows; mesh.receiveShadow = false; mesh.name = 'clouds'; mesh.userData.noShadowFit = true;
  const m4 = new THREE.Matrix4(), drift = o.drift ?? [0.6, 0];
  const place = (t) => {
    balls.forEach(([x, y, z, rr], i) => { m4.makeScale(rr, rr * 0.92, rr).setPosition(x + drift[0] * t, y, z + drift[1] * t); mesh.setMatrixAt(i, m4); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  mesh.computeBoundingSphere();
  mesh.frustumCulled = false;
  return { mesh, update(t, L) { place(t); mat.emissiveIntensity = 0.55 * (1 - 0.85 * (L?.lights ?? 0)); } };
}
