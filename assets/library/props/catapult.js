// Small wooden siege catapult on y = 0, throwing toward +Z: wheeled base, A-frame, cocked arm with a bucket holding a
// green pea (ammo: false = empty). ~9 studs long. From "The TINY War".
export const meta = {
  id: 'catapult', tags: ['catapult', 'siege', 'medieval', 'war', 'army', 'weapon', 'tiny war'],
  description: 'Wooden catapult: four-wheeled base, A-frame crossbar, cocked throwing arm and bucket (a green pea by default), throwing toward +Z.',
  options: { ammo: 'ammo colour (#5ab83a) or false' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function catapult(S, o = {}) {
  B(S, { size: [6, 1.2, 9], pos: [0, 1.6, 0], material: 'WoodPlanks', color: '#7a4a28' });
  for (const sx of [-3.4, 3.4]) for (const sz of [-3, 3]) B(S, { shape: 'cylinder', size: [0.8, 2.4, 2.4], pos: [sx, 1.2, sz], material: 'Wood', color: '#5a3420' });
  for (const sx of [-2.4, 2.4]) B(S, { size: [0.8, 6, 0.8], pos: [sx, 5, -1], material: 'Wood', color: '#6a4428' });
  B(S, { size: [5.6, 0.8, 0.8], pos: [0, 7.6, -1], material: 'Wood', color: '#6a4428' });
  B(S, { size: [0.9, 0.9, 11], pos: [0, 4.4, 1.5], rot: [-28, 0, 0], material: 'Wood', color: '#8a5a32' });
  B(S, { size: [2.6, 0.8, 2.6], pos: [0, 6.9, 6.2], rot: [-28, 0, 0], material: 'Wood', color: '#5a3420' });
  if (o.ammo !== false) B(S, { shape: 'ball', size: [2.2, 2.2, 2.2], pos: [0, 7.8, 6.1], material: 'SmoothPlastic', color: o.ammo ?? '#5ab83a' });
}
