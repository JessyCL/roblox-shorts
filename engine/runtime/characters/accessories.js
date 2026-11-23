// Procedural hair, hats, face/back accessories, held props and chest label plates (chunky UGC style, glossy plastic).
// Everything is built from primitives, merged per style and cached per head size; attached to rig anchors.
//   hair: 'spiky'|'messy'|'slicked'|'pompadour'|'fringe'|'bob'|'bun'|'long'|'ponytail'|'pigtails'|'curly'|'afro'|'bald'
//   beard: 'beard'|'full'|'mustache'|'stubble'
//   hats: cap flatcap beanie chef tophat sunhat crown hardhat partyhat flowercrown; face: glasses sunglasses goggles headphones
//   back/body: backpack satchel; held (hand_r/hand_l): whistle apple rake sign phone clipboard envelope hammer rock box
//   label: chest plate { text, color, bg, border } (or `envelope` prop with wax seal)
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep, lerp } from '../core/math.js';

const matCache = new Map();
export function mat(color, { rough = 0.32, metal = 0, map = null, transparent = false, opacity = 1, emissive } = {}) {
  const key = [color, rough, metal, map?.uuid, opacity, emissive].join('|');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, map, transparent: transparent || opacity < 1, opacity, emissive: emissive ?? 0x000000, depthWrite: opacity >= 1 }));
  return matCache.get(key);
}
const GOLD = { rough: 0.25, metal: 1 };

// Parametric poles give zero-length normals -> NaN shading that bloom spreads over the whole frame. Patch them.
function fixNormals(g) {
  const n = g.attributes.normal;
  if (n) for (let i = 0; i < n.count; i++) if (Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) < 1e-4) n.setXYZ(i, 0, 1, 0);
  return g;
}
function merge(geos) {
  const list = geos.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) { if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); }
  return fixNormals(mergeGeometries(list));
}
const place = (g, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], q } = {}) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), q ?? new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
  return g.applyMatrix4(m);
};
const UP = new THREE.Vector3(0, 1, 0);
const aim = (dir) => new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize());
let Q = 1; // geometry resolution (crowd LOD sets 0.35 while building)
const seg = (n, min = 3) => Math.max(min, Math.round(n * Q));
const tri = (x) => 1 - Math.abs(((x % 2) + 2) % 2 - 1) * 2; // triangle wave in [-1,1]

// Rounded-cylinder head profile walked from the top centre (s = 0) downward: {x: radius, y, nx, ny}.
function profile(head) {
  const r = head.r, hh = head.h / 2, f = Math.min(head.fillet, r * 0.9, hh * 0.9);
  const L1 = r - f, L2 = (Math.PI * f) / 2, L3 = 2 * (hh - f);
  const at = (s) => {
    if (s <= L1) return { x: s, y: hh, nx: 0, ny: 1 };
    if (s <= L1 + L2) { const t = (s - L1) / f; return { x: r - f + f * Math.sin(t), y: hh - f + f * Math.cos(t), nx: Math.sin(t), ny: Math.cos(t) }; }
    if (s <= L1 + L2 + L3) return { x: r, y: hh - f - (s - L1 - L2), nx: 1, ny: 0 };
    const t = Math.min(Math.PI / 2, (s - L1 - L2 - L3) / f); return { x: r - f + f * Math.cos(t), y: -hh + f - f * Math.sin(t), nx: Math.cos(t), ny: -Math.sin(t) };
  };
  const sOfY = (y) => {
    if (y >= hh - f) return L1 + f * Math.acos(Math.min(1, (y - (hh - f)) / f));
    if (y >= -hh + f) return L1 + L2 + (hh - f - y);
    return L1 + L2 + L3 + f * Math.asin(Math.min(1, (-hh + f - y) / f));
  };
  return { at, sOfY, r, hh, f };
}

// Hair shell hugging the head down to cut(phi). front/side/back = cut heights (studs, head-centre space),
// fw = half-width (rad) of the front band, zz/zn = zig-zag fringe amplitude/count, t = thickness, flare = extra at edge.
function shell(head, o) {
  const P = profile(head);
  const { front, side, back = side, fw = 0.75, soft = 0.5, zz = 0, zn = 7, t = 0.08, flare = 0, top = 0.05, phiRange = Math.PI, v0 = 0, gap = 0 } = o;
  const cut = (phi) => {
    const a = Math.abs(phi);
    const sb = lerp(side, back, smoothstep(Math.PI * 0.45, Math.PI, a));
    let y = lerp(front, sb, smoothstep(fw, fw + soft, a));
    if (zz) y -= zz * (0.5 + 0.5 * tri((phi / Math.PI) * zn)) * (1 - smoothstep(fw, fw + soft * 2, a));
    return y;
  };
  return new ParametricGeometry((u, v, out) => {
    let phi = phiRange - gap - u * (2 * phiRange - 2 * gap); // reversed so faces point outward
    if (gap) { phi += Math.PI; if (phi > Math.PI) phi -= Math.PI * 2; } // `gap` = bare front half-angle (ring of hair round the back)
    const sc = P.sOfY(cut(phi)), p = P.at((v0 + (1 - v0) * v) * sc);
    const th = (t + top * (1 - v) * (1 - v)) * (1 - 0.6 * smoothstep(0.82, 1, v)) + flare * smoothstep(0.6, 1, v);
    const rad = p.x + p.nx * th, y = p.y + p.ny * th;
    out.set(Math.sin(phi) * rad, y, Math.cos(phi) * rad);
  }, seg(48, 12), seg(18, 5));
}

