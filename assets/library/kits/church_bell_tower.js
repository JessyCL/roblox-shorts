// Stone church with a square bell tower, open belfry (swinging bell group `bell`), slate spire, clock face, stained-glass
// side windows and a belfry lantern that lights at night. Local frame: tower centred at the origin, nave behind it (-Z),
// door facing +Z (from "Everyone Has ONE Hand").
import churchBell from '../props/church_bell.js';

export const meta = {
  id: 'church_bell_tower', tags: ['church', 'bell', 'tower', 'belfry', 'spire', 'stone', 'medieval', 'village', 'clock', 'landmark'],
  description: 'Limestone church: 34-stud square bell tower with an open belfry and a big bronze bell (group "bell" to swing), slate spire to 66 studs, clock face, blue stained-glass nave windows, lantern in the belfry at night.',
  options: { pos: 'tower base [x,y,z] (or [x,z])', yaw: 'facing (deg)', bell: 'false = empty belfry', stone: 'wall colour', ground: 'false = no ground/look (inside another set)', look: "look when standalone ('day')" },
  anchors: { bell: 'the bell (group "bell" pivots at the beam)', belfry: 'belfry centre', churchDoor: 'in front of the door', cam_front: 'low wide of the facade', cam_belfry: 'level with the bell',
    cam_wide: 'wide establishing shot' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export const pyramid = (S, cx, y, cz, s, h, mat, col) => { // 4-wedge square pyramid (spires, roofs)
  for (let k = 0; k < 4; k++) S.within([cx, y, cz], k * 90, () => B(S, { shape: 'wedge', size: [s, h, s / 2], pos: [0, h / 2, -s / 4], material: mat, color: col }));
};

export default async function churchBellTower(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.ground !== false) { S.look(o.look ?? 'day'); S.ground({ material: 'Grass', color: '#5f9a45', size: 600 }); S.part({ size: [70, 0.22, 44], pos: [0, 0.11, 22], material: 'Cobblestone', color: '#a39c90' }); }
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    const cz = 0, stone = o.stone ?? '#cfc6b4';
    B(S, { size: [26, 20, 40], pos: [0, 10, cz - 26], material: 'Limestone', color: stone });
    for (const s of [-1, 1]) B(S, { shape: 'wedge', size: [42, 14, 14], pos: [s * 7, 27, cz - 26], rot: [0, s < 0 ? 90 : -90, 0], material: 'Limestone', color: stone });
    for (const s of [-1, 1]) B(S, { size: [21, 0.8, 44], pos: [s * 7.4, 27.4, cz - 26], rot: [0, 0, -s * 45], material: 'Slate', color: '#4a4e58' });
    for (const z of [-14, -26, -38]) for (const s of [-1, 1]) B(S, { size: [0.4, 9, 3.4], pos: [s * 13.1, 10, cz + z], material: 'SmoothPlastic', color: '#3a5aa8', glow: 1.4, emissive: '#6a8ae8' });
    B(S, { size: [14, 34, 14], pos: [0, 17, cz], material: 'Limestone', color: '#d8cfbd' });
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) B(S, { size: [2.4, 10, 2.4], pos: [x, 39, cz + z], material: 'Limestone', color: '#d8cfbd' });
    B(S, { size: [15, 2, 15], pos: [0, 45, cz], material: 'Limestone', color: '#c4baa6' });
    pyramid(S, 0, 46, cz, 15, 18, 'Slate', '#4a4e58');
    B(S, { size: [0.6, 4, 0.6], pos: [0, 65.5, cz], material: 'Metal', color: '#d8c27a' });
    B(S, { size: [2.4, 0.6, 0.6], pos: [0, 66.3, cz], material: 'Metal', color: '#d8c27a' });
    B(S, { shape: 'cylinder', size: [0.6, 7, 7], pos: [0, 27, cz + 7.1], rot: [0, 90, 0], material: 'SmoothPlastic', color: '#f4f0e6' });
    B(S, { size: [0.4, 2.8, 0.3], pos: [0, 28.2, cz + 7.5], material: 'SmoothPlastic', color: '#1a1a1a' });
    B(S, { size: [2, 0.4, 0.3], pos: [0.8, 27, cz + 7.5], material: 'SmoothPlastic', color: '#1a1a1a' });
    B(S, { size: [7.4, 10.4, 0.5], pos: [0, 5.2, cz + 7.05], material: 'Limestone', color: '#b8ae9a' });
    B(S, { size: [6, 9, 0.6], pos: [0, 4.5, cz + 7.2], material: 'WoodPlanks', color: '#5a3a22' });
    if (o.bell !== false) S.group('bell', { pivot: [0, 43.2, cz] }, () => {
      B(S, { size: [11, 0.8, 0.8], pos: [0, 43.6, cz], material: 'Wood', color: '#4a3020' });
      S.within([0, 37.6, cz], 0, () => churchBell(S, { size: 1.05 }));
    });
    A('bell', [0, 40, cz]);
    S.light({ type: 'point', pos: [0, 41, cz + 4.5], color: '#ffc880', range: 24, brightness: 3, auto: true }); // belfry lantern (night)
    A('belfry', [0, 41, cz]);
    A('churchDoor', [0, 0, cz + 10]);
    A('cam_front', [10, 6, 42]); A('cam_front_at', [0, 40, 0]);
    A('cam_belfry', [7, 41.5, 20]); A('cam_belfry_at', [0, 40, 0]);
    A('cam_wide', [34, 22, 78]); A('cam_wide_at', [0, 26, -12]);
  });
  return { anchors: out };
}
