// Standing kingdom banner on y = 0: wooden pole with a gold finial and a long hanging cloth with an emblem stripe.
// From "The TINY War".
export const meta = {
  id: 'banner', tags: ['banner', 'flag', 'medieval', 'kingdom', 'castle', 'heraldry', 'pole'],
  description: 'Tall standing banner: wooden pole, gold finial, crossbar and a long hanging cloth (colour + emblem stripe), facing +Z.',
  options: { h: 'pole height (14)', color: 'cloth colour (#c42a2a)', emblem: 'stripe colour (#e0b030)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function banner(S, o = {}) {
  const h = o.h ?? 14;
  B(S, { size: [0.5, h, 0.5], pos: [0, h / 2, 0], material: 'Wood', color: '#5a3a22' });
  B(S, { shape: 'ball', size: [0.9, 0.9, 0.9], pos: [0, h + 0.4, 0], material: 'Metal', color: '#e0b030' });
  B(S, { size: [4, 0.35, 0.35], pos: [0, h - 0.6, 0.3], material: 'Wood', color: '#5a3a22' });
  B(S, { size: [3.6, h * 0.5, 0.15], pos: [0, h - 0.8 - h * 0.25, 0.45], material: 'Fabric', color: o.color ?? '#c42a2a' });
  B(S, { size: [0.9, h * 0.5, 0.17], pos: [0, h - 0.8 - h * 0.25, 0.47], material: 'Fabric', color: o.emblem ?? '#e0b030' });
}
