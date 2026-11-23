// Bell tower room ("The Ropes"): the locked stone room under the belfry where Toby spends the night. Rough ashlar walls,
// worn plank floor, heavy beamed ceiling with a ragged hole in the middle (his rope goes straight up through it to the
// cloud), a narrow barred window letting in cold moonlight, a heavy iron-banded door bolted from outside, a ladder to a
// chained trapdoor, two bell ropes with striped sallies tied to a wall cleat, a straw bed with a blanket, a lantern, a
// stool, a bucket, crates. Room interior x/z -9..9, floor y 0, ceiling underside y 15 (hole |x|,|z| < ~1.6); the door is in
// the -Z wall, the window in the +X wall; the camera-side +Z wall can be left out for wide shots (walls: 'cutaway').
//   S.api.tower.set({ shaft: true|false (the moonlight shaft card) })   lights are fixed (pooled lights are copied before shot.update)

export const meta = {
  id: 'bell_tower_room', tags: ['bell tower', 'tower', 'room', 'interior', 'stone', 'locked', 'prison', 'night', 'medieval', 'church', 'belfry', 'rope', 'ropes', 'window', 'moonlight'],
  description: 'Locked stone room under a belfry at night: ashlar walls, plank floor, beamed ceiling with a ragged hole (a rope goes up through it), barred moonlit window, iron-banded bolted door, ladder to a chained trapdoor, two striped bell ropes, straw bed, lantern, stool, bucket, crates.',
  options: { look: "'tower_night' (default) | any look", walls: "'all' (default) | 'cutaway' (no +Z wall, for wide shots)", lantern: 'false = no lantern' },
  anchors: { spot_toby: 'under the ceiling hole (his rope goes straight up; hole |x| < 3, |z| < ~2.2)', spot_bed: 'straw bed', spot_window: 'below the window', spot_door: 'inside the door', hole: 'centre of the ceiling hole',
    cam_wide: 'high corner wide of the whole room', cam_low: 'low angle from the floor up to the hole', cam_hole_up: 'straight up through the hole', cam_door: 'toward the bolted door', cam_window: 'toward the moonlit window', cam_feet: 'close on the ankle and the rope on the floor' },
};

export const TOWER_LOOK = {
  preset: 'interior', sun: { color: '#9fb6ff', intensity: 0.35, elevation: 30, azimuth: 90 },
  hemi: { sky: '#3e5296', ground: '#3a2a22', intensity: 0.75 }, ambient: { color: '#4a5a9a', intensity: 0.14 }, env: 0.35, lights: 1,
  sky: { zenith: '#0b1640', horizon: '#22386e', ground: '#101a3a', haze: 0, clouds: 0, stars: 0, moon: 0, sunGlow: 0 },
  fog: { color: '#141c38', density: 0.004 }, exposure: 1.05, shadow: { softness: 0.4, intensity: 0.8 },
  post: { bloom: { intensity: 1.0, threshold: 0.85 }, ao: { intensity: 1.1 }, grade: { saturation: 1.18, contrast: 1.06, temperature: -0.02, lift: 0.02 } },
};

