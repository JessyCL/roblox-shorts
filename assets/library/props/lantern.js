// Iron lantern with a glowing core and a warm point light. Base at the origin.
export const meta = {
  id: 'lantern', tags: ['lantern', 'light', 'lamp', 'warm', 'medieval', 'night', 'interior'],
  description: 'Black iron lantern (2.4 studs) with a glowing amber core, peaked roof and a warm point light (range 34).',
  options: {},
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function lantern(S) {
  B(S, { size: [1.2, 0.3, 1.2], pos: [0, 0.15, 0], material: 'Metal', color: '#2a2a2e' });
  for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) B(S, { size: [0.15, 1.6, 0.15], pos: [dx, 1, dz], material: 'Metal', color: '#2a2a2e' });
  S.part({ size: [0.8, 1.2, 0.8], pos: [0, 1, 0], material: 'Neon', color: '#ffbe5a' });
  B(S, { shape: 'wedge', size: [1.3, 0.6, 0.65], pos: [0, 2.1, 0.32], material: 'Metal', color: '#2a2a2e' });
  B(S, { shape: 'wedge', size: [1.3, 0.6, 0.65], pos: [0, 2.1, -0.32], rot: [0, 180, 0], material: 'Metal', color: '#2a2a2e' });
  S.light({ type: 'point', pos: [0, 1.2, 0.8], color: '#ffb04a', range: 34, brightness: 3 });
}
