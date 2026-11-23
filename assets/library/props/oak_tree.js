// Blocky leafy tree on y = 0: tapered trunk, two branches and a crown of 7 overlapping rotated leaf blocks in mixed
// greens (no balls). `size` scales the whole tree (1 = ~22 studs). From "The TINY War".
import { rng } from '../../../engine/runtime/core/math.js';
export const meta = {
  id: 'oak_tree', tags: ['tree', 'oak', 'forest', 'nature', 'leafy', 'park', 'village'],
  description: 'Blocky leafy oak: tapered trunk, two branches, a crown of overlapping rotated leaf blocks in mixed greens (about 22 studs tall at size 1).',
  options: { size: 'scale factor (1)', seed: 'shape variation', autumn: 'true = orange/red leaves' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function oakTree(S, o = {}) {
  const k = o.size ?? 1, r = rng(o.seed ?? 'oak');
  const greens = o.autumn ? ['#c8642a', '#d88a2a', '#b84a22', '#e0a03a'] : ['#3e7a2e', '#4a8a34', '#356c28', '#5a9a3a'];
  B(S, { size: [2.2 * k, 6 * k, 2.2 * k], pos: [0, 3 * k, 0], material: 'Wood', color: '#5a3e26' });
  B(S, { size: [1.6 * k, 6 * k, 1.6 * k], pos: [0, 8.5 * k, 0], material: 'Wood', color: '#5a3e26' });
  for (const s of [-1, 1]) B(S, { size: [1 * k, 5 * k, 1 * k], pos: [s * 1.8 * k, 10 * k, 0.4 * k], rot: [0, 0, s * -38], material: 'Wood', color: '#5a3e26' });
  const blobs = [[0, 15, 0, 10], [-4, 13, 1, 7.5], [4, 13.5, -1, 7.5], [1, 13, 4, 7], [-1, 13.5, -4, 7], [0, 18.5, 0, 7], [2.5, 17, 2, 5.5]];
  for (const [x, y, z, s] of blobs) B(S, { size: [s * k, s * 0.8 * k, s * k], pos: [x * k, y * k, z * k], rot: [r() * 20 - 10, r() * 90, r() * 20 - 10], material: 'LeafyGrass', color: greens[Math.floor(r() * greens.length)] });
}
