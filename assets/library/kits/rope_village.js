// Rope village ("The Ropes"): a rich village green at the foot of a flat gray cloud ceiling (~100 studs up). A grassy green
// (3D grass blades, clover, wildflowers, worn dirt paths with pebbles) in the middle; a mossy cobbled square to the north
// with a stone well and the church bell tower (church_bell_tower kit); ~30 half-timbered houses (tudor_house props) in two
// rings with fenced vegetable gardens, flower beds, benches, carts, barrels, wood piles, washing lines and lantern posts;
// Toby's house (house_exterior kit, east side); a dirt road south; far hamlets, fields, hedges, trees and hills that
// reach up toward the cloud; and ~900 thin ropes rising from every house (people inside) and the fields into the cloud.
// The cloud ceiling (cloud_ceiling kit) carries the giant's eye, face and the gap: S.api.cloud.set({...}).
// Looks: RV_LOOKS.dusk (gold light slit under the cloud), .midnight (saturated navy + lantern warmth), .dawn (pink/peach).
//   S.api.village.set({ t, look: 'dusk'|'midnight'|'dawn' (rope glow + lantern halos preset), ropes: 0..1 (share of the ambient ropes shown), ropeGlow, lamps: 0..1 (halos on > 0.3), shoe: bool (default hidden) })
//   S.api.cloud.set({ eye, face, gap, glow, look, grin, t })      (see cloud_ceiling)

export const meta = {
  id: 'rope_village', tags: ['village', 'green', 'square', 'medieval', 'tudor', 'grass', 'meadow', 'cloud', 'ceiling', 'ropes', 'bell tower', 'church', 'dusk', 'night', 'dawn', 'gardens', 'lamps'],
  description: 'Village green under a flat gray cloud ceiling: rich 3D grass and wildflowers, dirt paths, mossy cobbled square with a well and the church bell tower, ~30 Tudor houses with fenced gardens, lanterns, carts and clutter, far hamlets and hills; ~900 thin ropes rise from the houses into the cloud; the cloud hides the giant (eye opens, face reveal, gap). Looks: dusk, midnight, dawn.',
  options: { look: "'dusk' | 'midnight' (default) | 'dawn' | any look", cloudY: 'cloud underside height (100)', ropes: 'ambient ropes (900)', grass: 'false = no 3D grass blades', shoe: 'true = a single shoe on the green (spot_shoe)',
    face: 'false = no giant head in the cloud', cloud: 'false = no cloud ceiling and no ambient ropes (open sky)', square: 'false = empty cobbled square (no well, square benches, crates, barrels)', eye: 'cloud eye centre [x, z] ([30, -50])', gap: 'cloud gap centre [x, z] ([0, 16], above spot_lift)', hills: 'false = no far hills', glow: 'cloud night glow (look default)' },
  anchors: {
    spot_green: 'middle of the green', spot_lift: 'under the cloud gap (someone is pulled up here)', spot_shoe: 'the shoe on the grass', spot_square: 'cobbled square by the well', spot_tower_door: 'bell tower door',
    spot_toby_door: "Toby's front door (east house)", spot_hale: "Mrs. Hale's bench (west edge of the green)", spot_mayor: "the mayor's doorstep (north-west house)", spot_road: 'dirt road south of the green', spot_crowd: 'crowd area centre (green, ~60 x 40)',
    cam_wide: 'elevated wide over the green toward the tower', cam_ews: 'high aerial over the village, ropes into the cloud', cam_green: 'ground level on the green toward the tower', cam_square: 'square, well and tower',
    cam_up: 'from the green straight up the ropes into the cloud', cam_lift: 'low angle at spot_lift (feet leave the grass)', cam_shoe: 'close on the shoe', cam_road: 'down the road toward the village', cam_horizon: 'low, the light slit between ground and cloud',
    cam_toby_house: "Toby's house", cam_hale: "Mrs. Hale's bench", cam_tower: 'up at the bell tower', cam_crowd: 'over the crowd area toward the gap', cloud_eye: 'eye opening', cloud_gap: 'gap', cloud_face: 'face opening',
  },
};

