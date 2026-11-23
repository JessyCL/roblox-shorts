// Clipboard with a sheet of paper and a metal clip; lies flat (top edge toward -Z) or stands upright facing +Z.
// (Characters can also hold one: hold: { r: 'clipboard' }.)
export const meta = {
  id: 'clipboard', tags: ['clipboard', 'paper', 'office', 'list', 'teacher', 'inspector', 'desk'],
  description: 'Brown clipboard (0.9 x 1.2) with white paper and a silver clip - on a desk or leaning upright.',
  options: { upright: 'true = stand facing +Z', paper: 'paper colour (#fafafa)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function clipboard(S, o = {}) {
  const P = o.upright ? (x, y, z) => [x, 0.6 - z, y] : (x, y, z) => [x, y, z], Z = (s) => (o.upright ? [s[0], s[2], s[1]] : s);
  B(S, { size: Z([0.9, 0.05, 1.2]), pos: P(0, 0.025, 0), material: 'Wood', color: '#a0723f' });
  B(S, { size: Z([0.78, 0.02, 0.98]), pos: P(0, 0.06, 0.06), material: 'SmoothPlastic', color: o.paper ?? '#fafafa' });
  B(S, { size: Z([0.35, 0.08, 0.12]), pos: P(0, 0.08, -0.52), material: 'Metal', color: '#9a9a9a' });
}