export default async function bellTowerRoom(S, o = {}) {
  const THREE = S.THREE;
  const { makeKit } = await import('./_matkit.js');
  const { rng } = await import('../../../engine/runtime/core/math.js');
  S.look(o.look === undefined || o.look === 'tower_night' ? TOWER_LOOK : o.look);
  const X = makeKit(S), r = rng('btr'), A = (n, p) => S.anchor(n, p);
  const W = 9, T = 2.4, CH = 15, b = (mat, x0, x1, y0, y1, z0, z1, color, ex = {}) => X.p({ mat, size: [x1 - x0, y1 - y0, z1 - z0], pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], color, ...ex });
  // ---- floor, walls
  b('planks', -W - T, W + T, -1, 0, -W - T, W + T, '#6e5236');
  const cut = o.walls === 'cutaway';
  b('stone', -W - T, -W, 0, CH + 6, -W - T, W + T, '#8e8574');                                  // -X wall
  b('stone', -W, W, 0, CH + 6, -W - T, -W, '#8a8170');                                          // -Z wall (door)
  if (!cut) b('stone', -W, W, 0, CH + 6, W, W + T, '#8a8170');                                  // +Z wall
  // +X wall with a narrow arched window (x = W, y 6..12, z -1.2..1.2)
  b('stone', W, W + T, 0, CH + 6, -W - T, -1.3, '#908775'); b('stone', W, W + T, 0, CH + 6, 1.3, W + T, '#908775');
  b('stone', W, W + T, 0, 6, -1.3, 1.3, '#908775'); b('stone', W, W + T, 12.6, CH + 6, -1.3, 1.3, '#908775');
  X.p({ shape: 'wedge', mat: 'stone', size: [T, 0.7, 1.3], pos: [W + T / 2, 12.25, -0.66], rot: [0, 180, 0], color: '#908775' });
  X.p({ shape: 'wedge', mat: 'stone', size: [T, 0.7, 1.3], pos: [W + T / 2, 12.25, 0.66], color: '#908775' });
  b('stone', W - 0.3, W + T + 0.3, 5.7, 6.3, -1.7, 1.7, '#a09884');                               // sill (top 0.3 above the wall block)
  for (const z of [-0.6, 0, 0.6]) b('iron', W + 1.1, W + 1.3, 6, 12.4, z - 0.07, z + 0.07, '#2a2c30');
  b('iron', W + 1.1, W + 1.3, 9, 9.15, -1.3, 1.3, '#2a2c30');
  { // night sky + far cloud seen through the window (unlit card outside, 30 studs away)
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#3a4470'); gr.addColorStop(0.55, '#24366e'); gr.addColorStop(1, '#162250'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    card.position.set(W + 30, 9, 0); card.rotation.y = -Math.PI / 2; card.userData.noShadowFit = true; S.root.add(card);
  }
  // ---- door (-Z wall): planks, iron bands, studs, big ring; the bolt is outside (we only see the gap of light under it)
  b('beam', -2.4, 2.4, 0, 8.8, -W + 0.05, -W + 0.75, '#4a3020');
  for (const y of [1.6, 4.4, 7.2]) b('iron', -2.5, 2.5, y - 0.25, y + 0.25, -W + 0.6, -W + 0.95, '#2e2a28');
  for (let k = 0; k < 9; k++) X.p({ shape: 'ball', mat: 'iron', size: [0.28, 0.28, 0.28], pos: [-2 + (k % 3) * 2, 1.6 + Math.floor(k / 3) * 2.8, -W + 1.0], color: '#3a3430' });
  X.p({ shape: 'cylinder', mat: 'iron', size: [0.14, 1.1, 1.1], pos: [1.4, 4.4, -W + 1.15], rot: [0, 90, 0], color: '#3a3430' });
  b('stone', -3.2, 3.2, 8.8, 9.8, -W - 0.1, -W + 0.4, '#a09884');                                // lintel
  X.p({ mat: 'neon', size: [4.4, 0.12, 0.2], pos: [0, 0.07, -W + 0.3], color: '#ffb060', gain: 2.2, shadow: false }); // lantern light under the door
  // ---- ceiling: beams + planks with a ragged hole in the middle (|x|,|z| < 1.6)
  for (const x of [-6, 6]) b('beam', x - 0.7, x + 0.7, CH - 1.2, CH, -W, W, '#3c2a1c');
  b('beam', -W, W, CH - 1.0, CH - 0.2, -4.6, -3.4, '#3c2a1c'); b('beam', -W, W, CH - 1.0, CH - 0.2, 3.4, 4.6, '#3c2a1c');
  for (let i = 0; i < 12; i++) { // planks across z; the middle planks are broken round the hole
    const x0 = -W + i * 1.5, x1 = x0 + 1.45, mid = Math.abs(x0 + 0.72) < 3.0;
    if (!mid) { b('planks', x0, x1, CH, CH + 0.5, -W, W, '#5e4630'); continue; }
    const z1 = -1.9 - r() * 0.9 + Math.abs(x0 + 0.72) * 0.25, z2 = 1.9 + r() * 0.9 - Math.abs(x0 + 0.72) * 0.25;
    b('planks', x0, x1, CH, CH + 0.5, -W, z1, '#5e4630'); b('planks', x0, x1, CH, CH + 0.5, z2, W, '#5e4630');
    X.p({ shape: 'wedge', mat: 'planks', size: [1.45, 0.5, 0.9], pos: [x0 + 0.72, CH + 0.25, z1 + 0.45], color: '#7a5a3c' }); // splinters
    X.p({ shape: 'wedge', mat: 'planks', size: [1.45, 0.5, 0.9], pos: [x0 + 0.72, CH + 0.25, z2 - 0.45], rot: [0, 180, 0], color: '#7a5a3c' });
  }
  b('stone', -W, W, CH + 6, CH + 14, -W - T, -W, '#4a4640'); b('stone', -W, W, CH + 6, CH + 14, W, W + T, '#4a4640'); // the belfry shaft above the hole (starts where the room walls end)
  b('stone', -W - T, -W, CH + 6, CH + 14, -W, W, '#4a4640'); b('stone', W, W + T, CH + 6, CH + 14, -W, W, '#4a4640');
  X.p({ mat: 'neon', size: [2 * W, 0.4, 2 * W], pos: [0, CH + 14, 0], color: '#1c2858', gain: 1.0, shadow: false });     // night sky glimpsed above the belfry
  // ---- ladder + chained trapdoor (corner -X, -Z)
  for (const s of [-1, 1]) b('wood', -W + 1.2 + s * 0.9 - 0.15, -W + 1.2 + s * 0.9 + 0.15, 0, CH + 0.4, -W + 3.5, -W + 3.8, '#6a4a2e', { rot: [0, 0, 0] });
  for (let y = 1.2; y < CH; y += 1.3) b('wood', -W + 0.3, -W + 2.1, y - 0.12, y + 0.12, -W + 3.55, -W + 3.75, '#7a5a3a');
  b('planks', -W + 0.2, -W + 3.2, CH + 0.5, CH + 0.8, -W + 2, -W + 5.4, '#4a3420');
  for (let k = 0; k < 7; k++) X.p({ mat: 'chain', size: [0.25, 0.5, 0.12], pos: [-W + 0.4 + k * 0.45, CH - 0.4 - Math.sin((k / 6) * Math.PI) * 0.8, -W + 3.6], rot: [0, k % 2 ? 90 : 0, 0], color: '#8a8a90' });
  // ---- bell ropes with striped sallies, tied to a wall cleat
  for (const [x, z, k] of [[5.5, -5.5, 0], [6.6, -4.2, 1]]) {
    X.p({ shape: 'vcyl', mat: 'rope', size: [0.32, CH + 0.4, 0.32], pos: [x, CH / 2 + 0.2, z], color: '#cdb88e' });
    for (let q = 0; q < 6; q++) X.p({ shape: 'vcyl', mat: 'cloth', size: [0.62, 0.4, 0.62], pos: [x, 5.2 + q * 0.4 + k, z], color: q % 2 ? '#e8e0d0' : '#a82a2a' }); // sally
  }
  b('wood', W - 0.4, W, 4.6, 5.2, -6.2, -3.6, '#5a4028');
  // ---- straw bed + blanket, stool, bucket, crates, lantern
  for (let k = 0; k < 40; k++) X.p({ mat: 'thatch', size: [1.6 + r(), 0.25, 0.3], pos: [-5.6 + r() * 4.4, 0.15 + r() * 0.35, 4.2 + r() * 3.6], rot: [0, r() * 180, r() * 10], color: ['#c8a85a', '#b8984a', '#d8b86a'][k % 3] });
  b('cloth', -6.2, -2.4, 0.45, 0.75, 4.6, 7.6, '#6a3a3a', { rot: [0, 8, 2] });
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [0, 0.6]]) b('wood', 3.6 + dx - 0.12, 3.6 + dx + 0.12, 0, 1.6, 5.6 + dz - 0.12, 5.6 + dz + 0.12, '#6a4a2e');
  X.p({ shape: 'vcyl', mat: 'planks', size: [1.6, 0.3, 1.6], pos: [3.6, 1.7, 5.6], color: '#7a5a3a' });
  X.p({ shape: 'vcyl', mat: 'planks', size: [1.4, 1.4, 1.4], pos: [-6.8, 0.7, -2.2], color: '#5a4028' });
  for (const [x, z, s] of [[6.6, 6.4, 2.2], [6.6, 3.9, 1.8], [6.4, 6.2, 1.6]]) b('planks', x - s / 2, x + s / 2, z === 6.2 ? 2.2 : 0, (z === 6.2 ? 2.2 : 0) + s, z - s / 2, z + s / 2, '#8a6a44');
  let lantern = null;
  if (o.lantern !== false) {
    const lx = -7.6, ly = 7.2, lz = 3.4;
    b('iron', lx - 1.4, lx - 1.0, ly + 1.8, ly + 2.1, lz - 0.15, lz + 0.15, '#2a2a2e');
    b('iron', lx - 0.45, lx + 0.45, ly - 0.7, ly - 0.55, lz - 0.45, lz + 0.45, '#2a2a2e');
    for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) b('iron', lx + dx - 0.06, lx + dx + 0.06, ly - 0.6, ly + 0.7, lz + dz - 0.06, lz + dz + 0.06, '#2a2a2e');
    X.p({ mat: 'neon', size: [0.55, 0.9, 0.55], pos: [lx, ly + 0.05, lz], color: '#ffb35a', gain: 4, shadow: false });
    X.p({ shape: 'ball', mat: 'halo', size: [4, 4, 4], pos: [lx, ly, lz], color: '#ff9a40', gain: 0.5, shadow: false });
    lantern = S.light({ type: 'point', pos: [lx + 1.2, ly, lz], color: '#ffb35a', range: 30, brightness: 2.6 });
  }
  const moon = S.light({ type: 'spot', pos: [W + 6, 13, 0], dir: [-1, -0.55, 0.05], angle: 34, color: '#a8bcff', range: 40, brightness: 3.2 });
  const fill = S.light({ type: 'point', pos: [0, CH - 2, 0], color: '#5a70c0', range: 26, brightness: 0.8 });
  // window light shaft (additive, soft)
  { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    const tex = new THREE.CanvasTexture(c);
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 13), new THREE.MeshBasicMaterial({ map: tex, color: '#6a80c8', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    shaft.position.set(W - 3.4, 6.2, 0.2); shaft.rotation.set(0, Math.PI / 2, -0.95); shaft.name = 'window_shaft'; shaft.userData.noShadowFit = true; S.root.add(shaft); S._towerShaft = shaft; }
  X.flush();
  S.shadowArea([0, 6, 0], 16);
  // ---- anchors
  A('spot_toby', [0, 0, 0]); A('spot_bed', [-4, 0.5, 6]); A('spot_window', [W - 2.4, 0, 0]); A('spot_door', [0, 0, -W + 2.6]); A('hole', [0, CH, 0]);
  A('cam_wide', [7.4, 12.6, 8.2]); A('cam_wide_at', [-1.5, 4, -2]);
  A('cam_low', [2.6, 0.7, 5.6]); A('cam_low_at', [0, CH, -0.3]);
  A('cam_hole_up', [0.6, 3.2, 0.9]); A('cam_hole_up_at', [0.05, CH + 6, 0]);
  A('cam_door', [3, 5, 6.5]); A('cam_door_at', [0, 4, -W]);
  A('cam_window', [-5.5, 5, 3]); A('cam_window_at', [W, 8.5, 0]);
  A('cam_feet', [1.6, 0.9, 2.6]); A('cam_feet_at', [0, 0.6, 0]);
  const apply = (p = {}) => { S._towerShaft.visible = p.shaft !== false; };
  X.onFrame(() => apply({}));
  S.api = S.api ?? {};
  S.api.tower = { set: apply, ceiling: CH, lights: { lantern, moon, fill } };
  return { anchors: S.anchors };
}
