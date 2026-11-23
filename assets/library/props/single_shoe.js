// "The Ropes": the one shoe found on the grass in the morning - a small, clean leather lace-up shoe lying tipped on its
// side (opening toward +X), laces loose, not a scratch on it. Toe toward +Z; rests on local y = 0 (put it 0.05 above the ground).
export const meta = {
  id: 'single_shoe', tags: ['shoe', 'lost', 'missing', 'clue', 'grass', 'leather', 'lace', 'ropes', 'morning'],
  description: 'A single small leather lace-up shoe lying on its side on the grass, laces loose (about 1.6 studs long). The clue left behind when someone is taken.',
  options: { color: "leather colour ('#8c4a28')", upright: 'true = standing instead of tipped over', laces: "lace colour ('#efe8da')" },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function singleShoe(S, o = {}) {
  const col = o.color ?? '#8c4a28', lace = o.laces ?? '#efe8da', dark = '#2a1810';
  const build = () => {
    B(S, { size: [0.74, 0.14, 1.62], pos: [0, 0.07, 0.05], material: 'Leather', color: '#5e3c28' });             // sole
    B(S, { size: [0.7, 0.2, 0.42], pos: [0, 0.24, -0.6], material: 'Leather', color: '#4e3222' });              // heel block
    B(S, { size: [0.68, 0.5, 1.0], pos: [0, 0.39, -0.22], material: 'Leather', color: col });                   // quarter
    B(S, { shape: 'ball', size: [0.7, 0.5, 0.9], pos: [0, 0.3, 0.42], material: 'Leather', color: col });       // rounded toe
    B(S, { size: [0.7, 0.18, 0.5], pos: [0, 0.2, 0.5], material: 'Leather', color: col });
    B(S, { size: [0.52, 0.1, 0.62], pos: [0, 0.66, -0.3], material: 'SmoothPlastic', color: dark });           // opening (0.02 above the quarter top)
    B(S, { shape: 'wedge', size: [0.46, 0.34, 0.6], pos: [0, 0.6, 0.06], rot: [0, 180, 0], material: 'Leather', color: '#8a4a2a' }); // tongue
    for (let k = 0; k < 3; k++) B(S, { size: [0.6, 0.05, 0.06], pos: [0, 0.6 - k * 0.07, -0.02 + k * 0.14], rot: [k * 8, 0, 0], material: 'Fabric', color: lace });
    B(S, { size: [0.05, 0.05, 0.7], pos: [0.36, 0.42, 0.1], rot: [0, 25, -40], material: 'Fabric', color: lace });   // loose lace ends
    B(S, { size: [0.05, 0.05, 0.6], pos: [-0.3, 0.12, 0.36], rot: [0, -35, 0], material: 'Fabric', color: lace });
  };
  if (o.upright) build();
  else S.within([0, 0.39, 0], 0, () => S.group(null, { pivot: [0, 0, 0] }, (g) => { build(); g.rotation.z = -Math.PI / 2; })); // lying on its side, opening and laces toward +X
}
