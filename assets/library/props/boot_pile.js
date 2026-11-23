// A stepped pile of exactly 61 left boots (25 + 16 + 12 + 6 + 2), centred on the origin, about 6 studs tall.
import boot from './boot.js';

export const meta = {
  id: 'boot_pile', tags: ['boot', 'pile', 'stolen', 'hoard', 'shoes', 'heap', 'medieval'],
  description: 'Heap of 61 brown boots in 5 stepped layers (5x5 base), about 5 x 8 studs wide and 6 tall - a hoard of stolen things.',
  options: { colors: 'boot colours cycled through the pile' },
};

export default function bootPile(S, o = {}) {
  const layers = [[5, 5], [4, 4], [3, 4], [2, 3], [1, 2]], cols = o.colors ?? ['#5a3418', '#6a4020', '#3a2a1e', '#7a4a26', '#4a2e16'];
  let n = 0;
  layers.forEach(([nx, nz], L) => {
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      S.within([(i - (nx - 1) / 2) * 1.05, L * 1.15, (j - (nz - 1) / 2) * 1.75], ((i * 7 + j * 3 + L) % 3 - 1) * 12, () => boot(S, { color: cols[n % cols.length] }));
      n++;
    }
  });
  console.assert(n === 61, 'boot pile must hold 61 boots');
}
