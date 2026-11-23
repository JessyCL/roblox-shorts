// Cozy living room (from "Everyone Has ONE Hand"): warm walls, brick fireplace with a glowing fire, grandma's rocking
// chair, a side table with a birthday cake and a number sign, dining table + chair, sky window, picture frames.
import roomShell from '../props/room_shell.js';
import skyWindow from '../props/sky_window.js';
import rockingChair from '../props/rocking_chair.js';

export const meta = {
  id: 'living_room', tags: ['living room', 'interior', 'home', 'fireplace', 'grandma', 'cozy', 'cake', 'birthday', 'family', 'warm'],
  description: 'Warm family living room: brick fireplace with a live glow, rocking chair (grandma knits here), side table with a birthday cake and a "94" sign, dining table and chair, sky window, frames.',
  options: { pos: 'room centre [x,y,z]', yaw: 'facing (deg)', name: "prefix ('living') -> <name>Sky, <name>Cake, <name>Rocker, <name>Table, <name>Fire", cake: "cake sign text ('94'); false = no cake",
    look: "look ('interior'; null = keep)", wall: 'wall colour' },
  anchors: { '<name>Sky': 'window pane mesh', '<name>Rocker': 'rocking chair (sit clip seat: 2.65, yaw 30)', '<name>Cake': 'cake', '<name>Table': 'dining table top', '<name>Fire': 'fireplace',
    cam_wide: 'wide of the room', cam_cake: 'close on the cake' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function livingRoom(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p)), n = o.name ?? 'living';
  if (o.look !== null) S.look(o.look ?? 'interior');
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    roomShell(S, { wall: o.wall ?? '#c9a46a', floor: '#7a5a3a', trim: '#4a3020' });
    S.light({ type: 'point', pos: [2, 13, 4], color: '#ffe0b8', range: 40, brightness: 0.8 });
    out[`${n}Sky`] = S.within([10, 10, -11.6], 0, () => skyWindow(S, { name: `${n}Sky` }));
    B(S, { size: [9, 9, 2.4], pos: [-4, 4.5, -10.6], material: 'Brick', color: '#9a4a36' });
    B(S, { size: [5, 4, 1], pos: [-4, 2.6, -9.6], material: 'SmoothPlastic', color: '#1a1210' });
    S.part({ size: [3, 1.6, 0.6], pos: [-4, 1.6, -9.2], material: 'Neon', color: '#ff8a2a' });
    S.light({ type: 'point', pos: [-4, 3, -7], color: '#ff9a40', range: 30, brightness: 2.5 });
    B(S, { size: [11, 0.8, 3], pos: [-4, 9.4, -10.2], material: 'Wood', color: '#4a3020' });
    A(`${n}Fire`, [-4, 2, -9]);
    S.within([-8, 0, -4], 30, () => rockingChair(S)); // rocking chair (grandma)
    A(`${n}Rocker`, [-8, 0, -4]);
    B(S, { size: [3, 3.2, 3], pos: [-10.5, 1.6, -8.5], material: 'Wood', color: '#6a4426' });
    if (o.cake !== false) {
      S.food('cake', { pos: [-10.5, 3.2, -8.5], scale: 0.9 });
      S.text({ text: o.cake ?? '94', pos: [-10.5, 7.1, -7.0], size: [2.6, 1.5], color: '#c4281c', bg: '#ffffff', font: 'gotham' });
      B(S, { size: [0.15, 1.6, 0.15], pos: [-10.5, 5.6, -7.1], material: 'Wood', color: '#6a4426' });
      A(`${n}Cake`, [-10.5, 5.2, -8]);
    }
    // dining table + chair
    B(S, { size: [8, 0.6, 5], pos: [7, 3.6, -5], material: 'Wood', color: '#7a5030' });
    for (const [dx, dz] of [[-3.5, -2], [3.5, -2], [-3.5, 2], [3.5, 2]]) B(S, { size: [0.5, 3.4, 0.5], pos: [7 + dx, 1.7, -5 + dz], material: 'Wood', color: '#5a3a22' });
    B(S, { size: [3, 0.5, 3], pos: [3, 2.2, -1.6], material: 'Wood', color: '#6a4426' });
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) B(S, { size: [0.4, 2, 0.4], pos: [3 + dx, 1, -1.6 + dz], material: 'Wood', color: '#5a3a22' });
    B(S, { size: [3, 3.6, 0.4], pos: [3, 4.2, -0.2], material: 'Wood', color: '#6a4426' });
    B(S, { size: [1.8, 1, 1.4], pos: [9, 4.4, -5.4], material: 'Fabric', color: '#c4281c' }); // spool basket
    for (const [x, c] of [[4, '#c9a03a'], [12, '#6a8aa8']]) S.part({ size: [3.4, 4, 0.2], pos: [x, 11, -11.4], material: 'SmoothPlastic', color: c });
    A(`${n}Table`, [7, 3.9, -5]);
    A('cam_wide', [2, 7, 16]); A('cam_wide_at', [-5, 3.6, -3]);
    A('cam_cake', [-11.6, 6.4, 0]); A('cam_cake_at', [-10.5, 6, -7.5]);
  });
  return { anchors: out };
}
