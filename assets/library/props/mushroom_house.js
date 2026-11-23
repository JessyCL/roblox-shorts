// Tiny-folk mushroom house on y = 0: cream stem with a door and window, a stepped spotted cap. size 1 = ~21 studs.
// From "The TINY War".
export const meta = {
  id: 'mushroom_house', tags: ['mushroom', 'house', 'tiny', 'fairy', 'gnome', 'village', 'cute', 'tiny war'],
  description: 'Mushroom house: cream stem with a wooden door and a window (lit: true glows), stepped cap (default red) with white spots; about 21 studs tall at size 1.',
  options: { size: 'scale (1)', cap: 'cap colour (#d8262c)', lit: 'true = glowing window' },
};
const B = (S, p) => S.part({ batch: true, ...p });
const V = (S, y, h, d, p) => B(S, { shape: 'cylinder', size: [h, d, d], pos: [0, y, 0], rot: [0, 0, 90], ...p });
export default function mushroomHouse(S, o = {}) {
  const k = o.size ?? 1, cap = o.cap ?? '#d8262c';
  V(S, 6 * k, 12 * k, 8 * k, { material: 'Concrete', color: '#f2e6cc' });
  V(S, 13 * k, 4 * k, 20 * k, { material: 'Fabric', color: cap });
  V(S, 16 * k, 3 * k, 14 * k, { material: 'Fabric', color: cap });
  B(S, { shape: 'ball', size: [8 * k, 8 * k, 8 * k], pos: [0, 17 * k, 0], material: 'Fabric', color: cap });
  for (const a of [0, 72, 144, 216, 288]) B(S, { shape: 'ball', size: [2.4 * k, 2.4 * k, 2.4 * k], pos: [8 * k * Math.cos(a * Math.PI / 180), 15.2 * k, 8 * k * Math.sin(a * Math.PI / 180)], material: 'SmoothPlastic', color: '#ffffff' });
  B(S, { size: [3 * k, 5.5 * k, 0.6], pos: [0, 2.75 * k, 4 * k], material: 'WoodPlanks', color: '#6a4428' });
  B(S, { size: [2 * k, 2 * k, 0.5], pos: [0, 8 * k, 4 * k], material: o.lit ? 'Neon' : 'Glass', color: o.lit ? '#ffc870' : '#6a8aaa' });
}
