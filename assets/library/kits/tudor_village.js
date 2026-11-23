// Tudor village Main Street (from "Everyone Has ONE Hand"): a 280-stud cobblestone street (z 80 .. -200) lined with
// half-timbered houses on both sides (x = +/-27, plots every 24 studs), back rows for aerials, lamp posts, round trees,
// the hero's house (with drainpipe), a glove shop, a boarded-up jar factory, a church with bell tower on the square at
// the end of the street (z -140), a wedding arch, and a far hill with an old windmill on the horizon.
import tudorHouse from '../props/tudor_house.js';

export const meta = {
  id: 'tudor_village', tags: ['village', 'medieval', 'tudor', 'street', 'main street', 'town', 'houses', 'church', 'day', 'night', 'snow', 'aerial', 'europe'],
  description: 'Complete medieval Main Street: 280-stud cobblestone street lined with half-timbered houses, lamp posts and trees, hero house with drainpipe, glove shop, jar factory, church with bell tower on the end square, wedding arch, far windmill hill. Re-light with looks (day, night, golden, overcast) and snow particles.',
  options: { look: "lighting look ('day')", heroHouse: 'false | house_exterior options (plot R:10)', gloveShop: 'false | glove_shop options (plot L:34)', jarFactory: 'false | jar_factory options (plot L:-62)',
    church: 'false | church_bell_tower options (z -140)', wedding: 'false | wedding_square options (arch at z -112)', empty: "extra empty plots as 'side:z' keys, e.g. ['1:-14']",
    backRows: 'false = no second row of houses', lamps: 'false = no lamp posts', trees: 'false = no trees', backdrop: 'false = no far hill + windmill', clouds: 'cloud cover (0.4); false = none' },
  anchors: { spot_street: 'middle of Main Street', spot_square: 'church square', plot_R10: 'hero house door', cam_aerial: 'high aerial down the street', cam_street: 'elevated street view',
    cam_square: 'view of the square and church', cam_ews: 'extreme wide over the roofs' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export const SLOTS = [58, 34, 10, -14, -38, -62, -86];

export default async function tudorVillage(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.look !== null) S.look(o.look ?? 'day');
  S.ground({ material: 'Grass', color: '#5f9a45', size: 2400 });
  S.part({ size: [24, 0.2, 280], pos: [0, 0.1, -60], material: 'Cobblestone', color: '#a39c90' });
  for (const s of [-1, 1]) S.part({ size: [6, 0.25, 280], pos: [s * 15, 0.12, -60], material: 'Cobblestone', color: '#8f887c' });
  S.part({ size: [70, 0.22, 44], pos: [0, 0.11, -118], material: 'Cobblestone', color: '#a39c90' }); // church square
  const walls = ['#efe3c8', '#f2e8d4', '#e8d8b8', '#f4ecdc', '#e6dcc4'], roofs = ['#7a3b2e', '#5a4a3a', '#8a4a2a', '#6a3a34', '#4a4a52'];
  const special = { '1:10': o.heroHouse, '-1:34': o.gloveShop, '-1:-62': o.jarFactory };
  const skip = new Set([...Object.keys(special).filter((k) => special[k] !== false), ...(o.empty ?? [])]);
  SLOTS.forEach((z, i) => {
    for (const side of [-1, 1]) {
      const key = `${side}:${z}`;
      if (skip.has(key)) continue;
      S.within([side * 27, z], side < 0 ? 90 : -90, () => tudorHouse(S, { w: 18 + ((i * 3 + (side > 0 ? 1 : 0)) % 3) * 2, d: 14, wall: walls[(i + (side > 0 ? 2 : 0)) % 5], roof: roofs[(i * 2 + (side > 0 ? 1 : 0)) % 5], seed: key, flowers: (i + side) % 2 === 0, name: `h${side < 0 ? 'L' : 'R'}${i}` }));
    }
  });
  if (o.backRows !== false) for (let i = 0; i < 9; i++) for (const side of [-1, 1]) S.within([side * 54, 64 - i * 22], side < 0 ? 90 : -90, () => tudorHouse(S, { w: 16, d: 12, wall: walls[(i + 1) % 5], roof: roofs[i % 5], seed: `b${side}${i}`, door: false }));
  const opt = (x) => (typeof x === 'object' ? x : {});
  if (o.heroHouse !== false) await S.kit('house_exterior', { pos: [27, 10], yaw: -90, seed: 'lenny', name: 'lenny', ...opt(o.heroHouse), ground: false });
  if (o.gloveShop !== false) await S.kit('glove_shop', { pos: [-27, 34], yaw: 90, ...opt(o.gloveShop), ground: false });
  if (o.jarFactory !== false) await S.kit('jar_factory', { pos: [-31, -62], yaw: 90, ...opt(o.jarFactory), ground: false });
  if (o.church !== false) await S.kit('church_bell_tower', { pos: [0, 0, -140], ...opt(o.church), ground: false });
  if (o.wedding !== false) await S.kit('wedding_square', { pos: [0, 0, -112], square: false, ...opt(o.wedding), ground: false });
  if (o.lamps !== false) for (const z of [62, 46, 22, -2, -26, -50, -74, -98]) for (const s of [-1, 1]) S.lampPost({ pos: [s * 13.5, z], yaw: s < 0 ? 90 : -90, height: 9, light: { range: 30, brightness: 2.4 } });
  if (o.trees !== false) for (const [x, z] of [[-40, 76], [40, 70], [-42, -100], [42, -104], [-36, -20], [38, 46], [-80, 20], [80, -40], [-75, -90], [70, 90]]) S.tree({ pos: [x, z], style: 'round', height: 15 });
  if (o.backdrop !== false) { // the hill with the old mill, behind the village
    S.part({ shape: 'ball', size: [320, 320, 320], pos: [-150, -128, -330], material: 'Grass', color: '#5a8a40' });
    const mx = -150, my = 30, mz = -330;
    B(S, { shape: 'cylinder', size: [26, 14, 14], pos: [mx, my + 13, mz], rot: [0, 0, 90], material: 'Cobblestone', color: '#8a8478' });
    for (let k = 0; k < 6; k++) B(S, { shape: 'cylinder', size: [1.8, 15 - k * 2.4, 15 - k * 2.4], pos: [mx, my + 26.9 + k * 1.8, mz], rot: [0, 0, 90], material: 'WoodPlanks', color: '#5a3a28' });
    for (let k = 0; k < 4; k++) S.within([mx, my + 22, mz + 7.6], 0, () => B(S, { size: [3, 26, 0.4], pos: [0, 0, 0], rot: [0, 0, 20 + k * 90], material: 'WoodPlanks', color: '#6a4a2e' }));
    A('farMill', [mx, my + 18, mz]);
  }
  if (o.clouds !== false) S.clouds({ style: 'soft', cover: o.clouds ?? 0.4 });
  A('spot_street', [0, 0, 20]); A('spot_square', [0, 0, -110]); A('plot_R10', [17, 0, 10]);
  A('cam_aerial', [10, 85, 130]); A('cam_aerial_at', [0, 4, -40]);
  A('cam_street', [12, 9, 54]); A('cam_street_at', [-6, 5, 20]);
  A('cam_square', [2, 12, -64]); A('cam_square_at', [0, 8, -110]);
  A('cam_ews', [45, 62, 95]); A('cam_ews_at', [0, 6, -40]);
  return { anchors: out };
}
