// Interior window with a flat "sky" pane (own material, recolour per shot: day / night / dawn), cross mullions and a sill.
// The pane mesh is registered as S.anchors[name] so shot.update can tint it:
//   const m = ctx.set.S.anchors.mySky.material; m.color.set('#14224e'); m.emissive.set('#1e3a8a'); m.emissiveIntensity = 0.9;
export const meta = {
  id: 'sky_window', tags: ['window', 'interior', 'sky', 'night', 'day', 'bedroom', 'wall'],
  description: 'Wall window (5 x 5.5) with a recolourable sky pane, wooden frame, cross mullions and sill; pane mesh = S.anchors[name].',
  options: { w: 'pane width (5)', h: 'pane height (5.5)', name: 'anchor name for the pane mesh', sky: 'pane colour (#8fc8f0)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function skyWindow(S, o = {}) {
  const w = o.w ?? 5, h = o.h ?? 5.5;
  B(S, { size: [w + 1, h + 1, 0.4], pos: [0, 0, -0.1], material: 'Wood', color: '#5a3a22' });
  const p = S.part({ size: [w, h, 0.2], pos: [0, 0, 0.15], material: 'SmoothPlastic', color: o.sky ?? '#8fc8f0' });
  p.material = p.material.clone(); p.name = o.name ?? 'skyWindow'; S.anchors[p.name] = p;
  B(S, { size: [0.25, h, 0.7], pos: [0, 0, 0.3], material: 'Wood', color: '#5a3a22' });
  B(S, { size: [w, 0.25, 0.7], pos: [0, 0, 0.3], material: 'Wood', color: '#5a3a22' });
  B(S, { size: [w + 1.6, 0.6, 1.4], pos: [0, -h / 2 - 0.6, 0.6], material: 'Wood', color: '#5a3a22' });
  return p;
}