function spikes(head, n, { len = 0.7, rad = 0.17, up = 0.8, back = 0.4, ring = [0.2, 0.75], seed = 1, arc = [-Math.PI, Math.PI] } = {}) {
  const geos = [], P = profile(head), r = head.r;
  for (let i = 0; i < n; i++) {
    const phi = arc[0] + ((i + 0.5) / n) * (arc[1] - arc[0]) + seed * 0.11, h = ((i * 7919) % 13) / 13;
    const v = lerp(ring[0], ring[1], h), p = P.at(v * P.sOfY(-P.hh * 0.2));
    const pos = [Math.sin(phi) * p.x * 0.92, p.y * 0.95, Math.cos(phi) * p.x * 0.92];
    const dir = [Math.sin(phi) * p.nx + 0, p.ny * 0.6 + up, Math.cos(phi) * p.nx - back];
    const L = r * len * (0.8 + 0.4 * ((i * 31) % 7) / 7);
    geos.push(place(new THREE.ConeGeometry(r * rad, L, seg(7, 4)).translate(0, L / 2, 0), { p: pos, q: aim(dir) }));
  }
  return geos;
}
const blob = (p, s, r = [0, 0, 0]) => place(new THREE.SphereGeometry(1, seg(16, 6), seg(12, 4)), { p, s, r });