export const RV_LOOKS = {
  dusk: { // the sun sits in the slit between the hills and the cloud: gold underside glow, long warm light
    preset: 'dusk', sun: { color: '#ffb46a', intensity: 3.0, elevation: 4.5, azimuth: 148 },
    hemi: { sky: '#8a7fa8', ground: '#c98c58', intensity: 1.05 }, ambient: { color: '#ffd2a0', intensity: 0.06 }, env: 0.55, lights: 0.55,
    sky: { zenith: '#6a5c88', horizon: '#ffb46e', ground: '#5a4a52', haze: 1.4, hazeColor: '#f0a878', clouds: 0, sunGlow: 2.2, sunSize: 2.4, stars: 0, moon: 0 },
    fog: { color: '#d49a78', density: 0.0032 }, exposure: 0.8, shadow: { softness: 0.4, intensity: 0.9 },
    post: { bloom: { intensity: 0.7, threshold: 0.9 }, ao: { intensity: 0.85 }, grade: { saturation: 1.12, contrast: 1.04, temperature: 0.12, lift: 0.02 } },
  },
  midnight: { // saturated navy, never black: cold diffuse cloud light, warm windows and lanterns, the cloud glows faintly
    preset: 'night', sun: { color: '#9fb4ff', intensity: 0.45, elevation: 6, azimuth: -40 },
    hemi: { sky: '#4a5ea8', ground: '#303c68', intensity: 1.35 }, ambient: { color: '#5a6eb4', intensity: 0.16 }, env: 0.6, lights: 1,
    sky: { zenith: '#0b1640', horizon: '#26408a', ground: '#101a3a', haze: 1.0, hazeColor: '#2a4288', clouds: 0, stars: 0, moon: 0, sunGlow: 0, sunSize: 0.01 },
    fog: { color: '#22346e', density: 0.0026 }, exposure: 1.12, shadow: { softness: 0.4, intensity: 0.6 },
    post: { bloom: { intensity: 0.95, threshold: 0.85 }, ao: { intensity: 0.95 }, grade: { saturation: 1.25, contrast: 1.05, temperature: -0.06, lift: 0.025 } },
  },
  dawn: { // pink-peach morning light under the cloud, dew-cool shadows
    preset: 'golden', sun: { color: '#ffc29a', intensity: 2.6, elevation: 4, azimuth: -60 },
    hemi: { sky: '#b4a8c8', ground: '#e0a890', intensity: 1.0 }, ambient: { color: '#ffd8c8', intensity: 0.06 }, env: 0.6, lights: 0.15,
    sky: { zenith: '#8a8ab8', horizon: '#ffc4a8', ground: '#7a6a6a', haze: 1.3, hazeColor: '#f4c0b0', clouds: 0, sunGlow: 1.8, sunSize: 2, stars: 0, moon: 0 },
    fog: { color: '#e4b8ac', density: 0.003 }, exposure: 0.76, shadow: { softness: 0.4, intensity: 0.85 },
    post: { bloom: { intensity: 0.6, threshold: 0.92 }, ao: { intensity: 0.85 }, grade: { saturation: 1.08, contrast: 1.02, temperature: 0.06, tint: 0.03, lift: 0.03 } },
  },
};
const CLOUD_GLOW = { dusk: 0.03, midnight: 0.2, dawn: 0.05 }, ROPE_GLOW = { dusk: 0.12, midnight: 0.3, dawn: 0.1 }, LAMPS = { dusk: 0.7, midnight: 1, dawn: 0 };

const B = (S, p) => S.part({ batch: true, ...p });

