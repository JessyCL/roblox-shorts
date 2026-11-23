// Old mill on the hill (from "Everyone Has ONE Hand"): a big grassy hill with a stone windmill at the top (door at
// z -28, turning sails), the winding snowy road up to it (sunrise_road), dead trees, perched and circling crows,
// fences and a far village on the horizon behind (+Z). Spooky at dusk/night, warm at golden hour.
import windmill from '../props/windmill.js';
import deadTree from '../props/dead_tree.js';
import crow from '../props/crow.js';
import { hillY, roadY, roadX } from './sunrise_road.js';

export { hillY, roadY, roadX };
export const meta = {
  id: 'mill_exterior', tags: ['mill', 'windmill', 'hill', 'spooky', 'dusk', 'night', 'crows', 'dead trees', 'road', 'snow', 'lair', 'horror', 'countryside'],
  description: 'Spooky hilltop windmill: huge grassy hill, stone mill with turning sails and warm windows, snowy winding road up to the door, dead trees, crows perched and circling, far village behind. Use hillY/roadY/roadX exports to stand actors on the hill.',
  options: { look: "lighting look ('dusk')", road: 'false = no road/fences/far village', footprints: 'false = no footprint trail (group "footprints")', trees: 'false = no dead trees',
    crows: 'false = no crows', clouds: 'cloud cover (0.5); false = none' },
  anchors: { mill: 'mill tower centre', millDoor: 'in front of the mill door', millDoorEyes: 'door, eye height', roadLow: 'road low on the hill', roadMid: 'road mid-hill',
    farVillage: 'far village', cam_ews: 'extreme wide of the hill and mill', cam_door: 'low on the mill door', cam_road: 'down the road toward the mill' },
};

export default async function millExterior(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.look !== null) S.look(o.look ?? 'dusk');
  S.terrain({ size: [1400, 1400], center: [0, 0], res: 5, height: hillY, base: 'Grass', colors: { Grass: '#557a3a' } });
  const H = (x, z) => S.heightAt(x, z);
  if (o.road !== false) Object.assign(out, (await S.kit('sunrise_road', { look: null, terrain: false, footprints: o.footprints ?? true })).anchors);
  // the mill
  const my = H(0, -40), mz = -40;
  S.within([0, my, mz], 0, () => windmill(S));
  A('millDoor', [0, my, mz + 12]);
  A('millDoorEyes', [0, my + 6.5, mz + 9]);
  A('mill', [0, my + 18, mz]);
  // dead trees, crows
  if (o.trees !== false) for (const [x, z, h, s] of [[-26, -30, 18, 1], [24, -50, 16, 2], [-38, 10, 14, 3], [30, 20, 15, 4], [-20, 80, 12, 5], [22, 110, 13, 6]]) S.within([x, H(x, z), z], 0, () => deadTree(S, { height: h, seed: s }));
  if (o.crows !== false) {
    for (const [x, z, a] of [[-24, -27, 30], [22, -47, -40], [-35, 12, 80]]) S.within([x, H(x, z) + 13, z], a, () => crow(S));
    S.within([2, my + 45.5, mz], 200, () => crow(S)); S.within([-3, my + 44.5, mz + 2], 160, () => crow(S));
    S.group('crows', { pivot: [0, my + 50, mz], keys: { rot: [{ t: 0, v: [0, 0, 0] }, { t: 140, v: [0, 1400, 0] }] } }, () => {
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; S.within([Math.cos(a) * (16 + k), my + 46 + (k % 3) * 3, mz + Math.sin(a) * (16 + k)], (-a * 180) / Math.PI, () => crow(S)); }
    });
  }
  if (o.clouds !== false) S.clouds({ style: 'soft', cover: o.clouds ?? 0.5 });
  A('cam_ews', [22, 26, 100]); A('cam_ews_at', [0, 36, -40]);
  A('cam_door', [3, hillY(0, 2) + 5, 2]); A('cam_door_at', [0, hillY(0, -27) + 7, -28]);
  A('cam_road', [12, 5, 186]); A('cam_road_at', [0, 9, 140]);
  return { anchors: out };
}
