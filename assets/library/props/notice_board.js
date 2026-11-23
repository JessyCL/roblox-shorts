// Wooden notice board on two posts with western-style text lines (proclamations, "BY ORDER OF THE MAYOR").
export const meta = {
  id: 'notice_board', tags: ['sign', 'notice', 'board', 'proclamation', 'medieval', 'village', 'text', 'law'],
  description: 'Parchment-coloured wooden notice board (10 x 5.5) on two posts, facing +Z, with up to 3 lines of text.',
  options: { lines: '[{ text, size }] or strings (default a mayor proclamation)', color: 'text colour', font: "text font ('western')" },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function noticeBoard(S, o = {}) {
  // posts sit BEHIND the board (z -0.55) so they never cover the first/last letters of the text
  for (const s of [-1, 1]) B(S, { size: [0.6, 8, 0.6], pos: [s * 4, 4, -0.55], material: 'Wood', color: '#4a3020' });
  const nb = S.part({ size: [10, 5.5, 0.5], pos: [0, 6, 0], material: 'WoodPlanks', color: '#e8d6aa' });
  const lines = (o.lines ?? [{ text: 'BY ORDER OF THE MAYOR', size: 0.4 }, { text: 'NOTICE' }, { text: 'READ ALL ABOUT IT', size: 0.6 }]).map((l) => (typeof l === 'string' ? { text: l } : l));
  S.text({ part: nb, face: 'front', lines, color: o.color ?? '#3a2412', font: o.font ?? 'western' });
}
