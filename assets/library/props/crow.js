// Blocky black crow perched (beak toward +Z), feet at the origin.
export const meta = {
  id: 'crow', tags: ['crow', 'bird', 'raven', 'spooky', 'animal', 'halloween'],
  description: 'Small black blocky crow with a yellow beak and spread wings, facing +Z - perch on trees/roofs or circle in a keyed group.',
  options: { color: 'feather colour (#15151a)' },
};

export default function crow(S, o = {}) {
  const P = (p) => S.part({ material: 'SmoothPlastic', color: o.color ?? '#15151a', ...p });
  P({ size: [0.7, 0.7, 1.3], pos: [0, 0.35, 0] });
  P({ shape: 'ball', size: [0.6, 0.6, 0.6], pos: [0, 0.85, 0.55] });
  P({ shape: 'wedge', size: [0.2, 0.2, 0.4], pos: [0, 0.82, 0.98], rot: [0, 180, 0], color: '#d8a030' });
  P({ size: [0.5, 0.15, 0.8], pos: [0, 0.4, -0.85] });
  for (const s of [-1, 1]) P({ size: [1.1, 0.12, 0.8], pos: [s * 0.8, 0.6, 0], rot: [0, 0, s * 18] });
}
