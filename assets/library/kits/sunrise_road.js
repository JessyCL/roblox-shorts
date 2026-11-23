// Sunrise road: a winding snowy track running down a big grassy hill (z -26 .. 260) toward a far village silhouette
// (church tower on the horizon at z ~430), rail fences along the verges, optional footprints in the snow.
// Shares its hill with mill_exterior (which builds this road on top of its terrain).
import { pyramid } from './church_bell_tower.js';

export const meta = {
  id: 'sunrise_road', tags: ['road', 'path', 'hill', 'snow', 'winter', 'sunrise', 'golden', 'walk', 'journey', 'countryside', 'village'],
  description: 'Winding snow-covered road down a huge grassy hill toward a far village silhouette with a church tower; rail fences, optional footprint trail. Golden-hour walk-home set (works with any look).',
  options: { look: "lighting look ('golden'; null = keep)", terrain: 'false = build on an existing terrain (mill_exterior does this)', footprints: 'true = footprint trail (group "footprints")',
    fences: 'false = no fences', farVillage: 'false = no far village', roadMaterial: "road material ('Snow')", roadColor: 'road colour (#e8eef4)' },
  anchors: { roadLow: 'road low on the hill (z 120)', roadMid: 'road mid-hill (z 60)', farVillage: 'far village', cam_walk: 'wide high shot down the road (sunrise walk)', cam_road: 'behind walkers on the road' },
};

// Hill height (also used by productions to stand actors on it) and the road surface on it.
export const hillY = (x, z) => 30 * Math.exp(-((x * x) / (2 * 55 * 55) + ((z + 40) * (z + 40)) / (2 * 60 * 60)));
export const roadY = (z) => hillY(Math.sin(z / 40) * 3, z) + 0.36;
export const roadX = (z) => Math.sin(z / 40) * 3;

const B = (S, p) => S.part({ batch: true, ...p });
export default async function sunriseRoad(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.look !== null) S.look(o.look ?? 'golden');
  if (o.terrain !== false) S.terrain({ size: [1400, 1400], center: [0, 0], res: 5, height: hillY, base: 'Grass', colors: { Grass: '#557a3a' } });
  const H = (x, z) => S.heightAt(x, z);
  for (let z = 260; z > -26; z -= 6) {
    const x = Math.sin(z / 40) * 3, y0 = H(x, z - 3), y1 = H(x, z + 3), pitch = (Math.atan2(y0 - y1, 6) * 180) / Math.PI; // +X rotation tips the +Z end down
    S.part({ batch: true, size: [11, 0.6, 6.6], pos: [x, (y0 + y1) / 2 + 0.05, z], rot: [pitch, 0, 0], material: o.roadMaterial ?? 'Snow', color: o.roadColor ?? '#e8eef4' });
  }
  if (o.footprints) S.group('footprints', {}, () => {
    for (let z = 240, k = 0; z > -18; z -= 5.5, k++) {
      const x = Math.sin(z / 40) * 3 + (k % 2 ? 1.4 : -1.4), y = H(x, z) + 0.4;
      B(S, { size: [2, 0.12, 3.4], pos: [x, y, z], material: 'Slate', color: '#3a3e4a' });
      for (let t = 0; t < 4; t++) B(S, { size: [0.5, 0.12, 0.8], pos: [x - 0.75 + t * 0.5, y, z - 2.2], material: 'Slate', color: '#3a3e4a' });
    }
  });
  A('roadLow', [0, H(0, 120), 120]);
  A('roadMid', [Math.sin(60 / 40) * 3, H(0, 60), 60]);
  if (o.fences !== false) {
    S.fence({ points: [[-8, 150], [-9, 120], [-8, 92], [-10, 66]], style: 'rail', height: 3.6, color: '#4a3a2a' });
    S.fence({ points: [[9, 140], [10, 110], [8, 84]], style: 'rail', height: 3.6, color: '#4a3a2a' });
  }
  if (o.farVillage !== false) {
    for (let i = 0; i < 9; i++) { const x = -70 + i * 17, z = 420 + (i % 3) * 14; B(S, { size: [12, 12, 10], pos: [x, 6, z], material: 'Concrete', color: '#e8dcc0' }); pyramid(S, x, 12, z, 12, 8, 'RoofShingles', '#7a3b2e'); }
    B(S, { size: [9, 40, 9], pos: [10, 20, 440], material: 'Limestone', color: '#d8cfbd' }); pyramid(S, 10, 40, 440, 10, 12, 'Slate', '#4a4e58');
    A('farVillage', [0, 12, 430]);
  }
  A('cam_walk', [30, 20, 190]); A('cam_walk_at', [0, 10, 95]);
  A('cam_road', [4, roadY(146) + 5, 146]); A('cam_road_at', [0, roadY(116) + 5.5, 116]);
  return { anchors: out };
}
