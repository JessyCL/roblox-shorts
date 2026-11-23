// Tiny-folk house made from a silver sewing thimble on y = 0: ribbed metal body, dimpled top, door and window.
// size 1 = ~16 studs. From "The TINY War".
export const meta = {
  id: 'thimble_house', tags: ['thimble', 'house', 'tiny', 'metal', 'village', 'cute', 'tiny war', 'jail'],
  description: 'Silver thimble house: ribbed metal cylinder with a domed top, a wooden door and a window; jail: true swaps the door for iron bars.',
  options: { size: 'scale (1)', jail: 'true = iron-bar door (thimble jail)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
const V = (S, y, h, d, p) => B(S, { shape: 'cylinder', size: [h, d, d], pos: [0, y, 0], rot: [0, 0, 90], ...p });
export default function thimbleHouse(S, o = {}) {
  const k = o.size ?? 1;
  V(S, 7 * k, 14 * k, 13 * k, { material: 'Metal', color: '#b8bcc4' });
  V(S, 14.5 * k, 1.5 * k, 11 * k, { material: 'DiamondPlate', color: '#a8acb4' });
  for (let i = 0; i < 4; i++) V(S, (2 + i * 3.2) * k, 0.5, 13.3 * k, { material: 'Metal', color: '#9ca0a8' });
  if (o.jail) for (let i = 0; i < 4; i++) B(S, { size: [0.3, 5.5 * k, 0.3], pos: [(-1.2 + i * 0.8) * k, 2.75 * k, 6.6 * k], material: 'Metal', color: '#2a2a2e' });
  else B(S, { size: [3 * k, 5.5 * k, 0.6], pos: [0, 2.75 * k, 6.5 * k], material: 'WoodPlanks', color: '#6a4428' });
  B(S, { size: [2 * k, 2 * k, 0.5], pos: [3.5 * k, 9 * k, 6 * k], material: 'Glass', color: '#6a8aaa' });
}
