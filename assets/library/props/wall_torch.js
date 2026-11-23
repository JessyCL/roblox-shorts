// Wall-mounted medieval torch on a wall face (wall at local z 0, torch sticking out toward +Z): iron bracket, wooden
// stick tilted outward, a layered glowing flame (bloom at night) and an optional warm point light.
// ~3 studs tall at size 1. From "The TINY War" (kingdom walls at night).
export const meta = {
  id: 'wall_torch', tags: ['torch', 'fire', 'flame', 'wall', 'castle', 'medieval', 'night', 'light'],
  description: 'Wall torch facing +Z: iron bracket, tilted wooden stick, layered orange/yellow glowing flame; light: true adds a warm point light (use sparingly, a few per scene).',
  options: { size: 'scale (1)', light: 'true = warm point light', range: 'light range (36)', brightness: 'light brightness (1.6)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function wallTorch(S, o = {}) {
  const k = o.size ?? 1;
  B(S, { size: [0.9 * k, 0.5 * k, 1.2 * k], pos: [0, 0, 0.5 * k], material: 'Metal', color: '#2a2a2e' });
  B(S, { size: [0.35 * k, 2.2 * k, 0.35 * k], pos: [0, 0.8 * k, 1.1 * k], rot: [22, 0, 0], material: 'Wood', color: '#4a3020' });
  B(S, { size: [0.7 * k, 0.5 * k, 0.7 * k], pos: [0, 1.8 * k, 1.5 * k], rot: [22, 0, 0], material: 'Metal', color: '#3a3a3e' });
  B(S, { size: [0.75 * k, 1.1 * k, 0.75 * k], pos: [0, 2.4 * k, 1.62 * k], rot: [0, 45, 0], material: 'Neon', color: '#ff7a1a' });
  B(S, { size: [0.45 * k, 0.9 * k, 0.45 * k], pos: [0, 2.6 * k, 1.62 * k], rot: [0, 20, 0], material: 'Neon', color: '#ffd24a' });
  if (o.light) S.light({ type: 'point', raw: true, pos: S.toWorld([0, 2.6 * k, 2.2 * k]), color: '#ffa04a', range: o.range ?? 36, brightness: o.brightness ?? 1.6 });
}
