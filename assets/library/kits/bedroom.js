// Kid's bedroom (from "Everyone Has ONE Hand", Lenny's room): blue walls, single bed with a red blanket (hide under
// it), recolourable sky window (day/night/dawn), bedside table with a candle, rug and a KNIGHT poster.
// Local frame: open front toward +Z; several rooms can share one set with different `pos` + `name`.
import roomShell from '../props/room_shell.js';
import skyWindow from '../props/sky_window.js';
import bed from '../props/bed.js';
import candle from '../props/candle.js';

export const meta = {
  id: 'bedroom', tags: ['bedroom', 'interior', 'kid', 'bed', 'night', 'window', 'home', 'cozy', 'candle', 'hide'],
  description: "Kid's bedroom: blue walls, single bed (red blanket, space underneath to hide), sky window you recolour per shot, bedside candle, rug, KNIGHT poster. Night: use look night + tint the window.",
  options: { pos: 'room centre [x,y,z]', yaw: 'facing (deg)', name: "anchor prefix ('bedroom') -> <name>Sky, <name>Bed, <name>UnderBed", look: "look ('interior'; null = keep)",
    wall: 'wall colour', blanket: 'blanket colour', poster: "poster lines ([{ text: 'KNIGHT', size: 0.6 }, { text: '⚔' }])" },
  anchors: { '<name>Sky': 'window pane mesh (tint its material)', '<name>Bed': 'on the mattress, y 3.9 (sit there with seat: 0)', '<name>UnderBed': 'under the bed (lie clip, front: true)',
    cam_wide: 'wide of the room', cam_under: 'low on the space under the bed' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function bedroom(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p)), n = o.name ?? 'bedroom';
  if (o.look !== null) S.look(o.look ?? 'interior');
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    roomShell(S, { wall: o.wall ?? '#5a7ab0', floor: '#8a6a48', trim: '#3a2a1e' });
    S.light({ type: 'point', pos: [-2, 13, 4], color: '#ffd8a8', range: 40, brightness: 0.9 });
    out[`${n}Sky`] = S.within([-5, 10, -11.6], 0, () => skyWindow(S, { name: `${n}Sky` }));
    S.within([4, 0, -6.4], 0, () => bed(S, { length: 10, blanket: o.blanket ?? '#c4281c' }));
    A(`${n}Bed`, [4, 3.9, -6.4]);
    A(`${n}UnderBed`, [3, 0, -6.4]);
    B(S, { size: [3, 3, 3], pos: [-10.5, 1.5, -9.5], material: 'Wood', color: '#6a4426' });
    S.within([-10.5, 3, -9.5], 0, () => candle(S));
    B(S, { size: [10, 0.1, 6], pos: [-2, 0.05, 2], material: 'Carpet', color: '#c9a03a' });
    const poster = S.part({ size: [4, 5, 0.2], pos: [-9, 10, -11.4], material: 'SmoothPlastic', color: '#f4f0e6' });
    S.text({ part: poster, face: 'front', lines: o.poster ?? [{ text: 'KNIGHT', size: 0.6 }, { text: '⚔' }], color: '#3a2412', font: 'western' });
    A('cam_wide', [0, 8, 20]); A('cam_wide_at', [1.5, 4.5, -5]);
    A('cam_under', [3.5, 2.6, 9]); A('cam_under_at', [3, 1.2, -3.5]);
  });
  return { anchors: out };
}
