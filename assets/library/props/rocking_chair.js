// Wooden rocking chair facing +Z, seat at y 2.4 (sit clip: { clip: 'sit', seat: 2.65 }).
export const meta = {
  id: 'rocking_chair', tags: ['chair', 'rocking', 'furniture', 'grandma', 'interior', 'cozy', 'wood'],
  description: "Brown wooden rocking chair facing +Z; seat top at y 2.65 for the sit clip (seat: 2.65). Grandma's knitting spot.",
  options: {},
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function rockingChair(S) {
  B(S, { size: [3.4, 0.5, 3.2], pos: [0, 2.4, 0], material: 'Wood', color: '#6a4426' });
  B(S, { size: [3.4, 4.6, 0.5], pos: [0, 4.6, -1.5], rot: [-10, 0, 0], material: 'Wood', color: '#6a4426' });
  for (const s of [-1, 1]) B(S, { size: [0.4, 0.5, 4.4], pos: [s * 1.5, 0.3, 0], material: 'Wood', color: '#5a3a22' });
  for (const s of [-1, 1]) for (const z of [-1.2, 1.2]) B(S, { size: [0.4, 2.1, 0.4], pos: [s * 1.5, 1.3, z], material: 'Wood', color: '#5a3a22' });
}
