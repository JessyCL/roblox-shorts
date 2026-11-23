// Wall rack of farm tools (shovels, pitchforks, axes) leaning against a wall; the wall is at local x = 0, tools stand
// out toward +X along Z (mount it on a left wall, or yaw it).
export const meta = {
  id: 'tools_rack', tags: ['tools', 'rack', 'shovel', 'pitchfork', 'axe', 'farm', 'barn', 'mill', 'medieval'],
  description: 'Row of leaning farm tools (shovels, pitchforks, axes) on a wooden wall rail, about 18 studs long and 9 tall.',
  options: { count: 'number of tools (8)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function toolsRack(S, o = {}) {
  const n = o.count ?? 8, z0 = -8, len = (n - 1) * 2.2 + 2.6;
  B(S, { size: [1, 1, len], pos: [0, 7, 0], material: 'Wood', color: '#4a3020' });
  for (let k = 0; k < n; k++) {
    const z = z0 + k * 2.2, kind = k % 3;
    B(S, { size: [0.35, 9, 0.35], pos: [0.6, 4.5, z], rot: [0, 0, -8], material: 'Wood', color: '#8a6a44' });
    if (kind === 0) B(S, { size: [0.3, 2.2, 1.6], pos: [0, 0.8, z], material: 'Metal', color: '#8a8e94' }); // shovel
    else if (kind === 1) for (let t = 0; t < 4; t++) B(S, { size: [0.25, 1.6, 0.25], pos: [1, 9.2, z - 0.6 + t * 0.4], material: 'Metal', color: '#8a8e94' }); // pitchfork
    else B(S, { size: [0.3, 1.4, 2], pos: [1.2, 8.4, z + 0.5], material: 'Metal', color: '#9a9ea4' }); // axe
  }
}