export default async function ropeVillage(S, o = {}) {
  const THREE = S.THREE;
  const { makeKit, groundMaterial, grassField, fbm2, noise2, smooth } = await import('./_matkit.js');
  const { ropeField } = await import('../props/rope.js');
  const { default: tudorHouse } = await import('../props/tudor_house.js');
  const { default: oakTree } = await import('../props/oak_tree.js');
  const { default: pineTree } = await import('../props/pine_tree.js');
  const { rng } = await import('../../../engine/runtime/core/math.js');
  const lookName = typeof o.look === 'string' ? o.look : o.look ? null : 'midnight';
  S.look(lookName ? RV_LOOKS[lookName] ?? lookName : o.look);
  const r = rng('rope_village'), X = makeKit(S), A = (n, p) => S.anchor(n, p);
  const Y0 = o.cloudY ?? 100;
  // ---------------------------------------------------------------- layout data
  const SQ = [-44, -92, 44, -44];                         // cobbled square rect
  const paths = [ // [x0, z0, x1, z1, half-width]
    [0, 300, 0, 40, 3.2], [0, 40, -6, 8, 2.6], [-6, 8, 2, -44, 2.6], [-180, 18, -60, 22, 2.2], [-60, 22, -20, 10, 2.0], [60, 2, 20, 6, 2.0], [60, 2, 200, -10, 2.2],
    [-44, -60, -66, -60, 1.6], [44, -60, 66, -60, 1.6], [-30, 50, -40, 66, 1.4], [26, 50, 26, 66, 1.4],
  ];
  const segD = (x, z, s) => { const [x0, z0, x1, z1] = s, dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - x0 - dx * t, z - z0 - dz * t); };
  const pathD = (x, z) => { let m = 1e9; for (const s of paths) m = Math.min(m, segD(x, z, s) - s[4]); return m; };
  const rects = [];                                        // footprints without grass: [x0, z0, x1, z1]
  const inRects = (x, z, pad = 0) => rects.some(([a, b, c, d]) => x > a - pad && x < c + pad && z > b - pad && z < d + pad);
  // ---------------------------------------------------------------- houses
  const walls = ['#efe3c8', '#f2e8d4', '#e8d8b8', '#f4ecdc', '#e6dcc4', '#ead2b4'], roofs = ['#6a3a2e', '#5a4a3a', '#7a4a2a', '#5e3634', '#4a4a52', '#6e5a3a'];
  const houses = [];
  const H = (x, z, yaw, w = 16, d = 12, extra = {}) => {
    const i = houses.length;
    S.within([x, 0, z], yaw, () => tudorHouse(S, { w, d, wall: walls[i % 6], roof: roofs[(i * 5) % 6], seed: `rv${i}`, flowers: i % 2 === 0, lit: 0.6, name: `rvh${i}`, ...extra }));
    const ex = (yaw % 180 === 0 ? w : d) / 2 + 1.2, ez = (yaw % 180 === 0 ? d : w) / 2 + 1.2;
    rects.push([x - ex, z - ez, x + ex, z + ez]);
    houses.push({ x, z, yaw, w, d });
  };
  for (const z of [-62, -32, -2, 28]) H(-72, z, 90, 16 + (z & 2), 12);
  for (const z of [-62, -32, 28]) H(72, z, -90, 16, 12);
  for (const x of [-50, -24, 28, 54]) H(x, 74, 180, 16, 12);
  H(-62, -112, 0, 18, 13); H(62, -112, 0, 18, 13);
  for (const z of [-80, -48, -16, 16, 48]) { H(-108, z + (r() - 0.5) * 6, 90, 15, 11); H(108, z + (r() - 0.5) * 6, -90, 15, 11); }
  for (const x of [-84, -52, 52, 84]) H(x + (r() - 0.5) * 6, 108, 180, 15, 11);
  // Toby's house (east, facing the green) + the church
  await S.kit('house_exterior', { pos: [72, 0, 0], yaw: -90, seed: 'toby', name: 'toby', ground: false });
  rects.push([60, -12, 84, 12]);
  await S.kit('church_bell_tower', { pos: [0, 0, -112], ground: false });
  rects.push([-15, -160, 15, -104]);
  // ---------------------------------------------------------------- ground: meadow + paths (non-tiling), mossy cobbles
  const meadowMacro = (x, z) => {
    const pd = pathD(x, z), green = Math.hypot(x / 52, z / 42);
    const dirt = Math.max(smooth(1.2, -0.6, pd) * (0.85 + 0.3 * noise2(x * 0.4, z * 0.4, 3)), smooth(1.4, 0.2, green) * 0.25 * fbm2(x * 0.08, z * 0.08, 5), inRects(x, z, -0.5) ? 0.95 : 0, fbm2(x * 0.03, z * 0.03, 9) > 0.7 ? 0.55 : 0);
    const lush = fbm2(x * 0.045 + 7, z * 0.045, 11, 4) * 1.1 - 0.05 + smooth(4, 1, pd) * 0.25;
    const sel = fbm2(x * 0.02, z * 0.02, 13, 3);
    return [dirt, lush, 0, sel];
  };
  groundMaterial(S, { rect: [-560, -560, 560, 560], res: 2048, macro: meadowMacro, tex: 'grass', colA: '#86ad4c', colB: '#557f34', mud: '#76583c', moss: '#3d6a2a', bump: 1.2, edge: 0.01, y: 0, fine: 0.35, name: 'meadow' });
  const sqMacro = (x, z) => { const e = Math.min(x - SQ[0], SQ[2] - x, z - SQ[1], SQ[3] - z); return [fbm2(x * 0.09, z * 0.09, 21) * 0.9 + smooth(6, 0, e) * 0.3, fbm2(x * 0.11, z * 0.11, 23) * 1.05 + smooth(8, 0, e) * 0.35, 0, fbm2(x * 0.04, z * 0.04, 25)]; };
  groundMaterial(S, { rect: SQ, res: 512, macro: sqMacro, tex: 'cobblestone', colA: '#a59d8e', colB: '#8a8578', mud: '#5a4a38', moss: '#4f7a2c', bump: 1.7, edge: 5, y: 0.28, name: 'square' });
  rects.push([SQ[0] + 3, SQ[1] + 3, SQ[2] - 3, SQ[3] - 3]);
  // pebbles + edging stones along the paths, stepping stones across the green
  for (let i = 0; i < 900; i++) {
    const s = paths[i % paths.length], u = r(), x = s[0] + (s[2] - s[0]) * u, z = s[1] + (s[3] - s[1]) * u, side = r() < 0.5 ? -1 : 1, nx = -(s[3] - s[1]), nz = s[2] - s[0], nl = Math.hypot(nx, nz) || 1;
    const off = (s[4] + 0.3 + r() * 0.6) * side * (r() < 0.55 ? 1 : r()), px = x + (nx / nl) * off, pz = z + (nz / nl) * off;
    if (Math.hypot(px, pz) > 330) continue;
    const sz = 0.25 + r() * 0.5;
    X.p({ shape: 'ball', mat: 'stone', size: [sz * 1.3, sz * 0.5, sz * 1.0], pos: [px, sz * 0.12, pz], rot: [0, r() * 180, 0], color: ['#b0aa9c', '#c0b8a8', '#a29c90', '#c8c0ae'][i % 4] });
  }
  for (let k = 0; k < 9; k++) X.p({ mat: 'flag', size: [2.4 + r(), 0.5, 1.8 + r() * 0.6], pos: [-22 - k * 4.4, 0.2, 11 + Math.sin(k) * 1.2], rot: [0, r() * 30, 0], color: '#9a948a' });
  // ---------------------------------------------------------------- the square: well, benches, crates, market stall frames
  if (o.square !== false) { const wx = -16, wz = -64;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; X.p({ mat: 'stone', size: [2.6, 3.2, 1.3], pos: [wx + Math.cos(a) * 3.4, 1.9, wz + Math.sin(a) * 3.4], rot: [0, -a * 57.3 + 90, 0], color: '#a29a8a' }); }
    X.p({ shape: 'vcyl', mat: 'maw', size: [6.2, 0.4, 6.2], pos: [wx, 2.6, wz], color: '#0a0c10' });
    for (const s of [-1, 1]) X.p({ mat: 'beam', size: [0.7, 7, 0.7], pos: [wx + s * 3.6, 5.6, wz], color: '#4a3020' });
    X.p({ mat: 'beam', size: [8.4, 0.6, 0.6], pos: [wx, 8.6, wz], color: '#4a3020' });
    for (const s of [-1, 1]) X.p({ mat: 'thatch', size: [9.4, 0.5, 4.2], pos: [wx, 9.6, wz + s * 1.7], rot: [s * 32, 0, 0], color: '#7a5a3a' });
    X.p({ shape: 'vcyl', mat: 'planks', size: [1.4, 1.6, 1.4], pos: [wx + 1.2, 4.4, wz], color: '#6a4a30' });
    S.light({ type: 'point', pos: [wx, 7, wz + 2], color: '#ffb060', range: 22, brightness: 1.2, auto: true });
  }
  const bench = (x, z, yaw) => S.within([x, 0, z], yaw, () => { B(S, { size: [6, 0.4, 1.6], pos: [0, 1.6, 0], material: 'WoodPlanks', color: '#7a5636' }); B(S, { size: [6, 1.4, 0.3], pos: [0, 2.6, -0.7], material: 'WoodPlanks', color: '#7a5636' }); for (const s of [-1, 1]) B(S, { size: [0.4, 1.6, 1.4], pos: [s * 2.6, 0.8, 0], material: 'Wood', color: '#4a3020' }); });
  bench(-38, 6, 90); bench(36, -18, -90);
  if (o.square !== false) { bench(14, -48, 180); bench(-30, -50, 180); bench(-40, -26, 70); }
  if (o.square !== false) for (let k = 0; k < 14; k++) { const x = 18 + (k % 4) * 3.2 + r(), z = -78 + Math.floor(k / 4) * 3 + r(); X.p({ mat: k % 3 ? 'planks' : 'wood', size: [2.4, 2 + r(), 2.4], pos: [x, 1.4, z], rot: [0, r() * 40, 0], color: ['#8a6a44', '#7a5a3a', '#9a7a50'][k % 3] }); }
  if (o.square !== false) for (let k = 0; k < 8; k++) X.p({ shape: 'vcyl', mat: 'planks', size: [3, 2, 2], pos: [32 + (k % 3) * 2.6, 1.8, -84 + Math.floor(k / 3) * 2.6], color: '#6a4a2c' });
  // ---------------------------------------------------------------- gardens: fenced vegetable plots, flower beds, wood piles, washing lines
  const garden = (x0, z0, w, d, seed) => {
    const gr = rng(seed);
    X.p({ mat: 'soil', size: [w, 0.5, d], pos: [x0 + w / 2, 0.22, z0 + d / 2], color: '#4a3424' });
    for (let row = 1; row < d / 1.6; row++) for (let k = 0; k < w / 1.7 - 1; k++) {
      const cx = x0 + 1.2 + k * 1.7 + gr() * 0.3, cz = z0 + row * 1.6;
      const kind = (row + Math.floor(x0)) % 3;
      if (kind === 0) X.p({ shape: 'ball', mat: 'leaf', size: [1.3, 0.9, 1.3], pos: [cx, 0.85, cz], color: ['#6a9a3a', '#8ab04a', '#5a8a3a'][k % 3] });
      else if (kind === 1) { for (let q = 0; q < 3; q++) X.p({ mat: 'leaf', size: [0.18, 0.9 + gr() * 0.4, 0.18], pos: [cx + (q - 1) * 0.22, 0.9, cz], rot: [(gr() - 0.5) * 30, 0, (gr() - 0.5) * 30], color: '#4a7a2a' }); X.p({ shape: 'ball', mat: 'petal', size: [0.3, 0.3, 0.3], pos: [cx, 0.5, cz], color: '#d86a2a' }); }
      else X.p({ shape: 'ball', mat: 'leaf', size: [0.9, 1.1, 0.9], pos: [cx, 0.95, cz], color: '#3a6a2a' });
    }
    S.fence({ points: [[x0 - 0.5, z0 - 0.5], [x0 + w + 0.5, z0 - 0.5], [x0 + w + 0.5, z0 + d + 0.5], [x0 - 0.5, z0 + d + 0.5], [x0 - 0.5, z0 + d * 0.55]], style: 'picket', height: 2.6, color: '#e8e0cc', y: 0 });
    rects.push([x0 - 1, z0 - 1, x0 + w + 1, z0 + d + 1]);
  };
  garden(-96, -28, 12, 10, 'g1'); garden(-96, 2, 10, 12, 'g2'); garden(84, -50, 12, 9, 'g3'); garden(-48, 86, 14, 9, 'g4'); garden(20, 86, 12, 9, 'g5'); garden(84, 20, 11, 11, 'g6');
  const woodpile = (x, z, yaw) => S.within([x, 0, z], yaw, () => { for (let k = 0; k < 15; k++) B(S, { shape: 'cylinder', size: [3, 0.8, 0.8], pos: [((k % 5) - 2) * 0.85, 0.42 + Math.floor(k / 5) * 0.72, 0], rot: [0, 90, 90], material: 'Wood', color: ['#8a6a44', '#7a5a38', '#9a7848'][k % 3] }); });
  woodpile(-62, -46, 90); woodpile(60, 42, 0); woodpile(-38, 62, 180);
  for (const [x, z, yaw] of [[-62, -16, 0], [62, -46, 0], [-12, 62, 90]]) S.within([x, 0, z], yaw, () => { // washing lines (no text)
    for (const s of [-1, 1]) B(S, { size: [0.4, 7, 0.4], pos: [s * 6, 3.5, 0], material: 'Wood', color: '#5a4030' });
    B(S, { size: [12, 0.08, 0.08], pos: [0, 6.6, 0], material: 'SmoothPlastic', color: '#d8d0c0' });
    for (let k = 0; k < 5; k++) B(S, { size: [1.4 + (k % 2) * 0.6, 1.8 + (k % 3) * 0.5, 0.12], pos: [-4.4 + k * 2.2, 5.6 - (k % 3) * 0.25, 0.06], material: 'Fabric', color: ['#e8e0d0', '#c86a5a', '#6a8ac8', '#e0c070', '#f0ece4'][k] });
  });
  for (const [x, z, yaw] of [[-56, 44, 30], [48, -86, -20]]) S.within([x, 0, z], yaw, () => { // hand carts
    B(S, { size: [4, 1.6, 6], pos: [0, 2.2, 0], material: 'WoodPlanks', color: '#7a5a3a' });
    for (const s of [-1, 1]) B(S, { shape: 'cylinder', size: [0.5, 3.6, 3.6], pos: [s * 2.3, 1.8, 0.6], material: 'Wood', color: '#4a3020' });
    for (const s of [-1, 1]) B(S, { size: [0.3, 0.3, 4], pos: [s * 1.2, 2.2, -4.6], rot: [-12, 0, 0], material: 'Wood', color: '#5a4030' });
    B(S, { size: [3.4, 1, 5], pos: [0, 3.3, 0], material: 'Grass', color: '#c8a85a' });
  });
  for (let k = 0; k < 16; k++) { const h = houses[k % houses.length], a = (h.yaw * Math.PI) / 180, fx = h.x + Math.sin(a) * (h.d / 2 + 1.8) + Math.cos(a) * (h.w / 2 - 1.4), fz = h.z + Math.cos(a) * (h.d / 2 + 1.8) - Math.sin(a) * (h.w / 2 - 1.4);
    if (k % 2) X.p({ shape: 'vcyl', mat: 'planks', size: [2.6, 1.8, 1.8], pos: [fx, 1.3, fz], color: '#5a4028' }); // rain barrels
    else for (let q = 0; q < 4; q++) X.p({ shape: 'ball', mat: 'petal', size: [0.7, 0.7, 0.7], pos: [fx + (q - 1.5) * 0.8, 0.5, fz], color: ['#d84a6a', '#f0d040', '#9a5ad8', '#f4f0e8'][q] }); }
  // ---------------------------------------------------------------- lanterns round the green and the square (6 real lights + emissive/halo)
  const lampSpots = [[-16, 22], [18, 26], [-30, -14], [30, -10], [-26, -48], [26, -48], [-8, 40], [-6, -88], [4, 120], [-50, 22], [50, 14]];
  lampSpots.forEach(([x, z], i) => S.lampPost({ pos: [x, 0, z], yaw: (Math.atan2(-x, -z) * 180) / Math.PI, height: 10, color: '#262428', light: i < 6 ? { color: '#ffb35a', range: 36, brightness: 2.8 } : false })); // 6 real lights: the village stays at 10 of the 12-light pool
  const halos = lampSpots.map(([x, z]) => { const a = Math.atan2(-x, -z); return [x + Math.sin(a) * 2.8, 9.3, z + Math.cos(a) * 2.8]; });
  // ---------------------------------------------------------------- trees, hedges
  for (const [x, z, sz] of [[-44, 40, 0.85], [46, 40, 0.8], [-88, -98, 1], [92, -96, 1.05], [-128, 70, 1.1], [130, 74, 1], [-24, 130, 0.9], [34, 134, 1], [118, -10, 0.9], [-122, -30, 1.1]])
    S.within([x, 0, z], r() * 360, () => oakTree(S, { size: sz, seed: `t${x}` }));
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 160 + r() * 260, x = Math.sin(a) * d, z = Math.cos(a) * d; if (Math.abs(x) < 14 && z > 0) continue; S.within([x, 0, z], r() * 360, () => (i % 3 ? oakTree(S, { size: 0.9 + r() * 0.5, seed: `ft${i}` }) : pineTree(S, { size: 1 + r() * 0.6 }))); }
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 150 + r() * 120, x = Math.sin(a) * d, z = Math.cos(a) * d, yaw = r() * 180;
    S.within([x, 0, z], yaw, () => { for (let k = 0; k < 7; k++) X.p({ shape: 'ball', mat: 'leaf', size: [5 + r() * 2, 3.4 + r(), 3.6], pos: [S.toWorld([-15 + k * 5, 0, 0])[0], 1.6, S.toWorld([-15 + k * 5, 0, 0])[2]], color: ['#3a6a2a', '#4a7a32', '#2f5a24'][k % 3] }); }); }
  // ---------------------------------------------------------------- far hamlets + fields (cheap), each house has people inside
  const far = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = 170 + r() * 300, x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (Math.abs(x) < 16 && z > 0) continue;
    const w = 10 + r() * 6, dd = 8 + r() * 4, yaw = r() * 360;
    S.within([x, 0, z], yaw, () => {
      B(S, { size: [w, 7, dd], pos: [0, 3.5, 0], material: 'Plaster', color: walls[i % 6] });
      for (const s of [-1, 1]) B(S, { size: [w + 1.2, 0.6, dd * 0.62], pos: [0, 9.1, s * dd * 0.24], rot: [s * 38, 0, 0], material: 'RoofShingles', color: roofs[i % 6] });
      B(S, { shape: 'wedge', size: [w - 0.1, 3.6, dd / 2], pos: [0, 8.8, dd / 4], material: 'Plaster', color: walls[i % 6] });
      B(S, { shape: 'wedge', size: [w - 0.1, 3.6, dd / 2], pos: [0, 8.8, -dd / 4], rot: [0, 180, 0], material: 'Plaster', color: walls[i % 6] });
      B(S, { size: [1.6, 2.2, 0.3], pos: [w * 0.25, 4.4, dd / 2 + 0.08], material: 'SmoothPlastic', color: '#2a3048', glow: 1.4, emissive: '#ffc070' });
    });
    far.push([x, z]);
  }
  for (let i = 0; i < 22; i++) { // fields: soil strips with crop rows
    const a = r() * Math.PI * 2, d = 200 + r() * 260, x = Math.sin(a) * d, z = Math.cos(a) * d, w = 30 + r() * 30, dd = 24 + r() * 20, yaw = r() * 180;
    if (Math.abs(x) < 30 && z > 0) continue;
    S.within([x, 0, z], yaw, () => { B(S, { size: [w, 0.4, dd], pos: [0, 0.2, 0], material: 'Ground', color: i % 3 ? '#5a4030' : '#7a6a3a' }); for (let k = 0; k < dd / 2.2; k++) B(S, { size: [w - 1, 0.7, 0.7], pos: [0, 0.6, -dd / 2 + 1 + k * 2.2], material: 'Grass', color: i % 2 ? '#5a8a34' : '#a8a04a' }); });
  }
  // ---------------------------------------------------------------- hills toward the cloud (the dusk light comes through the slit above them)
  if (o.hills !== false) {
    const hill = (x, z) => { const d = Math.hypot(x, z); return -0.7 + smooth(520, 900, d) * (26 + 52 * fbm2(x * 0.004, z * 0.004, 31, 4)) + smooth(800, 1300, d) * 18; };
    S.terrain({ size: [3200, 3200], center: [0, 0], res: 10, height: hill, base: 'Grass', sand: 'Ground', rockSlope: 0.8, seed: 5, colors: { Grass: '#4f7a34', Ground: '#6a5a40', Rock: '#6a6a60' }, bump: 0.8,
      paint: (x, y, z) => fbm2(x * 0.01, z * 0.01, 41, 3) > 0.62 ? 0.6 : 0 });
  }
  // ---------------------------------------------------------------- 3D grass, clover, flowers
  if (o.grass !== false) {
    const shoe = [7.5, 21];
    const dens = (x, z) => {
      if (Math.abs(x) > 135 || Math.abs(z) > 135) return 0;
      const sd = Math.hypot(x - shoe[0], z - shoe[1]); if (sd < 1.7) return 0; // mown round the shoe (it must read in L12 / L36)
      if (sd < 3.4) return 0.25;
      const pd = pathD(x, z); if (pd < 0.4 || inRects(x, z, 0.4)) return 0;
      const green = Math.hypot(x / 60, z / 50), near = green < 1 ? 1 : 0.55;
      return Math.min(1, smooth(0.4, 2.2, pd) * near * (0.55 + 0.6 * fbm2(x * 0.09, z * 0.09, 51)));
    };
    grassField(S, { rect: [-135, -135, 135, 135], spacing: 0.95, density: dens, height: [0.45, 1.0], seed: 'rvgrass', dry: (x, z) => Math.max(0, fbm2(x * 0.05, z * 0.05, 61) - 0.5) * 1.6, colors: { base: '#24461a', tip: '#9cc65a', dry: '#c8b45a' }, sway: 0.1 });
    for (let i = 0; i < 2600; i++) {
      const x = (r() - 0.5) * 230, z = (r() - 0.5) * 230;
      if (dens(x, z) < 0.3) continue;
      const kind = fbm2(x * 0.06, z * 0.06, 71) > 0.55 ? 0 : i % 4, col = ['#f4f0e8', '#f2d23a', '#b07ae0', '#e86a8a'][kind];
      for (let q = 0; q < 3 + (i % 4); q++) {
        const fx = x + (r() - 0.5) * 2.4, fz = z + (r() - 0.5) * 2.4, h = 0.6 + r() * 0.6;
        X.p({ mat: 'leaf', size: [0.08, h, 0.08], pos: [fx, h / 2, fz], color: '#3a6a28' });
        X.p({ shape: 'ball', mat: 'petal', size: [0.42, 0.22, 0.42], pos: [fx, h + 0.05, fz], color: col });
        if (kind === 0) X.p({ shape: 'ball', mat: 'petal', size: [0.16, 0.12, 0.16], pos: [fx, h + 0.15, fz], color: '#f2c22a' });
      }
    }
    for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * 220, z = (r() - 0.5) * 220; if (dens(x, z) < 0.2) continue; for (let q = 0; q < 6; q++) X.p({ shape: 'ball', mat: 'leaf', size: [0.55, 0.2, 0.55], pos: [x + (r() - 0.5) * 1.6, 0.18, z + (r() - 0.5) * 1.6], color: '#3f7a2e' }); } // clover
  }
  // ---------------------------------------------------------------- lantern halos (soft additive pools of light)
  const haloG = X.group('village_halos', {}, () => { for (const p of halos) X.p({ shape: 'ball', mat: 'halo', size: [3.6, 3.6, 3.6], pos: p, color: '#ff9a40', gain: 0.35, fog: true, shadow: false }); });
  // ---------------------------------------------------------------- the cloud ceiling (eye, face, gap)
  const gapXZ = o.gap ?? [0, 16];
  if (o.cloud !== false) await S.kit('cloud_ceiling', { y: Y0, ground: false, eye: o.eye ?? [30, -50], gap: gapXZ, face: o.face, glow: o.glow ?? CLOUD_GLOW[lookName] ?? 0.12 });
  S.api ??= {};
  const under = S.api.cloud?.under, noCloud = o.cloud === false;
  // ---------------------------------------------------------------- ambient ropes: from inside every house + far hamlets + fields
  const pts = [];
  houses.forEach((h, i) => { const n = 3 + (i % 4); for (let k = 0; k < n; k++) pts.push([h.x + (r() - 0.5) * (h.w * 0.6), 1, h.z + (r() - 0.5) * (h.d * 0.6)]); });
  for (let k = 0; k < 5; k++) pts.push([72 + (r() - 0.5) * 10, 1, (r() - 0.5) * 8]);
  far.forEach(([x, z]) => { for (let k = 0; k < 4 + Math.floor(r() * 6); k++) pts.push([x + (r() - 0.5) * 8, 1, z + (r() - 0.5) * 6]); });
  while (pts.length < (o.ropes ?? 900)) { const a = r() * Math.PI * 2, d = 140 + r() * 380; pts.push([Math.sin(a) * d, 0.6, Math.cos(a) * d]); }
  const amb = noCloud ? null : ropeField(S, { name: 'village_ropes', count: pts.length, width: 0.17, minPx: 1.5, top: under, sway: 0.18, quiver: 0.012, color: '#e6d8b6', emissive: ROPE_GLOW[lookName] ?? 0.15 });
  amb?.setPoints(pts.slice(0, o.ropes ?? 900));
  X.flush();
  // ---------------------------------------------------------------- the shoe (dawn)
  const shoeAt = [7.5, 0, 21];
  if (o.shoe) await S.prop('single_shoe', { pos: [shoeAt[0], 0.05, shoeAt[2]], yaw: 35, name: 'shoe' });
  // ---------------------------------------------------------------- anchors
  A('spot_green', [0, 0, 0]); A('spot_lift', [gapXZ[0], 0, gapXZ[1]]); A('spot_shoe', shoeAt); A('spot_square', [-4, 0.28, -62]); A('spot_tower_door', [0, 0.28, -98]);
  A('spot_toby_door', [61, 0, 1.5]); A('spot_hale', [-38, 0, 7.5]); A('spot_mayor', [-62, 0, -102]); A('spot_road', [0, 0, 70]); A('spot_crowd', [0, 0, -4]);
  A('cam_wide', [5, 24, 96]); A('cam_wide_at', [-2, 24, -60]);
  A('cam_ews', [70, 80, 300]); A('cam_ews_at', [0, 28, -60]);
  A('cam_green', [10, 4.6, 52]); A('cam_green_at', [0, 15, -40]);
  A('cam_square', [26, 7, -26]); A('cam_square_at', [-4, 16, -100]);
  A('cam_up', [-30, 2.4, -4]); A('cam_up_at', [-64, 98, -36]);
  A('cam_lift', [gapXZ[0] + 9, 2.2, gapXZ[1] + 17]); A('cam_lift_at', [gapXZ[0], 9, gapXZ[1]]);
  A('cam_shoe', [shoeAt[0] + 2.6, 2.2, shoeAt[2] + 4.2]); A('cam_shoe_at', [shoeAt[0], 0.35, shoeAt[2]]);
  A('cam_road', [6, 5, 150]); A('cam_road_at', [0, 8, 40]);
  A('cam_horizon', [-10, 7, 90]); A('cam_horizon_at', [60, 30, -700]);
  A('cam_toby_house', [34, 7, 18]); A('cam_toby_house_at', [72, 9, 0]);
  A('cam_hale', [-26, 4.5, 18]); A('cam_hale_at', [-38, 3, 7]);
  A('cam_tower', [16, 5, -60]); A('cam_tower_at', [0, 40, -112]);
  A('cam_crowd', [6, 12, 52]); A('cam_crowd_at', [0, 30, -10]);
  if (S.api.cloud?.face && !noCloud) { A('cam_face_up', [S.api.cloud.face[0] + 6, 3, S.api.cloud.face[1] + 92]); A('cam_face_up_at', [S.api.cloud.face[0], Y0 + 5, S.api.cloud.face[1] - 6]); }
  S.shadowArea([0, 0, -20], 120);
  // ---------------------------------------------------------------- per-frame state (defaults every frame; the shot's set() overrides)
  const apply = (p = {}) => {
    const L = p.look ?? lookName;
    if (amb) { amb.count(Math.round(pts.length * Math.max(0, Math.min(1, p.ropes ?? 1)))); amb.update(p.t ?? 0); amb.visible((p.ropes ?? 1) > 0);
    amb.mesh.material.emissiveIntensity = p.ropeGlow ?? ROPE_GLOW[L] ?? 0.15; }
    if (S.groups.shoe) S.groups.shoe.visible = p.shoe ?? false; // the morning clue: hidden unless the shot asks for it
    haloG.visible = (p.lamps ?? LAMPS[L] ?? 1) > 0.3;
  };
  X.onFrame((t) => apply({ t }));
  S.api.village = { set: apply, ropes: amb, under, looks: RV_LOOKS, paths: pathD };
  return { anchors: S.anchors };
}
