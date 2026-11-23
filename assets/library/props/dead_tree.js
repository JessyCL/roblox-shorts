// Bare, crooked dead tree: dark trunk + 5 random angled branches (seeded). Trunk base at the origin.
import { rng } from '../../../engine/runtime/core/math.js';

export const meta = {
  id: 'dead_tree', tags: ['tree', 'dead', 'spooky', 'bare', 'winter', 'halloween', 'nature'],
  description: 'Leafless dead tree with 5 crooked branches (dark wood) - spooky hills, winter, graveyards. Height ~16 studs.',
  options: { height: 'trunk height (16)', seed: 'branch layout seed (1)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function deadTree(S, o = {}) {
  const h = o.height ?? 16, r = rng(o.seed ?? 1);
  B(S, { size: [1.4, h, 1.4], pos: [0, h / 2, 0], material: 'Wood', color: '#3a2c22' });
  for (let i = 0; i < 5; i++) {
    const a = r() * 360, by = h * (0.45 + r() * 0.5), L = 4 + r() * 5;
    S.within([0, by, 0], a, () => B(S, { size: [0.6, 0.6, L], pos: [0, L * 0.35, L / 2], rot: [-35 - r() * 20, 0, 0], material: 'Wood', color: '#3a2c22' }));
  }
}
