// Medieval stone cottage standing on y = 0 (front = +Z): stone walls with timber corner posts, a steep roof
// (clay tiles, slate or thatch), wooden door, shuttered windows (warm-lit at night), chimney. From "The TINY War".
export const meta = {
  id: 'stone_house', tags: ['house', 'cottage', 'medieval', 'stone', 'village', 'kingdom', 'thatch', 'peasant'],
  description: 'Medieval stone cottage (w x d, wall height h) with timber corner posts, steep roof (tiles | slate | thatch), wooden door, shuttered warm-lit windows and a chimney.',
  options: { w: 'width (14)', d: 'depth (12)', h: 'wall height (8)', wall: 'stone colour (#a39c8c)', roof: "'tiles' | 'slate' | 'thatch' or a colour", seed: 'variation' },
};
const B = (S, p) => S.part({ batch: true, ...p });
const ROOFS = { tiles: ['ClayRoofTiles', '#a8503a'], slate: ['Slate', '#4a4e5a'], thatch: ['Fabric', '#c8a85a'] };
export default function stoneHouse(S, o = {}) {
  const w = o.w ?? 14, d = o.d ?? 12, h = o.h ?? 8, wall = o.wall ?? '#a39c8c';
  const [rm, rc] = ROOFS[o.roof] ?? (o.roof ? ['ClayRoofTiles', o.roof] : ROOFS.tiles);
  B(S, { size: [w + 0.8, 1, d + 0.8], pos: [0, 0.5, 0], material: 'Cobblestone', color: '#7a746a' });
  B(S, { size: [w, h, d], pos: [0, 1 + h / 2, 0], material: 'Cobblestone', color: wall });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(S, { size: [0.9, h, 0.9], pos: [sx * (w / 2), 1 + h / 2, sz * (d / 2)], material: 'Wood', color: '#4a3020' });
  B(S, { size: [w + 0.4, 0.8, d + 0.4], pos: [0, 1 + h, 0], material: 'Wood', color: '#4a3020' });
  const rh = w * 0.55, hw = w / 2 + 1;
  for (const s of [-1, 1]) B(S, { shape: 'wedge', size: [d + 2, rh, hw], pos: [(s * hw) / 2, 1.4 + h + rh / 2, 0], rot: [0, s < 0 ? 90 : -90, 0], material: rm, color: rc });
  for (const e of [-1, 1]) for (const s of [-1, 1]) B(S, { shape: 'wedge', size: [0.6, rh - 0.4, w / 2], pos: [(s * w) / 4, 1.4 + h + (rh - 0.4) / 2, e * (d / 2 - 0.4)], rot: [0, s < 0 ? 90 : -90, 0], material: 'Cobblestone', color: wall }); // gable ends
  B(S, { size: [3, 5.5, 0.4], pos: [-w * 0.2, 3.75, d / 2 + 0.1], material: 'WoodPlanks', color: '#5a3a22' });
  for (const x of [w * 0.22]) {
    B(S, { size: [2.6, 2.6, 0.3], pos: [x, 4.8, d / 2 + 0.06], material: 'Neon', color: '#ffb84a' });
    for (const s of [-1, 1]) B(S, { size: [1.4, 2.8, 0.3], pos: [x + s * 2.1, 4.8, d / 2 + 0.2], material: 'WoodPlanks', color: '#3a5a3a' });
  }
  B(S, { size: [2, rh + 2, 2], pos: [w * 0.28, 1 + h + rh / 2 + 1.5, -d * 0.2], material: 'Cobblestone', color: '#7a746a' });
}
