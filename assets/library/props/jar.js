// Glass jam jar with a gold lid (or open), base at the origin.
export const meta = {
  id: 'jar', tags: ['jar', 'jam', 'glass', 'food', 'kitchen', 'shelf', 'container'],
  description: 'Glass jar (1.6 tall) of red jam with a gold screw lid; open: true leaves the lid off.',
  options: { open: 'true = no lid', fill: 'jam colour (#b8202a), null = empty', size: 'scale factor (1)' },
};

export default function jar(S, o = {}) {
  const k = o.size ?? 1;
  if (o.fill !== null) S.part({ batch: true, shape: 'cylinder', size: [1.1 * k, 0.9 * k, 0.9 * k], pos: [0, 0.6 * k, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: o.fill ?? '#b8202a' });
  S.part({ shape: 'cylinder', size: [1.6 * k, 1.1 * k, 1.1 * k], pos: [0, 0.8 * k, 0], rot: [0, 0, 90], material: 'Glass', color: '#9ac8d8', transparency: 0.3 });
  if (!o.open) S.part({ batch: true, shape: 'cylinder', size: [0.3 * k, 1.2 * k, 1.2 * k], pos: [0, 1.75 * k, 0], rot: [0, 0, 90], material: 'Metal', color: '#c9a03a' });
}
