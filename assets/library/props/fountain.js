// Village fountain: round stone basin (12-sided, radius ~5.5) with a rim you can sit on, water inside, a two-tier central
// column with a bowl and a spout; the water surface shimmers (group "fountain_water" bobs) and four jets arc into the basin.
// Base at the origin (basin floor sunk 0.3 below y 0, so it sits on cobbles without coplanar faces).
export const meta = {
  id: 'fountain', tags: ['fountain', 'water', 'stone', 'village', 'square', 'medieval', 'basin', 'plaza'],
  description: 'Round stone village fountain (radius ~5.5): 12-sided basin with a sitting rim, water, a two-tier column with a bowl and four arcing water jets.',
  options: { radius: 'basin radius (5.5)', stone: 'stone colour (#a8a294)', water: 'water colour (#4a8ab8)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function fountain(S, o = {}) {
  const R = o.radius ?? 5.5, st = o.stone ?? '#a8a294', dk = '#8a8478', N = 12;
  const seg = 2 * R * Math.tan(Math.PI / N) + 0.15;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2, x = Math.sin(a) * R, z = Math.cos(a) * R, yaw = (a * 180) / Math.PI;
    B(S, { size: [seg, 2.2, 1.1], pos: [x, 0.8, z], rot: [0, yaw, 0], material: 'Cobblestone', color: k % 2 ? st : dk });  // basin wall
    B(S, { size: [seg + 0.25, 0.45, 1.6], pos: [Math.sin(a) * (R + 0.05), 2.1, Math.cos(a) * (R + 0.05)], rot: [0, yaw, 0], material: 'Slate', color: '#b8b2a4' }); // rim cap
  }
  B(S, { shape: 'cylinder', size: [0.6, 2 * R, 2 * R], pos: [0, -0.05, 0], rot: [0, 0, 90], material: 'Slate', color: dk }); // basin floor
  const water = S.group('fountain_water', { pivot: [0, 1.35, 0] }, () => {
    S.part({ shape: 'cylinder', size: [0.12, 2 * R - 0.9, 2 * R - 0.9], pos: [0, 1.35, 0], rot: [0, 0, 90], material: 'Glass', color: o.water ?? '#4a8ab8', transparency: 0.25, reflectance: 0.35, castShadow: false });
  });
  B(S, { shape: 'cylinder', size: [3.2, 2.2, 2.2], pos: [0, 2.2, 0], rot: [0, 0, 90], material: 'Cobblestone', color: st });   // column
  B(S, { shape: 'cylinder', size: [0.6, 4.6, 4.6], pos: [0, 4.0, 0], rot: [0, 0, 90], material: 'Slate', color: '#b8b2a4' });  // upper bowl
  B(S, { shape: 'cylinder', size: [0.12, 3.9, 3.9], pos: [0, 4.36, 0], rot: [0, 0, 90], material: 'Glass', color: o.water ?? '#4a8ab8', transparency: 0.25, castShadow: false });
  B(S, { shape: 'cylinder', size: [1.6, 1.0, 1.0], pos: [0, 5.1, 0], rot: [0, 0, 90], material: 'Slate', color: st });
  B(S, { shape: 'ball', size: [1.3, 1.3, 1.3], pos: [0, 6.1, 0], material: 'Slate', color: '#c4beb0' });
  const jets = S.group('fountain_jets', { pivot: [0, 4.4, 0] }, () => {
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, r = 2.2 + u * 1.9, y = 4.3 + 1.0 * Math.sin(u * Math.PI) - u * 2.6;
        S.part({ shape: 'ball', size: [0.32, 0.32, 0.32], pos: [Math.sin(a) * r, y, Math.cos(a) * r], material: 'Glass', color: '#bfe4ff', transparency: 0.35, castShadow: false }); } }
  });
  S.texts.push({ update: (t) => { water.position.y = water.userData.pivot[1] + 0.04 * Math.sin(t * 2.1); jets.rotation.y = 0.15 * Math.sin(t * 1.3); jets.scale.y = 1 + 0.04 * Math.sin(t * 7.3); } });
}
