// Castle keep standing on y = 0 (front = +Z): square stone core with a battlement crown, four corner towers with
// conical roofs, a tall central spire, arched windows (warm-lit), a big wooden door with steps and banners.
// From "The TINY War" (tiny kingdom castle; scaled 25x for the giant kingdom castle).
import castleTower from './castle_tower.js';
export const meta = {
  id: 'castle_keep', tags: ['castle', 'keep', 'medieval', 'kingdom', 'palace', 'fortress', 'towers', 'king'],
  description: 'Medieval castle keep: square stone core (w x h) with battlements, four round corner towers with slate cone roofs and banners, a central spire, lit arched windows, a wooden door with steps and hanging banners.',
  options: { w: 'core width (26)', h: 'core height (30)', color: 'stone (#8c877d)', roof: 'roof colour (#3a3f52)', banner: 'banner colour (#c42a2a)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function castleKeep(S, o = {}) {
  const w = o.w ?? 26, h = o.h ?? 30, c = o.color ?? '#8c877d', roof = o.roof ?? '#3a3f52', ban = o.banner ?? '#c42a2a';
  B(S, { size: [w + 2, 3, w + 2], pos: [0, 1.5, 0], material: 'Cobblestone', color: '#77736a' });
  B(S, { size: [w, h, w], pos: [0, h / 2, 0], material: 'Cobblestone', color: c });
  B(S, { size: [w + 1.4, 1.6, w + 1.4], pos: [0, h + 0.8, 0], material: 'Cobblestone', color: '#7e7a71' });
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const x = -w / 2 + (i + 0.5) * (w / 7); if (i % 2) continue; B(S, { size: [w / 7, 2.2, 1], pos: [x, h + 2.7, s * (w / 2 + 0.2)], material: 'Cobblestone', color: '#7e7a71' }); B(S, { size: [1, 2.2, w / 7], pos: [s * (w / 2 + 0.2), h + 2.7, x], material: 'Cobblestone', color: '#7e7a71' }); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.within([sx * w / 2, 0, sz * w / 2], 0, () => castleTower(S, { r: w * 0.2, h: h + 8, color: c, roof, banner: ban }));
  S.within([0, h + 1.6, 0], 0, () => castleTower(S, { r: w * 0.24, h: 12, color: c, roof, banner: ban }));
  for (const [x, y] of [[-w * 0.25, h * 0.45], [w * 0.25, h * 0.45], [-w * 0.25, h * 0.75], [0, h * 0.75], [w * 0.25, h * 0.75]]) {
    B(S, { size: [2.4, 4, 0.3], pos: [x, y, w / 2 + 0.05], material: 'Neon', color: '#ffb84a' });
    B(S, { shape: 'cylinder', size: [0.3, 2.4, 2.4], pos: [x, y + 2, w / 2 + 0.05], rot: [0, 90, 0], material: 'Neon', color: '#ffb84a' });
    B(S, { size: [3.2, 0.5, 0.8], pos: [x, y - 2.2, w / 2 + 0.3], material: 'Cobblestone', color: '#6e6a62' });
  }
  B(S, { size: [6, 9, 0.6], pos: [0, 5.5, w / 2 + 0.2], material: 'WoodPlanks', color: '#5a3a22' });
  B(S, { shape: 'cylinder', size: [0.6, 6, 6], pos: [0, 10, w / 2 + 0.2], rot: [0, 90, 0], material: 'WoodPlanks', color: '#5a3a22' });
  for (let i = 0; i < 3; i++) B(S, { size: [10 - i * 1.4, 1, 2], pos: [0, 0.5 + i, w / 2 + 6 - i * 2], material: 'Cobblestone', color: '#8a857b' });
  for (const s of [-1, 1]) { B(S, { size: [3.4, 10, 0.2], pos: [s * w * 0.3, h * 0.6, w / 2 + 0.25], material: 'Fabric', color: ban }); B(S, { shape: 'ball', size: [1.4, 1.4, 1.4], pos: [s * w * 0.3, h * 0.66, w / 2 + 0.4], material: 'Metal', color: '#e0b030' }); }
}
