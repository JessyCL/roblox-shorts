// Wedding square: flower arch and a red aisle carpet (group `wedding`, toggle it per shot) on a cobblestone square.
// Local frame: arch at the origin, aisle running toward +Z (guests/crowd stand along it) (from "Everyone Has ONE Hand").
import weddingArch from '../props/wedding_arch.js';

export const meta = {
  id: 'wedding_square', tags: ['wedding', 'square', 'arch', 'aisle', 'ceremony', 'celebration', 'village', 'party', 'love'],
  description: 'Outdoor wedding: pink/white flower arch and a 34-stud red aisle carpet on a 70 x 44 cobblestone square. Couple stands at spot_altar, crowd along the aisle.',
  options: { pos: 'arch centre [x,y,z] (or [x,z])', yaw: 'facing (deg)', square: 'false = no cobblestone square', aisle: 'aisle colour (#b81e2a)',
    ground: 'false = no ground/look (inside another set)', look: "look when standalone ('day')" },
  anchors: { altar: 'where the couple stands', spot_crowd: 'middle of the aisle (crowd area)', cam_aisle: 'high view down the aisle to the arch', cam_couple: 'medium on the couple' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function weddingSquare(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.ground !== false) { S.look(o.look ?? 'day'); S.ground({ material: 'Grass', color: '#5f9a45', size: 600 }); }
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    if (o.square ?? o.ground !== false) S.part({ size: [70, 0.22, 44], pos: [0, 0.11, -6], material: 'Cobblestone', color: '#a39c90' });
    S.group('wedding', {}, () => {
      weddingArch(S);
      B(S, { size: [4, 0.12, 34], pos: [0, 0.3, 18], material: 'Fabric', color: o.aisle ?? '#b81e2a' });
    });
    A('altar', [0, 0, 2]);
    A('spot_crowd', [0, 0, 18]);
    A('cam_aisle', [2, 12, 48]); A('cam_aisle_at', [0, 4, 8]);
    A('cam_couple', [3, 5, 14]); A('cam_couple_at', [0, 3.5, 2]);
  });
  return { anchors: out };
}
