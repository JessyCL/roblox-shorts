// A giant's grey hand reaching in: wrist at the origin, two huge fingers + thumb pointing toward +Z, sleeve behind.
export const meta = {
  id: 'big_hand', tags: ['hand', 'giant', 'monster', 'reach', 'grab', 'window', 'horror'],
  description: "Giant grey hand (about 4.4 x 14 studs) reaching toward +Z with two long fingers, a thumb and a torn brown sleeve - push it through a window.",
  options: { skin: 'hand colour (#9aa0a8)', sleeve: 'sleeve colour (#5c5046)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function bigHand(S, o = {}) {
  const g = o.skin ?? '#9aa0a8';
  B(S, { size: [4.4, 3.6, 5], pos: [0, 0, 2.5], material: 'SmoothPlastic', color: g });
  B(S, { size: [3.4, 3.2, 4], pos: [0, 0, -1.5], material: 'SmoothPlastic', color: o.sleeve ?? '#5c5046' });
  for (const s of [-1, 1]) { B(S, { size: [1.7, 1.7, 6.4], pos: [s * 1.15, 0.6, 8.1], material: 'SmoothPlastic', color: g }); B(S, { size: [1.3, 0.3, 1.2], pos: [s * 1.15, 1.5, 10.5], material: 'SmoothPlastic', color: '#c8ccd2' }); }
  B(S, { size: [1.5, 1.5, 3.6], pos: [0, -1.8, 5.8], material: 'SmoothPlastic', color: g });
}
