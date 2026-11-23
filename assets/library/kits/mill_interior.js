// Inside the old mill: a candle-lit stone hall (72 x 90) full of stolen things - a pile of 61 boots, a heap of church
// bells, hay carts, a farm-tools rack, millstone + gear, crates, candles, and a high shelf with a lantern and jars
// where a small character can sit. Monster's lair / hoard (from "Everyone Has ONE Hand").
import churchBell from '../props/church_bell.js';
import hayCart from '../props/hay_cart.js';
import toolsRack from '../props/tools_rack.js';
import bootPile from '../props/boot_pile.js';
import candle from '../props/candle.js';
import lantern from '../props/lantern.js';

export const meta = {
  id: 'mill_interior', tags: ['mill', 'interior', 'lair', 'hoard', 'stolen', 'candle', 'night', 'barn', 'boots', 'bells', 'spooky', 'medieval', 'warehouse'],
  description: "Candle-lit stone mill hall: pile of 61 boots in the centre, heap of bronze bells, hay carts, tools rack, millstone and gear, crates, moonlit slit window, high shelf with a lantern and jars (sit a kid there at spot shelfSeat). The giant's hoard.",
  options: { look: "lighting look ({ preset: 'candle', exposure: 1.05 })", boots: 'false = no boot pile', bells: 'false = no bells', carts: 'false = no carts', tools: 'false = no tools rack' },
  anchors: { bells: 'bell heap', carts: 'carts', tools: 'tools rack', boots: 'boot pile', shelf: 'high shelf', shelfSeat: 'sit point on the shelf (sit clip seat: 0)', lantern: 'shelf lantern',
    back: 'dark back of the hall', cam_wide: 'wide from the entrance', cam_shelf: 'low up at the shelf', cam_back: 'looking into the dark back' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function millInterior(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.look !== null) S.look(o.look ?? { preset: 'candle', exposure: 1.05 });
  for (const [size, pos] of [[[72, 44, 2], [0, 22, -46]], [[2, 44, 90], [-36, 22, -1]], [[2, 44, 90], [36, 22, -1]], [[72, 44, 2], [0, 22, 42]]]) S.part({ size, pos, material: 'Cobblestone', color: '#6a625a' });
  S.part({ size: [72, 1, 90], pos: [0, -0.5, -1], material: 'WoodPlanks', color: '#6b4a30' });
  for (const x of [-34, -12, 12, 34]) B(S, { size: [1.6, 44, 1.6], pos: [x, 22, -44.5], material: 'Wood', color: '#3a2618' });
  for (const z of [-40, -20, 0, 20]) B(S, { size: [72, 1.6, 1.6], pos: [0, 30, z], material: 'Wood', color: '#3a2618' });
  B(S, { size: [3, 10, 0.4], pos: [10, 36, -44.8], material: 'SmoothPlastic', color: '#2a3a6a', glow: 1.6, emissive: '#4a6ab8' }); // moonlit slit
  // millstone + gear (right back)
  B(S, { shape: 'cylinder', size: [3, 14, 14], pos: [22, 1.5, -32], rot: [0, 0, 90], material: 'Granite', color: '#8a8680' });
  B(S, { shape: 'cylinder', size: [2, 16, 16], pos: [26, 12, -40], rot: [0, 90, 0], material: 'Wood', color: '#5a3a22' });
  for (let k = 0; k < 12; k++) S.within([26, 12, -38.6], 0, () => B(S, { size: [1.4, 2, 1.4], pos: [Math.cos((k / 12) * Math.PI * 2) * 8.6, Math.sin((k / 12) * Math.PI * 2) * 8.6, 0], rot: [0, 0, (k / 12) * 360], material: 'Wood', color: '#4a3020' }));
  // bells pile (left)
  if (o.bells !== false) {
    const bells = [[-18, 0, -14, 1.1], [-14, 0, -18, 0.9], [-22, 0, -20, 1.3], [-16, 3.5, -16, 0.7], [-11, 0, -13, 0.6], [-20, 0, -10, 0.75], [-19, 4.4, -19, 0.6], [-25, 0, -14, 0.8]];
    for (const [x, y, z, k] of bells) S.within([x, y, z], 0, () => churchBell(S, { size: k, color: ['#c9952e', '#b8862a', '#d8a83a'][Math.round(k * 10) % 3] }));
    A('bells', [-17, 2.5, -15]);
  }
  // carts (right)
  if (o.carts !== false) {
    S.within([19, 0, -26], -30, () => hayCart(S)); S.within([27, 0, -8], 10, () => hayCart(S, { hay: false })); S.within([20, 0, 10], 80, () => hayCart(S));
    A('carts', [22, 3, -14]);
  }
  // tools rack on the left wall
  if (o.tools !== false) { S.within([-34.6, 0, 4], 0, () => toolsRack(S)); A('tools', [-33, 6, 4]); }
  // 61 left boots, centre
  if (o.boots !== false) { S.within([-12, 0, 4], 0, () => bootPile(S)); A('boots', [-12, 3, 4]); }
  // crates, barrels, candles
  for (const [x, z, s] of [[-28, -36, 4], [-23, -38, 3], [28, 10, 4], [30, 16, 3.2], [-6, -36, 3.5], [8, -38, 4]]) B(S, { size: [s, s, s], pos: [x, s / 2, z], material: 'WoodPlanks', color: '#8a6440' });
  for (const [x, y, z] of [[-28, 4, -36], [28, 4, 10], [-30, 0, 22], [8, 0, -12]]) S.within([x, y, z], 0, () => candle(S));
  for (const [x, z] of [[-8, 8], [9, 6], [-24, 2], [22, -3]]) S.within([x, 0, z], 0, () => candle(S));
  // top shelf with lantern (left wall) where a kid can sit, next to some (open!) jars
  B(S, { size: [5, 0.7, 18], pos: [-32.8, 13, -14], material: 'WoodPlanks', color: '#7a5434' });
  for (const z of [-21, -7]) B(S, { size: [3.8, 0.6, 0.6], pos: [-33.5, 11.8, z], rot: [0, 0, -40], material: 'Wood', color: '#4a3020' });
  S.within([-32.6, 13.35, -10.5], 0, () => lantern(S));
  for (const [z, open] of [[-20, true], [-18.6, true], [-17.2, false]]) {
    B(S, { shape: 'cylinder', size: [1.6, 1.1, 1.1], pos: [-32.6, 14.15, z], rot: [0, 0, 90], material: 'Glass', color: '#9ac8d8', transparency: 0.3 });
    if (!open) B(S, { shape: 'cylinder', size: [0.3, 1.2, 1.2], pos: [-32.6, 15.1, z], rot: [0, 0, 90], material: 'Metal', color: '#c9a03a' });
  }
  A('shelf', [-32, 14, -14]);
  A('shelfSeat', [-32.2, 13.35, -14]);
  A('lantern', [-32.6, 14.4, -10.5]);
  A('back', [0, 6, -30]);
  S.light({ type: 'point', pos: [0, 16, 10], color: '#ff9a50', range: 70, brightness: 1.6 });
  S.light({ type: 'point', pos: [17, 8, -10], color: '#ffa860', range: 30, brightness: 2.6 });
  S.light({ type: 'point', pos: [-26, 8, 6], color: '#ffa860', range: 26, brightness: 1.8 });
  A('cam_wide', [6, 10, 36]); A('cam_wide_at', [-2, 4, -12]);
  A('cam_shelf', [-15, 3, 1]); A('cam_shelf_at', [-27, 9, -11]);
  A('cam_back', [2.6, 5.2, 4]); A('cam_back_at', [0, 3.8, -28]);
  return { anchors: out };
}
