// Big bronze church bell, mouth down, base (lip) at local y = 0. Non-instanced Foil parts (glints under the belfry lamp).
export const meta = {
  id: 'church_bell', tags: ['bell', 'church', 'bronze', 'gold', 'tower', 'medieval', 'metal'],
  description: 'Bronze church bell, mouth down, lip at the origin (about 4.7 x size studs tall). Hang it in a group and swing rotation.z.',
  options: { size: 'scale factor of the parts (1 = 4.4-stud lip)', color: 'metal colour (#c9952e)' },
};

export default function churchBell(S, o = {}) {
  const k = o.size ?? 1;
  const P = (p) => S.part({ ...p, material: 'Foil', color: o.color ?? '#c9952e' });
  P({ shape: 'cylinder', size: [2.6 * k, 3.4 * k, 3.4 * k], pos: [0, 1.6 * k, 0], rot: [0, 0, 90] });
  P({ shape: 'ball', size: [3.2 * k, 3.2 * k, 3.2 * k], pos: [0, 2.8 * k, 0] });
  P({ shape: 'cylinder', size: [0.5 * k, 4.4 * k, 4.4 * k], pos: [0, 0.3 * k, 0], rot: [0, 0, 90] });
  P({ size: [0.5 * k, 1 * k, 1.4 * k], pos: [0, 4.4 * k, 0] });
}
