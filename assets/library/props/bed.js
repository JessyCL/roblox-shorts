// Single wooden bed along X with the headboard at the +X end; mattress top at y 3.9 (sit clip seat: 3.9).
export const meta = {
  id: 'bed', tags: ['bed', 'bedroom', 'furniture', 'night', 'sleep', 'interior', 'kids'],
  description: 'Wooden single bed along X (headboard at +X), white sheet, coloured blanket and pillow; mattress top at y 3.9, room underneath to hide.',
  options: { length: 'bed length along X (10)', blanket: 'blanket colour (#c4281c)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function bed(S, o = {}) {
  const len = o.length ?? 10, blanket = o.blanket ?? '#c4281c';
  for (const [dx, dz] of [[-len / 2 + 0.5, -2.6], [len / 2 - 0.5, -2.6], [-len / 2 + 0.5, 2.6], [len / 2 - 0.5, 2.6]]) B(S, { size: [0.7, 2.6, 0.7], pos: [dx, 1.3, dz], material: 'Wood', color: '#6a4426' });
  B(S, { size: [len, 0.6, 6], pos: [0, 2.7, 0], material: 'Wood', color: '#7a5030' });
  B(S, { size: [len - 0.4, 0.9, 5.6], pos: [0, 3.45, 0], material: 'Fabric', color: '#f4f0e6' });
  B(S, { size: [len * 0.7, 0.4, 5.9], pos: [-len * 0.13, 4.05, 0], material: 'Fabric', color: blanket });
  B(S, { size: [1.8, 0.7, 3.6], pos: [len / 2 - 1.4, 4.2, 0], material: 'Fabric', color: '#ffffff' });
  B(S, { size: [0.7, 6, 6.4], pos: [len / 2, 3.4, 0], material: 'Wood', color: '#6a4426' });
}
