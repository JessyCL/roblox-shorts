// Wooden wagon wheel (diameter ~4.2 studs): iron tyre, felloe, 12 spokes and a hub, standing upright facing +Z.
// Lean it with rot / yaw. Base (bottom of the tyre) at the origin.
export const meta = {
  id: 'wagon_wheel', tags: ['wheel', 'wagon', 'cart', 'wood', 'medieval', 'village', 'scale'],
  description: 'Upright wooden wagon wheel (about 4.2 studs across): iron tyre, wooden rim, 12 spokes and a hub, facing +Z.',
  options: { size: 'diameter in studs (4.2)', lean: 'tilt back in degrees (0)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function wagonWheel(S, o = {}) {
  const D = o.size ?? 4.2, R = D / 2, N = 20, lean = o.lean ?? 0;
  S.within([0, 0, 0], 0, () => {
    const c = [0, R, 0], seg = 2 * R * Math.tan(Math.PI / N) + 0.06;
    for (let k = 0; k < N; k++) { const a = (k / N) * Math.PI * 2, x = Math.sin(a), y = Math.cos(a);
      B(S, { size: [seg, 0.32, 0.42], pos: [c[0] + x * (R - 0.16), c[1] + y * (R - 0.16), 0], rot: [lean, 0, -(a * 180) / Math.PI], material: 'Metal', color: '#3a3a3e' });
      B(S, { size: [seg - 0.05, 0.4, 0.36], pos: [c[0] + x * (R - 0.52), c[1] + y * (R - 0.52), 0], rot: [lean, 0, -(a * 180) / Math.PI], material: 'Wood', color: '#7a5434' }); }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; B(S, { size: [0.18, R - 0.6, 0.18], pos: [c[0] + Math.sin(a) * (R - 0.6) / 2, c[1] + Math.cos(a) * (R - 0.6) / 2, 0], rot: [lean, 0, -(a * 180) / Math.PI], material: 'Wood', color: '#8a6440' }); }
    B(S, { shape: 'cylinder', size: [0.7, 0.9, 0.9], pos: c, rot: [0, 90, 0], material: 'Wood', color: '#5a3a22' });
    B(S, { shape: 'cylinder', size: [0.8, 0.4, 0.4], pos: c, rot: [0, 90, 0], material: 'Metal', color: '#2a2a2e' });
  });
}
