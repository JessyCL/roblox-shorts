// Small gold crown (head-sized) with six points and a red gem; origin = centre of the band.
// To crown a character: place it ~0.45 above the head top (proto_ticket lands it at y 5.55 for a default 5-stud avatar).
export const meta = {
  id: 'crown', tags: ['crown', 'king', 'queen', 'royal', 'gold', 'treasure', 'reward'],
  description: 'Head-sized gold crown (1.25 studs wide) with six points and a glowing red gem; drop it onto a head with the drop_landing recipe.',
  options: { color: 'gold colour (#f2c230)', gem: 'gem colour (#e8304a)' },
};

export default function crown(S, o = {}) {
  const gold = o.color ?? '#f2c230';
  S.part({ shape: 'cylinder', size: [0.75, 1.25, 1.25], pos: [0, 0, 0], rot: [0, 0, 90], material: 'Foil', color: gold });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    S.part({ shape: 'wedge', size: [0.26, 0.5, 0.26], pos: [Math.cos(a) * 0.55, 0.6, Math.sin(a) * 0.55], material: 'Foil', color: gold });
  }
  S.part({ shape: 'ball', size: [0.3, 0.3, 0.3], pos: [0, 0.05, 0.64], material: 'Neon', color: o.gem ?? '#e8304a' });
}
