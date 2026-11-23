// Tiny-folk warship made from a green leaf, floating with its hull bottom at y = 0, bow toward +Z: leaf hull with a
// pointed bow, raised rims and midrib, mast, cloth sail and a blue pennant. ~28 studs long. From "The TINY War".
export const meta = {
  id: 'leaf_ship', tags: ['leaf', 'ship', 'boat', 'tiny', 'navy', 'river', 'sail', 'tiny war'],
  description: 'Leaf boat for tiny people: green leaf hull with pointed bow (+Z), rims and midrib, wooden mast, cream sail and pennant.',
  options: { size: 'scale (1)', pennant: 'pennant colour (#2f5fae)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function leafShip(S, o = {}) {
  const k = o.size ?? 1;
  B(S, { size: [9 * k, 1.2, 22 * k], pos: [0, 0.4, 0], material: 'LeafyGrass', color: '#4aa83a' });
  B(S, { size: [6 * k, 1.2, 6 * k], pos: [0, 0.4, 13 * k], rot: [0, 45, 0], material: 'LeafyGrass', color: '#4aa83a' });
  B(S, { size: [0.5, 1.4, 26 * k], pos: [0, 0.6, 1], material: 'SmoothPlastic', color: '#8acb5a' });
  for (const s of [-1, 1]) B(S, { size: [0.8, 2.4, 20 * k], pos: [s * 4.4 * k, 1.6, 0], material: 'LeafyGrass', color: '#3a8a2e' });
  B(S, { shape: 'cylinder', size: [16 * k, 0.8, 0.8], pos: [0, 8 * k, 0], rot: [0, 0, 90], material: 'Wood', color: '#6a4428' });
  B(S, { size: [8 * k, 9 * k, 0.4], pos: [0, 9.5 * k, 0.6], material: 'Fabric', color: '#f4efe2' });
  B(S, { size: [2 * k, 1.2 * k, 0.2], pos: [1 * k, 16.5 * k, 0], material: 'Fabric', color: o.pennant ?? '#2f5fae' });
}