const hairCache = new Map();
export function hairGeometry(style, head, lod = 0) {
  const key = style + JSON.stringify(head) + lod;
  if (hairCache.has(key)) return hairCache.get(key);
  Q = lod ? 0.35 : 1;
  const r = head.r, hh = head.h / 2, Fu = Math.min(2 * r, head.h);
  const brow = 0.34 * Fu; // forehead line just above the brows
  let g = null;
  switch (style) {
    case 'spiky': g = merge([shell(head, { front: brow - 0.02, side: 0.0, back: -hh * 0.5, zz: 0.1, zn: 9, t: 0.09 }), ...spikes(head, 13, { len: 0.85, rad: 0.2, up: 0.9, back: 0.5 }), ...spikes(head, 6, { len: 0.6, rad: 0.17, up: -0.1, back: 0.5, ring: [0.8, 0.9], seed: 3, arc: [Math.PI * 0.45, Math.PI * 1.55] })]); break;
    case 'messy': g = merge([shell(head, { front: brow - 0.03, side: 0.02, back: -hh * 0.45, zz: 0.12, zn: 6, t: 0.1, top: 0.1 }),
      ...[[0, 1], [0.6, 0.8], [-0.6, 0.85], [2.2, 0.7], [-2.2, 0.75], [3.1, 0.7], [1.3, 0.9], [-1.3, 0.9]].map(([a, k]) => blob([Math.sin(a) * r * 0.55, hh + 0.02, Math.cos(a) * r * 0.55], [r * 0.38 * k, r * 0.22, r * 0.3], [0.3 * Math.cos(a), a, 0.3 * Math.sin(a)]))]); break;
    case 'slicked': case 'pompadour': {
      const k = style === 'pompadour' ? 1.7 : 1;
      g = merge([shell(head, { front: brow + 0.02, side: 0.05, back: -hh * 0.45, t: 0.08, top: 0.08 }), blob([0, hh + 0.04 * k, r * 0.3], [r * 0.82, r * 0.24 * k, r * 0.62], [-0.35, 0, 0]), blob([0, hh, -r * 0.1], [r * 0.95, r * 0.18, r * 0.8])]); break;
    }
    case 'fringe': g = merge([shell(head, { front: 0.12 * Fu, side: 0.0, back: -hh * 0.4, zz: 0.08, zn: 5, t: 0.11, top: 0.12, fw: 0.9 }), ...[[0.5, 0], [-0.5, 0], [1.6, 0.1], [-1.6, 0.1]].map(([a]) => blob([Math.sin(a) * r * 0.6, hh - 0.02, Math.cos(a) * r * 0.6], [r * 0.4, r * 0.25, r * 0.35]))]); break;
    case 'balding': g = shell(head, { front: 0.1, side: -0.1, back: -hh * 0.4, fw: 0.9, soft: 0.6, t: 0.1, top: 0.02, v0: 0.5, gap: 0.95 }); break;
    case 'bob': g = shell(head, { front: 0.24 * Fu, side: -hh * 0.62, back: -hh * 0.75, fw: 0.62, soft: 0.25, t: 0.1, top: 0.08, flare: 0.07 }); break;
    case 'bun': g = merge([shell(head, { front: brow + 0.03, side: 0.0, back: -hh * 0.3, t: 0.07 }), blob([0, hh * 0.85, -r * 0.72], [r * 0.45, r * 0.42, r * 0.42]), place(new THREE.TorusGeometry(r * 0.3, r * 0.06, 8, 20), { p: [0, hh * 0.72, -r * 0.6], r: [-0.9, 0, 0] })]); break;
    case 'long': g = merge([shell(head, { front: brow, side: -hh * 0.4, back: -hh, fw: 0.6, soft: 0.4, t: 0.09, top: 0.08, flare: 0.05 }), place(new THREE.BoxGeometry(2 * r * 0.95, 1.6, 0.28, 1, 4, 1), { p: [0, -hh - 0.55, -r * 0.62], r: [0.12, 0, 0] })]); break;
    case 'ponytail': g = merge([shell(head, { front: brow, side: 0.0, back: -hh * 0.3, t: 0.07 }), place(new THREE.TorusGeometry(r * 0.16, r * 0.06, 8, 16), { p: [0, 0.05, -r - 0.04], r: [0.4, 0, 0] }),
      place(new THREE.CapsuleGeometry(r * 0.22, 1.0, 6, 12).scale(1, 1, 0.8), { p: [0, -0.5, -r - 0.22], r: [0.35, 0, 0] })]); break;
    case 'pigtails': g = merge([shell(head, { front: brow, side: -0.05, back: -hh * 0.35, t: 0.07 }), ...[-1, 1].flatMap((s) => [place(new THREE.CapsuleGeometry(r * 0.2, 0.75, 6, 12), { p: [s * (r + 0.15), -0.25, -r * 0.25], r: [0, 0, s * 0.35] }), blob([s * (r + 0.02), 0.15, -r * 0.25], [0.12, 0.12, 0.12])])]); break;
    case 'curly': case 'afro': {
      const k = style === 'afro' ? 1.3 : 1, geos = [shell(head, { front: brow, side: -0.05, back: -hh * 0.5, t: 0.1 })];
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39996, y = 1 - (i / 21) * 1.15, rr = Math.sqrt(Math.max(0, 1 - y * y));
        const dir = new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr);
        if (dir.z > 0.55 && dir.y < 0.45) continue; // keep the face clear
        geos.push(blob([dir.x * r * 1.0 * k, hh * 0.25 + dir.y * hh * 0.85 * k, dir.z * r * 1.0 * k - (k - 1) * 0.15], [r * 0.34 * k, r * 0.34 * k, r * 0.34 * k]));
      }
      g = merge(geos); break;
    }
    case 'beard': case 'full': {
      const mouth = -0.215 * Fu;
      const base = new ParametricGeometry((u, v, out) => {
        const phi = 1.75 - u * 3.5, P = profile(head);
        const topY = lerp(mouth - 0.06 * Fu, style === 'full' ? 0.08 : -0.05, smoothstep(0.5, 1.5, Math.abs(phi)));
        const s0 = P.sOfY(topY), s1 = P.sOfY(-hh) + 0.25 * (head.fillet);
        const p = P.at(lerp(s0, s1, v)), th = 0.06 + 0.1 * Math.sin(v * Math.PI) * (1 - smoothstep(1.2, 1.75, Math.abs(phi)));
        out.set(Math.sin(phi) * (p.x + p.nx * th), p.y + p.ny * th - v * 0.12, Math.cos(phi) * (p.x + p.nx * th));
      }, 32, 10);
      const geos = [base];
      if (style === 'full') for (let i = -2; i <= 2; i++) geos.push(blob([i * r * 0.22, -hh - 0.1 - (2 - Math.abs(i)) * 0.04, r * 0.75 - Math.abs(i) * 0.08], [r * 0.24, r * 0.26, r * 0.2]));
      geos.push(...[-1, 1].map((s) => blob([s * 0.1 * Fu, mouth + 0.075 * Fu, r + 0.02], [0.12 * Fu, 0.045 * Fu, 0.05], [0, 0, s * -0.25])));
      g = merge(geos); break;
    }
    case 'mustache': { const mouth = -0.215 * Fu; g = merge([-1, 1].map((s) => blob([s * 0.1 * Fu, mouth + 0.075 * Fu, r * 0.97], [0.13 * Fu, 0.05 * Fu, 0.06], [0, 0, s * -0.3]))); break; }
    case 'stubble': g = null; break;
    default: g = null;
  }
  if (g) fixNormals(g);
  Q = 1;
  hairCache.set(key, g);
  return g;
}
export const HAIR_LIFT = { spiky: 0.22, messy: 0.1, curly: 0.25, afro: 0.45, slicked: 0.08, pompadour: 0.18, fringe: 0.1, bob: 0.06, long: 0.05, bun: 0.03, ponytail: 0.03, pigtails: 0.03 };

