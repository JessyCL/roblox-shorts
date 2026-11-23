// Castle gatehouse standing on y = 0, passage along Z (front = +Z): two square towers, an arch block over the
// passage, wooden gate doors (open or shut), a raised iron portcullis and a hanging banner. From "The TINY War".
import castleTower from './castle_tower.js';
export const meta = {
  id: 'gatehouse', tags: ['gate', 'gatehouse', 'castle', 'medieval', 'kingdom', 'portcullis', 'entrance', 'wall'],
  description: 'Castle gatehouse: two round towers flanking an arched stone block with a portcullis and wooden gate doors; passage 10 wide along Z. Joins castle_wall segments on its X sides.',
  options: { w: 'passage width (10)', h: 'wall height (16)', open: 'true = doors swung open (default true)', banner: 'banner colour (#c42a2a)', color: 'stone (#8c877d)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function gatehouse(S, o = {}) {
  const w = o.w ?? 10, h = o.h ?? 16, c = o.color ?? '#8c877d', d = 10;
  for (const s of [-1, 1]) S.within([s * (w / 2 + 5), 0, 0], 0, () => castleTower(S, { r: 6, h: h + 6, color: c, banner: o.banner ?? '#c42a2a' }));
  B(S, { size: [w + 2, h - w * 1.2, d], pos: [0, w * 1.2 + (h - w * 1.2) / 2, 0], material: 'Cobblestone', color: c });
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; B(S, { size: [2, 1.4, d + 0.4], pos: [Math.cos(a) * (w / 2), w * 1.2 - 1 + Math.sin(a) * 1.6, 0], rot: [0, 0, (a * 180) / Math.PI - 90], material: 'Cobblestone', color: '#77736a' }); }
  for (let i = 0; i < 6; i++) B(S, { size: [0.35, 3, 0.35], pos: [-w / 2 + 0.8 + i * (w - 1.6) / 5, w * 1.2 + 0.3, d / 2 - 0.6], material: 'Metal', color: '#3a3a3e' });
  B(S, { size: [w - 0.6, 0.35, 0.35], pos: [0, w * 1.2 - 1, d / 2 - 0.6], material: 'Metal', color: '#3a3a3e' });
  const open = o.open !== false;
  for (const s of [-1, 1]) B(S, { size: [w / 2 - 0.2, w * 1.2 - 0.4, 0.8], pos: open ? [s * (w / 2 - 0.4), (w * 1.2) / 2, d / 2 - w / 4] : [s * (w / 4), (w * 1.2) / 2, -d / 2 + 1], rot: open ? [0, s * 90, 0] : [0, 0, 0], material: 'WoodPlanks', color: '#5a3a22' });
  B(S, { size: [w + 1, 0.3, d], pos: [0, 0.15, 0], material: 'Cobblestone', color: '#7a746a' });
  B(S, { size: [4.4, 6, 0.2], pos: [0, h - 3.5, d / 2 + 0.15], material: 'Fabric', color: o.banner ?? '#c42a2a' });
  B(S, { shape: 'ball', size: [1.6, 1.6, 1.6], pos: [0, h - 3.2, d / 2 + 0.3], material: 'Metal', color: '#e0b030' });
  for (let i = 0; i < 4; i++) B(S, { size: [1.8, 2.2, 1], pos: [-w / 2 - 0.1 + i * ((w + 0.2) / 3), h + 1.1, d / 2 - 0.5], material: 'Cobblestone', color: '#77736a' });
}
