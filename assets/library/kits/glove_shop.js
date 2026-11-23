// Glove shop: Tudor shopfront with a lit display window, red awning, a stall of single gloves, a GLOVES sign board and a
// hanging glove. Local frame: shop front faces +Z, centred on x = 0 (from "Everyone Has ONE Hand").
import tudorHouse, { BEAM } from '../props/tudor_house.js';
import glove from '../props/glove.js';

export const meta = {
  id: 'glove_shop', tags: ['shop', 'store', 'gloves', 'market', 'stall', 'medieval', 'village', 'tudor', 'storefront'],
  description: 'Medieval glove shop: half-timbered house with a glowing display window, red awning, a market stall of six colourful single gloves and a "GLOVES / SOLD ONE AT A TIME" board.',
  options: { pos: 'placement [x,z] or [x,y,z]', yaw: 'facing (deg, 0 = front toward +Z)', sign: 'board lines (strings or { text, size })', colors: 'six glove colours',
    seed: "house variation seed ('gloves')", name: "house anchor prefix ('shop')", ground: 'false = no ground/look (when placed inside another set)', look: "look when standalone ('day')" },
  anchors: { shopStall: 'top of the glove stall', shopFront: 'street spot in front of the stall', cam_front: 'wide shot of the shopfront', cam_stall: 'close on the stall' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function gloveShop(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.ground !== false) { S.look(o.look ?? 'day'); S.ground({ material: 'Cobblestone', color: '#a39c90', size: 400 }); }
  const lines = (o.sign ?? [{ text: 'GLOVES' }, { text: 'SOLD ONE AT A TIME', size: 0.45 }]).map((l) => (typeof l === 'string' ? { text: l } : l));
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => tudorHouse(S, { w: 20, d: 14, wall: '#f2e2c0', roof: '#4a4a52', seed: o.seed ?? 'gloves', shopfront: true, doorX: -6, name: o.name ?? 'shop',
    extra: ({ w, h1, fz1, y2 }) => {
      B(S, { size: [9, 5, 0.4], pos: [3, 4.2, fz1 + 0.1], material: 'SmoothPlastic', color: '#5a4628', glow: 1.4, emissive: '#ffd890' });
      B(S, { size: [9.8, 0.6, 0.6], pos: [3, 7, fz1 + 0.2], material: 'Wood', color: BEAM });
      B(S, { shape: 'wedge', size: [11, 1.4, 3], pos: [3, 8.2, fz1 + 1.5], rot: [0, 180, 0], material: 'Fabric', color: '#c4281c' });
      B(S, { size: [10, 2.6, 3], pos: [3, 1.3, fz1 + 2.2], material: 'WoodPlanks', color: '#8a5a32' }); // stall table
      const cols = o.colors ?? ['#c4281c', '#2f6fd6', '#f2c230', '#3a9a4a', '#7b2fbe', '#ff7a1c'];
      cols.forEach((c, k) => S.within([-0.8 + k * 1.55, 3.5, fz1 + 2.2], 0, () => glove(S, { color: c })));
      const board = S.part({ size: [10, 2.6, 0.5], pos: [3, y2 + 3.6, fz1 + 2.3], material: 'WoodPlanks', color: '#e8d6aa' });
      S.text({ part: board, face: 'front', lines, color: '#3a2412', font: 'western' });
      B(S, { size: [0.4, 0.4, 3], pos: [-w / 2 + 1.5, y2 + 1.4, fz1 + 1.5], material: 'Metal', color: '#2a2a2e' });
      S.within([-w / 2 + 1.5, y2 - 0.6, fz1 + 2.6], 0, () => glove(S, { color: '#c4281c' }));
      A('shopStall', [3, 3.5, fz1 + 2.2]);
      A('shopFront', [3, 0, fz1 + 5]);
      A('cam_front', [4, 6, 34]); A('cam_front_at', [1, 6, 6]);
      A('cam_stall', [9, 5, 19]); A('cam_stall_at', [3, 3.5, fz1 + 2.2]);
    } }));
  return { anchors: out };
}