// ---------- hats & face accessories (head-centre space) ----------
function hatGroup(type, o, head, lift) {
  const r = head.r, hh = head.h / 2, Fu = Math.min(2 * r, head.h), G = new THREE.Group();
  const c = o.color, c2 = o.color2;
  const add = (geo, m, tr) => { const mesh = new THREE.Mesh(tr ? place(geo, tr) : geo, m); mesh.castShadow = true; G.add(mesh); return mesh; };
  const dome = (rad, h, y, open = Math.PI / 2) => new THREE.SphereGeometry(rad, 28, 14, 0, Math.PI * 2, 0, open).scale(1, h / rad, 1).translate(0, y, 0);
  const y0 = hh * 0.35 + lift;
  switch (type) {
    case 'cap': case 'flatcap': {
      const flat = type === 'flatcap';
      add(dome(r * 1.1, (flat ? hh * 0.65 + 0.12 : hh * 0.9) , y0), mat(c ?? (flat ? '#6b6b6b' : '#c4281c'), { rough: flat ? 0.75 : 0.45 }));
      add(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.06, 28, 1, false, -Math.PI / 2, Math.PI), mat(c2 ?? shade(c ?? (flat ? '#6b6b6b' : '#c4281c'), 0.85), { rough: 0.5 }), { p: [0, y0 + 0.02, r * 0.55], s: [1, 1, flat ? 0.75 : 1.15], r: [0.12, 0, 0] });
      if (!flat) add(new THREE.SphereGeometry(0.07, 10, 8), mat(c2 ?? shade(c ?? '#c4281c', 0.85)), { p: [0, y0 + hh * 0.85, 0] });
      if (o.logo) add(new THREE.CircleGeometry(0.18, 20), mat(o.logo, { rough: 0.5 }), { p: [0, y0 + hh * 0.42, r * 1.0], r: [-0.45, 0, 0] });
      break;
    }
    case 'beanie': add(dome(r * 1.1, hh * 1.0, hh * 0.25 + lift), mat(c ?? '#2f6fd6', { rough: 0.85 })); add(new THREE.CylinderGeometry(r * 1.14, r * 1.14, 0.26, 28, 1, true), mat(shade(c ?? '#2f6fd6', 0.85), { rough: 0.85 }), { p: [0, hh * 0.32 + lift, 0] });
      if (o.pom !== false) add(new THREE.SphereGeometry(0.17, 12, 10), mat(c2 ?? '#f2f2f2', { rough: 0.9 }), { p: [0, hh * 1.28 + lift, 0] }); break;
    case 'chef': { const m = mat(c ?? '#f6f4ee', { rough: 0.85 }); // baker's toque: band + tall crown + puffy top
      add(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.34, 28), m, { p: [0, hh * 0.92 + lift, 0] });
      add(new THREE.CylinderGeometry(r * 1.02, r * 0.9, 0.7, 28), m, { p: [0, hh * 0.92 + 0.5 + lift, 0] });
      for (const [x, z] of [[0, 0], [0.32, 0.12], [-0.3, 0.14], [0.1, -0.3], [-0.18, -0.22]]) add(new THREE.SphereGeometry(r * 0.55, 16, 12), m, { p: [x * r, hh * 0.92 + 0.95 + lift, z * r] });
      break; }
    case 'tophat': add(new THREE.CylinderGeometry(r * 0.85, r * 0.82, 1.0, 28), mat(c ?? '#1d1d1f', { rough: 0.35, ...(o.gold ? GOLD : {}) }), { p: [0, hh + 0.48 + lift, 0] });
      add(new THREE.CylinderGeometry(r * 1.5, r * 1.5, 0.06, 32), mat(c ?? '#1d1d1f', { rough: 0.35, ...(o.gold ? GOLD : {}) }), { p: [0, hh + 0.0 + lift, 0] });
      add(new THREE.CylinderGeometry(r * 0.87, r * 0.86, 0.18, 28), mat(c2 ?? '#8b1a1a', { rough: 0.5 }), { p: [0, hh + 0.12 + lift, 0] }); break;
    case 'sunhat': {
      const pts = [new THREE.Vector2(r * 2.0, -0.12), new THREE.Vector2(r * 1.5, 0.0), new THREE.Vector2(r * 0.98, 0.03), new THREE.Vector2(r * 0.98, 0.3), new THREE.Vector2(r * 0.8, 0.5), new THREE.Vector2(0, 0.55)];
      add(new THREE.LatheGeometry(pts, 36), mat(c ?? '#f1d7a0', { rough: 0.7 }), { p: [0, hh * 0.6 + lift, 0] }).material.side = THREE.DoubleSide;
      add(new THREE.CylinderGeometry(r * 1.0, r * 1.0, 0.14, 28, 1, true), mat(c2 ?? '#e05a8a', { rough: 0.5 }), { p: [0, hh * 0.6 + 0.1 + lift, 0] });
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.16, 12, 8), mat(c2 ?? '#e05a8a', { rough: 0.5 }), { p: [s * 0.16 + r * 0.55, hh * 0.6 + 0.12 + lift, -r * 0.8], s: [1.2, 0.7, 0.35], r: [0, -0.6, s * 0.4] });
      add(new THREE.SphereGeometry(0.07, 10, 8), mat(c2 ?? '#e05a8a'), { p: [r * 0.55, hh * 0.6 + 0.12 + lift, -r * 0.84] });
      break;
    }
    case 'crown': {
      const m = mat(c ?? '#f2c230', GOLD);
      add(new THREE.CylinderGeometry(r * 0.88, r * 0.85, 0.28, 28, 1, true), m, { p: [0, hh + 0.08 + lift, 0] }).material.side = THREE.DoubleSide;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(new THREE.ConeGeometry(0.12, 0.32, 4), m, { p: [Math.sin(a) * r * 0.86, hh + 0.36 + lift, Math.cos(a) * r * 0.86] }); add(new THREE.SphereGeometry(0.06, 10, 8), mat(['#d42a3c', '#2a6fd4', '#2ab54a'][i % 3], { rough: 0.15 }), { p: [Math.sin(a) * r * 0.9, hh + 0.08 + lift, Math.cos(a) * r * 0.9] }); }
      break;
    }
    case 'hardhat': { const m = mat(c ?? '#f5c518', { rough: 0.3 }); add(dome(r * 1.13, hh * 0.95, hh * 0.32 + lift), m); add(new THREE.CylinderGeometry(r * 1.28, r * 1.28, 0.06, 32), m, { p: [0, hh * 0.32 + lift, 0.08], s: [1, 1, 1.12] }); add(new THREE.BoxGeometry(0.16, 0.12, r * 1.9), m, { p: [0, hh * 0.32 + hh * 0.93 + lift, 0] }); break; }
    case 'partyhat': add(new THREE.ConeGeometry(r * 0.55, 1.0, 24), mat(c ?? '#ff4fa0', { rough: 0.4 }), { p: [0, hh + 0.45 + lift, 0] });
      for (const y of [0.15, 0.45]) add(new THREE.TorusGeometry(r * 0.55 * (1 - (y + 0.05)) + 0.01, 0.04, 6, 20), mat(c2 ?? '#ffe14f'), { p: [0, hh + y + lift, 0], r: [Math.PI / 2, 0, 0] });
      add(new THREE.SphereGeometry(0.1, 10, 8), mat(c2 ?? '#ffe14f'), { p: [0, hh + 0.98 + lift, 0] }); break;
    case 'flowercrown': add(new THREE.TorusGeometry(r * 0.95, 0.05, 6, 32), mat('#3f8f3a', { rough: 0.6 }), { p: [0, hh * 0.7 + lift, 0], r: [Math.PI / 2, 0, 0] });
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; add(new THREE.SphereGeometry(0.1, 10, 8), mat(['#ff6fa8', '#ffd84f', '#ffffff'][i % 3], { rough: 0.5 }), { p: [Math.sin(a) * r * 0.97, hh * 0.72 + lift, Math.cos(a) * r * 0.97], s: [1, 0.6, 1] }); } break;
    case 'headphones': { const m = mat(c ?? '#222', { rough: 0.35 }); add(new THREE.TorusGeometry(r * 1.12, 0.06, 8, 28, Math.PI), m, { p: [0, 0.05, 0] }); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20), mat(c2 ?? '#d23a3a', { rough: 0.35 }), { p: [s * (r + 0.06), 0.02, 0], r: [0, 0, Math.PI / 2] }); break; }
    case 'glasses': case 'sunglasses': {
      const m = mat(c ?? (type === 'sunglasses' ? '#111' : '#1b1b1b'), { rough: 0.3 });
      const lens = type === 'sunglasses' ? mat(c2 ?? '#141414', { rough: 0.1 }) : mat(c2 ?? '#bfe6ff', { rough: 0.05, opacity: 0.35 });
      for (const s of [-1, 1]) {
        const a = (s * 0.2 * Fu) / r, x = Math.sin(a) * (r + 0.05), z = Math.cos(a) * (r + 0.05);
        add(new THREE.TorusGeometry(0.13 * Fu, 0.022, 8, 24), m, { p: [x, 0.06 * Fu, z], r: [0, a, 0], s: [1.15, 0.9, 1] });
        add(new THREE.CircleGeometry(0.13 * Fu, 24), lens, { p: [x, 0.06 * Fu, z], r: [0, a, 0], s: [1.15, 0.9, 1] });
        add(new THREE.BoxGeometry(0.03, 0.03, r * 0.95), m, { p: [s * (r + 0.03), 0.07 * Fu, 0.15] });
      }
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), m, { p: [0, 0.09 * Fu, r + 0.06], r: [0, 0, Math.PI / 2] });
      break;
    }
    case 'goggles': {
      const y = o.on === 'eyes' ? 0.06 * Fu : 0.33 * Fu, m = mat(c ?? '#5a3a22', { rough: 0.6 });
      add(new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.13, 32, 1, true), m, { p: [0, y, 0] });
      for (const s of [-1, 1]) {
        const a = (s * 0.21 * Fu) / r, x = Math.sin(a) * (r + 0.07), z = Math.cos(a) * (r + 0.07);
        add(new THREE.CylinderGeometry(0.15 * Fu, 0.15 * Fu, 0.12, 20, 1, true), mat('#c8a050', GOLD), { p: [x, y, z], q: aim([Math.sin(a), 0, Math.cos(a)]) });
        add(new THREE.CircleGeometry(0.15 * Fu, 20), mat(c2 ?? '#6fd0ff', { rough: 0.05, opacity: 0.6 }), { p: [Math.sin(a) * (r + 0.12), y, Math.cos(a) * (r + 0.12)], r: [0, a, 0] });
      }
      break;
    }
    default: return null;
  }
  return compact(G);
}
// Merge a group's meshes per material (one draw call per material instead of per primitive).
function compact(G) {
  const byMat = new Map();
  G.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(G.matrixWorld).invert();
  G.traverse((m) => { if (m.isMesh && !m.children.length) { if (!byMat.has(m.material)) byMat.set(m.material, []); byMat.get(m.material).push(m); } });
  const out = new THREE.Group(); out.position.copy(G.position); out.rotation.copy(G.rotation);
  for (const [material, list] of byMat) {
    if (list.length === 1 && list[0].parent === G) { out.add(list[0]); continue; }
    const geo = merge(list.map((m) => m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))));
    const mesh = new THREE.Mesh(geo, material); mesh.castShadow = true; out.add(mesh);
  }
  return out;
}
function shade(c, k) { return '#' + new THREE.Color(c).multiplyScalar(k).getHexString(); }

