// Medieval market stall standing on y = 0 (front = +Z): four posts, striped cloth canopy, counter with crates of
// produce. From "The TINY War".
export const meta = {
  id: 'market_stall', tags: ['market', 'stall', 'medieval', 'village', 'kingdom', 'shop', 'square', 'canopy'],
  description: 'Medieval market stall: wooden posts, striped sloped canopy, counter with three crates of colourful produce.',
  options: { color: 'canopy stripe colour (#c42a2a)', color2: 'second stripe colour (#f4ead2)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function marketStall(S, o = {}) {
  const c1 = o.color ?? '#c42a2a', c2 = o.color2 ?? '#f4ead2';
  for (const x of [-4.5, 4.5]) for (const z of [-2.5, 2.5]) B(S, { size: [0.5, z > 0 ? 6 : 7.4, 0.5], pos: [x, z > 0 ? 3 : 3.7, z], material: 'Wood', color: '#6a4428' });
  for (let i = 0; i < 6; i++) B(S, { size: [1.6, 0.3, 6.6], pos: [-4 + i * 1.6, 6.9, 0], rot: [-12, 0, 0], material: 'Fabric', color: i % 2 ? c2 : c1 });
  B(S, { size: [9.4, 3, 2.2], pos: [0, 1.5, 1.8], material: 'WoodPlanks', color: '#8a5a32' });
  [['#d8262c', -2.8], ['#f0b020', 0], ['#5ab83a', 2.8]].forEach(([c, x]) => { B(S, { size: [2.4, 0.8, 1.8], pos: [x, 3.4, 1.8], material: 'Wood', color: '#a87a4a' }); for (let k = 0; k < 4; k++) B(S, { shape: 'ball', size: [0.8, 0.8, 0.8], pos: [x - 0.6 + (k % 2) * 1.2, 4, 1.4 + Math.floor(k / 2) * 0.8], material: 'SmoothPlastic', color: c }); });
}
