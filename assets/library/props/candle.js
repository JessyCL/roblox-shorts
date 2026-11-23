// Wax candle with a neon flame and (optionally) a warm point light. Base at the origin.
export const meta = {
  id: 'candle', tags: ['candle', 'light', 'flame', 'warm', 'interior', 'night', 'cozy', 'spooky'],
  description: 'Cream wax candle (1 stud) with a glowing flame and a warm orange point light (range 26).',
  options: { light: 'false = flame only, no light' },
};

export default function candle(S, o = {}) {
  S.part({ batch: true, shape: 'cylinder', size: [1, 0.4, 0.4], pos: [0, 0.5, 0], rot: [0, 0, 90], material: 'SmoothPlastic', color: '#f2ead0' });
  S.part({ shape: 'ball', size: [0.3, 0.3, 0.3], pos: [0, 1.15, 0], material: 'Neon', color: '#ffb84a' });
  if (o.light !== false) S.light({ type: 'point', pos: [0, 1.6, 0], color: '#ffa24a', range: 26, brightness: 2.4 });
}