// ---------- text plates ----------
const textCache = new Map();
export function textTexture(text, { color = '#d62828', bg = '#ffffff', border = '#2b2b2b', w = 512, h = 192, font = 'Arial Black, Arial, sans-serif', radius = 0.18 } = {}) {
  const key = [text, color, bg, border, w, h].join('|');
  if (textCache.has(key)) return textCache.get(key);
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, h * radius); g.fill(); if (border) { g.lineWidth = h * 0.045; g.strokeStyle = border; g.stroke(); } }
  const lines = String(text).split('\n');
  let size = (h * 0.62) / lines.length;
  g.font = `900 ${size}px ${font}`;
  const maxW = Math.max(...lines.map((l) => g.measureText(l).width));
  if (maxW > w * 0.86) { size *= (w * 0.86) / maxW; g.font = `900 ${size}px ${font}`; }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  textCache.set(key, t);
  return t;
}
function plate(text, o = {}) {
  const [w, h] = o.size ?? [1.6, 0.6], G = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat('#ffffff', { rough: 0.5, map: textTexture(text, { ...o, w: 512, h: Math.round((512 * h) / w) }) }));
  m.material.transparent = true; m.material.alphaTest = 0.5;
  G.add(m);
  return G;
}

// ---------- held props (grip space: hand at origin, +Z = forward when the arm hangs / up when held out) ----------
function prop(type, o = {}) {
  const G = new THREE.Group();
  const add = (geo, m, tr) => { const mesh = new THREE.Mesh(tr ? place(geo, tr) : geo, m); mesh.castShadow = true; G.add(mesh); return mesh; };
  const wood = mat('#8a5a32', { rough: 0.7 });
  switch (type) {
    case 'whistle': add(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 12), mat(o.color ?? '#151515', { rough: 0.3 }), { p: [0, 0, 0.14], r: [Math.PI / 2, 0, 0] }); add(new THREE.SphereGeometry(0.1, 12, 10), mat(o.color ?? '#151515', { rough: 0.3 }), { p: [0, -0.05, 0.28] }); break;
    case 'apple': add(new THREE.SphereGeometry(0.28, 16, 12), mat(o.color ?? '#d8261c', { rough: 0.25 }), { p: [0, -0.1, 0.18], s: [1, 0.9, 1] }); add(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), wood, { p: [0, 0.18, 0.18] }); add(new THREE.SphereGeometry(0.08, 8, 6), mat('#3aa83a'), { p: [0.06, 0.2, 0.18], s: [1.2, 0.4, 0.7] }); break;
    case 'rake': add(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8), wood, { p: [0, 0, 0.6], r: [Math.PI / 2, 0, 0] }); add(new THREE.BoxGeometry(1.2, 0.08, 0.1), mat('#7a7a7a', { metal: 0.8, rough: 0.4 }), { p: [0, 0, 2.7] });
      for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.04, 0.3, 0.04), mat('#7a7a7a', { metal: 0.8, rough: 0.4 }), { p: [-0.54 + i * 0.18, -0.15, 2.72] }); break;
    case 'sign': add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), wood, { p: [0, 0, 1.0], r: [Math.PI / 2, 0, 0] }); add(new THREE.BoxGeometry(2.2, 0.08, 1.3), mat('#f4f1e8', { rough: 0.6 }), { p: [0, 0.06, 2.6] });
      { const pl = plate(o.text ?? 'HELP!', { color: o.textColor ?? '#c81e1e', bg: '#f4f1e8', border: null, size: [2.1, 1.2] }); pl.position.set(0, 0.105, 2.6); pl.rotation.x = -Math.PI / 2; pl.rotation.z = Math.PI; G.add(pl); } break;
    case 'phone': add(new THREE.BoxGeometry(0.42, 0.06, 0.78), mat(o.color ?? '#1a1a1a', { rough: 0.2 }), { p: [0, 0.05, 0.25] }); add(new THREE.PlaneGeometry(0.36, 0.68), mat('#9ad3ff', { rough: 0.1, emissive: '#3a7bb8' }), { p: [0, 0.085, 0.25], r: [-Math.PI / 2, 0, Math.PI] }); break;
    case 'clipboard': add(new THREE.BoxGeometry(0.9, 0.05, 1.2), mat('#a0723f', { rough: 0.6 }), { p: [0, 0.05, 0.35] }); add(new THREE.BoxGeometry(0.78, 0.06, 0.98), mat('#fafafa', { rough: 0.8 }), { p: [0, 0.06, 0.3] }); add(new THREE.BoxGeometry(0.35, 0.1, 0.12), mat('#9a9a9a', { metal: 0.8, rough: 0.3 }), { p: [0, 0.09, 0.9] }); break;
    case 'envelope': {
      add(new THREE.BoxGeometry(1.3, 0.05, 0.85), mat('#fbfaf5', { rough: 0.7 }), { p: [0, 0.05, 0.3] });
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 16), mat('#c41e1e', { rough: 0.35 }), { p: [0, 0.1, 0.42] });
      if (o.text) { const pl = plate(o.text, { color: o.textColor ?? '#c81e1e', bg: null, size: [1.2, 0.4] }); pl.position.set(0, 0.08, 0.15); pl.rotation.x = -Math.PI / 2; pl.rotation.z = Math.PI; G.add(pl); }
      break;
    }
    case 'hammer': add(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), wood, { p: [0, 0, 0.45], r: [Math.PI / 2, 0, 0] }); add(new THREE.BoxGeometry(0.6, 0.22, 0.22), mat(o.color ?? '#6d6d72', { metal: 0.9, rough: 0.35 }), { p: [0.1, 0, 1.15] }); break;
    case 'rock': add(new THREE.DodecahedronGeometry(0.4, 0), mat(o.color ?? '#7d7a74', { rough: 0.9 }), { p: [0, -0.15, 0.25], s: [1, 0.8, 0.9] }); break;
    case 'box': add(new THREE.BoxGeometry(1.4, 1.2, 1.2), mat(o.color ?? '#b98a52', { rough: 0.75 }), { p: [0, 0, 0.75] }); break;
    case 'spear': add(new THREE.CylinderGeometry(0.07, 0.07, 6.4, 8), wood, { p: [0, 0, 0.9], r: [Math.PI / 2, 0, 0] }); add(new THREE.ConeGeometry(0.22, 0.8, 4), mat(o.color ?? '#b8bcc4', { metal: 0.8, rough: 0.35 }), { p: [0, 0, 4.5], r: [Math.PI / 2, 0, 0] }); break;
    default: return null;
  }
  return compact(G);
}

