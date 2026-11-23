// Blocky pine on y = 0: trunk plus 6 shrinking tiers of 45-degree-turned square needle slabs and a tip
// (about 30 studs tall at size 1). From "The TINY War".
export const meta = {
  id: 'pine_tree', tags: ['tree', 'pine', 'fir', 'conifer', 'forest', 'mountain', 'nature', 'winter'],
  description: 'Blocky pine/fir: brown trunk and six shrinking tiers of alternately rotated dark-green square slabs with a tip (about 30 studs at size 1); snow: true dusts the tiers white.',
  options: { size: 'scale factor (1)', snow: 'true = snow caps', color: 'needle colour (#2e5a2a)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function pineTree(S, o = {}) {
  const k = o.size ?? 1, c = o.color ?? '#2e5a2a';
  B(S, { size: [1.8 * k, 8 * k, 1.8 * k], pos: [0, 4 * k, 0], material: 'Wood', color: '#4a3220' });
  for (let i = 0; i < 6; i++) {
    const s = (13 - i * 2) * k, y = (6 + i * 3.6) * k;
    B(S, { size: [s, 2.6 * k, s], pos: [0, y, 0], rot: [0, i % 2 ? 45 : 0, 0], material: 'Grass', color: i % 2 ? c : '#36662e' });
    if (o.snow) B(S, { size: [s * 0.7, 0.5 * k, s * 0.7], pos: [0, y + 1.5 * k, 0], rot: [0, i % 2 ? 45 : 0, 0], material: 'Snow', color: '#f0f3f7' });
  }
  B(S, { size: [2 * k, 4 * k, 2 * k], pos: [0, 29 * k, 0], rot: [0, 45, 0], material: 'Grass', color: c });
}
