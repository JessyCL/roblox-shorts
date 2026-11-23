// Wedding arch: two white posts with an arc of pink/white flower balls; centred on the origin, opening along Z.
export const meta = {
  id: 'wedding_arch', tags: ['wedding', 'arch', 'flowers', 'ceremony', 'romance', 'party', 'celebration'],
  description: 'White wedding arch (10 studs wide, 12.4 tall) topped with alternating pink and white flower balls.',
  options: { colors: 'two alternating flower colours' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function weddingArch(S, o = {}) {
  const [c1, c2] = o.colors ?? ['#ff8cb8', '#ffffff'];
  for (const s of [-1, 1]) B(S, { size: [0.8, 9, 0.8], pos: [s * 5, 4.5, 0], material: 'Wood', color: '#f4f4f4' });
  for (let k = 0; k <= 12; k++) { const a = Math.PI * (k / 12); B(S, { shape: 'ball', size: [1.5, 1.5, 1.5], pos: [Math.cos(a) * 5, 9 + Math.sin(a) * 3.4, 0], material: 'SmoothPlastic', color: k % 2 ? c1 : c2 }); }
}
