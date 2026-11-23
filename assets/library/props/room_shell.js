// Open-front room box: plank floor (26 x 22), back wall at z -12, side walls at x +/-13 (18 tall), wooden skirting and
// cornice. The front (+Z) is open for the camera. Centred on x = 0; floor top at y = 0.
export const meta = {
  id: 'room_shell', tags: ['room', 'interior', 'walls', 'floor', 'house', 'shell', 'stage'],
  description: 'Three-walled interior shell (26 x 22 floor, 18-stud walls, open front for the camera) with wooden skirting and cornice - the base of every indoor kit.',
  options: { wall: 'wall colour', floor: 'floor colour', trim: 'trim colour' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function roomShell(S, o = {}) {
  const wall = o.wall ?? '#c9a46a', floor = o.floor ?? '#7a5a3a', trim = o.trim ?? '#4a3020';
  B(S, { size: [26, 1, 22], pos: [0, -0.5, -1], material: 'WoodPlanks', color: floor });
  B(S, { size: [26, 18, 1], pos: [0, 9, -12], material: 'SmoothPlastic', color: wall });
  for (const s of [-1, 1]) B(S, { size: [1, 18, 22], pos: [s * 13, 9, -1], material: 'SmoothPlastic', color: wall });
  B(S, { size: [26, 1.2, 1.2], pos: [0, 0.6, -11.3], material: 'Wood', color: trim });
  for (const x of [-12.4, 12.4]) B(S, { size: [1.2, 1.2, 22], pos: [x, 0.6, -1], material: 'Wood', color: trim });
  B(S, { size: [26, 1, 1.2], pos: [0, 17.6, -11.3], material: 'Wood', color: trim });
}
