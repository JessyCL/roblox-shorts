// A single right glove, fingers up, palm facing +Z, centred on the palm.
export const meta = {
  id: 'glove', tags: ['glove', 'hand', 'clothing', 'shop', 'mitten'],
  description: 'Single chunky right glove standing fingers-up (palm toward +Z) with a cream cuff; about 1.2 x 2.4 studs.',
  options: { color: 'glove colour (#c4281c)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function glove(S, o = {}) {
  const col = o.color ?? '#c4281c';
  B(S, { size: [1.2, 1.3, 0.4], pos: [0, 0, 0], material: 'Fabric', color: col });
  for (let k = 0; k < 4; k++) B(S, { size: [0.26, 0.9, 0.36], pos: [-0.45 + k * 0.3, 1.05, 0], material: 'Fabric', color: col });
  B(S, { size: [0.3, 0.7, 0.36], pos: [0.75, 0.1, 0], rot: [0, 0, -35], material: 'Fabric', color: col });
  B(S, { size: [1.3, 0.4, 0.46], pos: [0, -0.8, 0], material: 'Fabric', color: '#f2ead8' });
}
