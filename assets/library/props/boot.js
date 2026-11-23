// A single leather boot (toe toward +Z), standing on local y = 0.
export const meta = {
  id: 'boot', tags: ['boot', 'shoe', 'leather', 'clothing', 'lost', 'medieval'],
  description: 'Single brown leather boot, toe toward +Z, about 1.3 studs tall.',
  options: { color: 'leather colour (#5a3418)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function boot(S, o = {}) {
  const col = o.color ?? '#5a3418';
  B(S, { size: [0.8, 1.3, 0.8], pos: [0, 0.65, 0], material: 'Fabric', color: col });
  B(S, { size: [0.8, 0.5, 1.5], pos: [0, 0.25, 0.35], material: 'Fabric', color: col });
  B(S, { size: [0.84, 0.16, 1.54], pos: [0, 0.06, 0.35], material: 'SmoothPlastic', color: '#2a1a10' });
}
