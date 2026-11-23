// Hero's house exterior: a Tudor house with a climbable drainpipe at the front-left corner, flower boxes and two
// upper windows (left lit) for bedroom shots from outside. Local frame: front faces +Z (from "Everyone Has ONE Hand").
import tudorHouse from '../props/tudor_house.js';

export const meta = {
  id: 'house_exterior', tags: ['house', 'home', 'exterior', 'drainpipe', 'climb', 'window', 'tudor', 'medieval', 'village', 'night'],
  description: "The hero's family house from outside: 20-stud Tudor house with flower boxes, a metal drainpipe to climb at the front-left corner and two upper bedroom windows (left lit at night).",
  options: { pos: 'placement [x,z] or [x,y,z]', yaw: 'facing (deg)', drainpipe: 'false = none', seed: "variation seed ('house')", name: "tudor anchor prefix ('house')",
    tudor: 'extra tudor_house options (wall, roof, litL, litR, ...)', ground: 'false = no ground/look (inside another set)', look: "look when standalone ('day')" },
  anchors: { drainTop: 'top of the drainpipe (upper floor)', drainBottom: 'foot of the drainpipe', winL: 'upper-left window', winR: 'upper-right window',
    cam_front: 'wide of the facade', cam_drain: 'side angle on the drainpipe' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function houseExterior(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.ground !== false) { S.look(o.look ?? 'day'); S.ground({ material: 'Grass', color: '#5f9a45', size: 400 }); }
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => tudorHouse(S, { w: 20, d: 14, wall: '#f4ecdc', roof: '#7a3b2e', seed: o.seed ?? 'house', litL: true, litR: false, name: o.name ?? 'house', doorX: -1.5, flowers: true, ...o.tudor,
    extra: ({ w, y2, h2, fz2, fz1, y3 }) => {
      if (o.drainpipe !== false) {
        B(S, { shape: 'cylinder', size: [y3 + 0.5, 0.7, 0.7], pos: [-w / 2 - 0.2, (y3 + 0.5) / 2, fz1 + 0.6], rot: [0, 0, 90], material: 'Metal', color: '#6a6e74' });
        B(S, { size: [1.2, 0.5, 1.2], pos: [-w / 2 - 0.2, y3 + 0.4, fz1 + 0.6], material: 'Metal', color: '#6a6e74' });
      }
      A('drainTop', [-w / 2 - 0.2, y2 + h2 * 0.5, fz1 + 1.6]);
      A('drainBottom', [-w / 2 - 0.2, 0, fz1 + 1.6]);
      A('winR', [w * 0.25, y2 + h2 * 0.5, fz2 + 0.3]);
      A('winL', [-w * 0.25, y2 + h2 * 0.5, fz2 + 0.3]);
      A('cam_front', [2, 9, 40]); A('cam_front_at', [0, 9, 0]);
      A('cam_drain', [-20, 6, 20]); A('cam_drain_at', [-w / 2 - 0.2, 7, fz1 + 0.6]);
    } }));
  return { anchors: out };
}