// ---------- assembly ----------
const asList = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const asObj = (x, key = 'type') => (typeof x === 'string' ? { [key]: x } : x);
const HATS = ['cap', 'flatcap', 'beanie', 'chef', 'tophat', 'sunhat', 'crown', 'hardhat', 'partyhat', 'flowercrown', 'headphones', 'glasses', 'sunglasses', 'goggles'];
const PROPS = ['whistle', 'apple', 'rake', 'sign', 'phone', 'clipboard', 'envelope', 'hammer', 'rock', 'box', 'spear'];

export function buildAccessories(rig, d, spec) {
  const head = d.head, hairSpec = asObj(spec.hair ?? 'bald', 'style'), added = {};
  const headCentre = new THREE.Group(); headCentre.position.y = head.h / 2; rig.parts.head.add(headCentre);
  const hairColor = hairSpec.color ?? spec.hairColor ?? '#3a2414';
  const hg = hairGeometry(hairSpec.style, head);
  if (hg) { const m = new THREE.Mesh(hg, mat(hairColor, { rough: 0.3 })); m.castShadow = true; headCentre.add(m); added.hair = m; }
  if (spec.beard) { const b = asObj(spec.beard, 'style'), g = hairGeometry(b.style === true ? 'beard' : b.style, head); if (g) { const m = new THREE.Mesh(g, mat(b.color ?? spec.beardColor ?? hairColor, { rough: 0.45 })); m.castShadow = true; headCentre.add(m); added.beard = m; } }
  const lift = HAIR_LIFT[hairSpec.style] ?? 0;
  const items = [...asList(spec.hat), ...asList(spec.acc ?? spec.accessories)].map((x) => asObj(x));
  const hold = spec.hold ?? {};
  for (const [hand, it] of Object.entries(hold)) if (it) items.push({ ...asObj(it), hand });
  if (spec.label) items.push({ type: 'label', ...asObj(spec.label, 'text') });
  for (const it of items) {
    if (HATS.includes(it.type)) { const isHat = !['glasses', 'sunglasses', 'goggles', 'headphones'].includes(it.type); const g = hatGroup(it.type, it, head, isHat ? lift : 0); if (g) { headCentre.add(g); added[it.type] = g; } continue; }
    if (it.type === 'label') {
      const pl = plate(it.text ?? 'LABEL', { color: it.color ?? '#d62828', bg: it.bg ?? '#ffffff', border: it.border ?? '#2b2b2b', size: it.size ?? [Math.min(1.8, d.torso[0] * 0.85), 0.55] });
      pl.position.set(0, it.y ?? 0, 0.012 + (it.offset ?? 0)); rig.anchors.chest.add(pl); added.label = pl; continue;
    }
    if (it.type === 'cape') {
      const G = new THREE.Group(), w = d.torso[0] * 1.05, h = d.torso[1] + d.leg[1] * 0.85;
      const outer = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06).translate(0, -h / 2, 0), mat(it.color ?? '#151515', { rough: 0.55 }));
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.98).translate(0, -h / 2, 0.035), mat(it.color2 ?? '#a01020', { rough: 0.45 }));
      const collar = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.5, 0.06).translate(0, 0.2, 0), outer.material);
      collar.rotation.x = -0.35; collar.position.z = 0.05;
      for (const m of [outer, inner, collar]) { m.castShadow = true; G.add(m); }
      G.position.set(0, d.torso[1], -d.torso[2] / 2 - 0.05); G.rotation.x = 0.06;
      rig.parts.torso.add(G); added.cape = G; continue;
    }
    if (it.type === 'backpack' || it.type === 'satchel') {
      const G = new THREE.Group(), c = it.color ?? (it.type === 'backpack' ? '#2f6fd6' : '#7a4a26'), m = mat(c, { rough: 0.6 });
      const add = (geo, mm, tr) => { const me = new THREE.Mesh(place(geo, tr), mm); me.castShadow = true; G.add(me); };
      if (it.type === 'backpack') {
        add(new THREE.BoxGeometry(d.torso[0] * 0.7, d.torso[1] * 0.75, 0.55), m, { p: [0, -0.05, -0.27] }); add(new THREE.BoxGeometry(d.torso[0] * 0.5, 0.45, 0.2), mat(shade(c, 0.8), { rough: 0.6 }), { p: [0, -0.35, -0.6] });
        for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.16, 0.06, d.torso[2] + 0.06), mat(shade(c, 0.7)), { p: [s * 0.45, d.torso[1] * 0.38, d.torso[2] / 2], r: [0, 0, 0] });
        rig.anchors.back.add(G);
      } else {
        add(new THREE.BoxGeometry(0.9, 0.7, 0.3), m, { p: [-d.torso[0] / 2 - 0.05, -d.torso[1] * 0.5, 0.2] });
        add(new THREE.BoxGeometry(0.12, d.torso[1] * 1.45, 0.04), mat(shade(c, 0.8)), { p: [0, d.torso[1] * 0.08, d.torso[2] / 2 + 0.02], r: [0, 0, 0.72] });
        rig.anchors.waist.add(G); G.position.y = d.torso[1] * 0.45;
      }
      added[it.type] = G; continue;
    }
    if (PROPS.includes(it.type)) {
      const g = prop(it.type, it); if (!g) continue;
      if (it.type === 'whistle' && !it.hand) { g.rotation.x = 0; rig.anchors.mouth.add(g); }
      else { const a = rig.anchors[it.hand === 'l' || it.hand === 'hand_l' ? 'hand_l' : 'hand_r']; a.add(g); }
      added[it.key ?? it.type] = g; continue;
    }
    throw new Error(`characters: unknown accessory "${it.type}"`);
  }
  return added;
}

// Visible hands (blocky arms have none by default): spec.hands = 'left' | 'right' | 'both'. A chunky palm block plus a
// thumb at the arm's end, skin coloured. Used for premises about hands (e.g. one-handed villagers).
export function addHands(rig, d, which, skin) {
  const sides = which === 'both' ? ['l', 'r'] : which === 'left' ? ['l'] : which === 'right' ? ['r'] : [];
  if (which && !sides.length) throw new Error(`characters: hands must be 'left' | 'right' | 'both', got "${which}"`);
  const m = mat(skin, { rough: 0.45 }), out = {};
  for (const s of sides) {
    const G = new THREE.Group(), w = d.arm[0] * 0.78, dp = d.arm[2] * 0.7;
    const palm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.62, dp), m);
    palm.position.y = -0.45;
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.24), m);
    thumb.position.set(s === 'l' ? w / 2 + 0.06 : -(w / 2 + 0.06), -0.32, dp * 0.25); // thumb on the inner side
    for (const x of [palm, thumb]) { x.castShadow = true; G.add(x); }
    rig.anchors[`hand_${s}`].add(G);
    out[`hand_${s}_mesh`] = G;
  }
  return out;
}
