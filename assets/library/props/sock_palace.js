// A giant sock turned into a tiny kingdom's royal palace, lying on y = 0: foot along X (toe at -X), ankle tube up at
// +X with red/blue cuff stripes, grey heel and toe patches, windows, an arched door (front = +Z) and two flags.
// About 100 x 72 x 28 studs. From "The TINY War".
export const meta = {
  id: 'sock_palace', tags: ['sock', 'palace', 'tiny', 'giant object', 'castle', 'funny', 'kingdom', 'tiny war'],
  description: 'Giant white sock used as a royal palace by tiny people: foot along X with the toe at -X, ankle tube rising at +X with red/blue cuff stripes, windows, an arched wooden door on the +Z side and two flags on top.',
  options: { cuff1: 'top stripe (#d8262c)', cuff2: 'second stripe (#2f5fae)', flags: 'false = no flags' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function sockPalace(S, o = {}) {
  B(S, { size: [28, 64, 28], pos: [30, 32, 0], material: 'Fabric', color: '#f4f1ea' });
  B(S, { size: [28.6, 5, 28.6], pos: [30, 56, 0], material: 'Fabric', color: o.cuff1 ?? '#d8262c' });
  B(S, { size: [28.6, 5, 28.6], pos: [30, 47, 0], material: 'Fabric', color: o.cuff2 ?? '#2f5fae' });
  B(S, { size: [72, 26, 27.2], pos: [-6, 13, 0], material: 'Fabric', color: '#f4f1ea' }); // narrower than the tube: no coplanar faces
  B(S, { shape: 'cylinder', size: [28, 26, 26], pos: [-42, 13, 0], rot: [0, 90, 0], material: 'Fabric', color: '#d8d4cc' });
  B(S, { size: [20, 22.6, 28.8], pos: [36, 11.3, 0], material: 'Fabric', color: '#d8d4cc' });
  for (const wx of [-30, -14, 18]) { B(S, { size: [5, 6, 0.8], pos: [wx, 17, 14.2], material: 'Neon', color: '#ffc870' }); B(S, { size: [6.4, 7.4, 0.6], pos: [wx, 17, 14.05], material: 'Wood', color: '#6a4428' }); }
  for (const wy of [30, 40]) { B(S, { size: [6, 6, 0.8], pos: [30, wy, 14.2], material: 'Neon', color: '#ffc870' }); B(S, { size: [7.4, 7.4, 0.6], pos: [30, wy, 14.05], material: 'Wood', color: '#6a4428' }); }
  B(S, { size: [9, 13, 1], pos: [-6, 6.5, 14.4], material: 'WoodPlanks', color: '#5a3a22' });
  B(S, { shape: 'cylinder', size: [1, 9, 9], pos: [-6, 13, 14.4], rot: [0, 90, 0], material: 'WoodPlanks', color: '#5a3a22' });
  if (o.flags !== false) for (const fx of [20, 40]) { B(S, { shape: 'cylinder', size: [16, 0.8, 0.8], pos: [fx, 72, 0], rot: [0, 0, 90], material: 'Metal', color: '#c9a03a' }); B(S, { size: [8, 5, 0.4], pos: [fx + 4.2, 77, 0], material: 'Fabric', color: fx === 20 ? '#2f5fae' : '#e0b030' }); }
}
