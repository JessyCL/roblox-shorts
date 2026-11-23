// "The Ropes": a fat rope knot (overhand bulb + two loose tails) - the knots tied on the giant's fingers, or any knot.
// Built at the local origin (bulb centre); the standing end leaves upward (+Y), tails hang down.
export const meta = {
  id: 'rope_knot', tags: ['knot', 'rope', 'tie', 'string', 'ropes', 'untie'],
  description: 'Chunky rope knot: a bulb of wrapped turns with the standing rope going up and two short tails hanging down (about 1.2 studs).',
  options: { color: "rope colour ('#cdb88e')", size: 'scale factor (1)', standing: 'length of rope going up (3)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function ropeKnot(S, o = {}) {
  const c = o.color ?? '#cdb88e', k = o.size ?? 1, m = 'Fabric';
  B(S, { shape: 'ball', size: [0.9 * k, 0.75 * k, 0.8 * k], pos: [0, 0, 0], material: m, color: c });
  for (let i = 0; i < 3; i++) B(S, { shape: 'cylinder', size: [0.26 * k, 0.95 * k, 0.95 * k], pos: [(i - 1) * 0.2 * k, 0.02 * k, 0], rot: [0, 0, 90 + (i - 1) * 18], material: m, color: i % 2 ? '#b8a276' : c });
  B(S, { shape: 'cylinder', size: [(o.standing ?? 3) * k, 0.24 * k, 0.24 * k], pos: [0, ((o.standing ?? 3) / 2 + 0.3) * k, 0], rot: [0, 0, 90], material: m, color: c });
  for (const s of [-1, 1]) B(S, { shape: 'cylinder', size: [0.8 * k, 0.22 * k, 0.22 * k], pos: [s * 0.22 * k, -0.62 * k, 0.1 * k], rot: [0, 0, 90 - s * 16], material: m, color: c });
}
