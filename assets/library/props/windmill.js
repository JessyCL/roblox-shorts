// Old stone windmill (tower base at the origin, door facing +Z) with a slowly turning 4-sail rotor (group `sails`).
export const meta = {
  id: 'windmill', tags: ['windmill', 'mill', 'tower', 'stone', 'spooky', 'hill', 'medieval', 'landmark'],
  description: 'Tall cobblestone windmill (about 40 studs) with a plank cap, dark door, three warm-lit windows and 24-stud sails that turn (keys on group `sails`).',
  options: { sails: 'false = no rotor', spin: 'sail rotation in degrees over 140 s (-300)', sailsName: "group name of the rotor ('sails')" },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function windmill(S, o = {}) {
  B(S, { shape: 'cylinder', size: [12, 19, 19], pos: [0, 6, 0], rot: [0, 0, 90], material: 'Cobblestone', color: '#7e786c' });
  B(S, { shape: 'cylinder', size: [12, 17, 17], pos: [0, 18, 0], rot: [0, 0, 90], material: 'Cobblestone', color: '#86806f' });
  B(S, { shape: 'cylinder', size: [8, 15, 15], pos: [0, 28, 0], rot: [0, 0, 90], material: 'Cobblestone', color: '#8c8676' });
  for (let k = 0; k < 7; k++) B(S, { shape: 'cylinder', size: [1.8, 16 - k * 2.2, 16 - k * 2.2], pos: [0, 32.9 + k * 1.75, 0], rot: [0, 0, 90], material: 'WoodPlanks', color: k % 2 ? '#4a3022' : '#553826' });
  B(S, { size: [5, 8.5, 1.2], pos: [0, 4.2, 9.2], material: 'WoodPlanks', color: '#3a2618' });
  B(S, { size: [6, 9.5, 0.8], pos: [0, 4.7, 8.9], material: 'Wood', color: '#2a1c12' });
  for (const [y, x] of [[14, -4], [21, 3], [27, -2]]) B(S, { size: [2.2, 3, 0.6], pos: [x, y, 8.4], material: 'SmoothPlastic', color: '#3a2a18', glow: 1.8, emissive: '#ffb050' });
  if (o.sails === false) return;
  const hub = [0, 26, 8.4];
  S.group(o.sailsName ?? 'sails', { pivot: hub, keys: { rot: [{ t: 0, v: [0, 0, 0] }, { t: 140, v: [0, 0, o.spin ?? -300] }] } }, () => {
    B(S, { shape: 'cylinder', size: [2.2, 2.2, 2.2], pos: [hub[0], hub[1], hub[2] + 0.4], rot: [0, 90, 0], material: 'Wood', color: '#3a2618' });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
      B(S, { size: [0.8, 24, 0.6], pos: [hub[0] + s * 12, hub[1] + c * 12, hub[2] + 1], rot: [0, 0, (-a * 180) / Math.PI], material: 'Wood', color: '#4a3020' });
      B(S, { size: [4.4, 17, 0.25], pos: [hub[0] + s * 14 + c * 2.6, hub[1] + c * 14 - s * 2.6, hub[2] + 0.9], rot: [0, 0, (-a * 180) / Math.PI], material: 'WoodPlanks', color: k % 2 ? '#a89070' : '#9a8264' });
    }
  });
}
