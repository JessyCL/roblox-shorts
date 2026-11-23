// Little kid's room (from "Everyone Has ONE Hand", Pip's room): pink walls, yellow-blanket bed under a window whose
// two shutters swing open (groups <name>ShutL / <name>ShutR: rotation.y -1.8 / +1.8 = open), toy blocks, and a giant
// hand that can reach in through the window (group <name>Hand, hidden by default - show + move it from shot.update).
import roomShell from '../props/room_shell.js';
import skyWindow from '../props/sky_window.js';
import bed from '../props/bed.js';

export const meta = {
  id: 'kids_room', tags: ['bedroom', 'kids', 'nursery', 'interior', 'window', 'shutters', 'night', 'monster', 'hand', 'girl', 'home'],
  description: "Little kid's pink bedroom: bed under a shuttered window (shutters animate open), toy blocks, and a giant grey hand ready to reach in through the window (horror beat).",
  options: { pos: 'room centre [x,y,z]', yaw: 'facing (deg)', name: "prefix ('kids') -> <name>Sky, <name>Bed, <name>ShutL/R, <name>Hand", hand: 'false = no giant hand',
    look: "look ('interior'; null = keep)", wall: 'wall colour', blanket: 'blanket colour' },
  anchors: { '<name>Sky': 'window pane mesh', '<name>Bed': 'on the bed, y 3.9 (sit there with seat: 0)', '<name>Window': 'window centre', cam_wide: 'wide of the room', cam_window: 'up at the window' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function kidsRoom(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p)), n = o.name ?? 'kids';
  if (o.look !== null) S.look(o.look ?? 'interior');
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    roomShell(S, { wall: o.wall ?? '#e8a0c0', floor: '#9a7a58', trim: '#6a3a4a' });
    S.light({ type: 'point', pos: [2, 9, 2], color: '#ffc8e0', range: 34, brightness: 1.1 });
    out[`${n}Sky`] = S.within([0, 10.5, -11.6], 0, () => skyWindow(S, { name: `${n}Sky`, w: 6, h: 6 }));
    S.group(`${n}ShutL`, { pivot: [-3, 10.5, -11] }, () => B(S, { size: [3, 6, 0.4], pos: [-1.5, 10.5, -10.9], material: 'WoodPlanks', color: '#f4f0e6' }));
    S.group(`${n}ShutR`, { pivot: [3, 10.5, -11] }, () => B(S, { size: [3, 6, 0.4], pos: [1.5, 10.5, -10.9], material: 'WoodPlanks', color: '#f4f0e6' }));
    S.within([0, 0, -6.4], 0, () => bed(S, { length: 8, blanket: o.blanket ?? '#ffd23a' }));
    A(`${n}Bed`, [-1, 3.9, -6.4]);
    A(`${n}Window`, [0, 10.5, -11.4]);
    for (const [x, c] of [[-7, '#7b2fbe'], [-5.5, '#2ec4c4']]) B(S, { size: [1.2, 1.2, 1.2], pos: [x, 0.6, 2], material: 'SmoothPlastic', color: c });
    A('cam_wide', [0, 8, 19]); A('cam_wide_at', [0, 6.5, -6]);
    A('cam_window', [2.5, 8, 1]); A('cam_window_at', [0, 9.2, -9]);
  });
  if (o.hand !== false) { // wrist at the pivot, two huge fingers toward +Z (in through the window)
    const p = S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => S.toWorld([0, 10, -22]));
    await S.prop('big_hand', { name: `${n}Hand`, pos: p, yaw: o.yaw ?? 0 });
    S.groups[`${n}Hand`].visible = false;
  }
  return { anchors: out };
}
