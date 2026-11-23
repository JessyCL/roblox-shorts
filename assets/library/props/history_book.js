// Open history book on a wooden lectern, on y = 0, readable from +Z: lectern, red cover, a left page with text and a
// right page torn short with a jagged edge (torn: false = whole page). Page text via S.text (returned handles).
// From "The TINY War".
export const meta = {
  id: 'history_book', tags: ['book', 'lectern', 'history', 'library', 'torn page', 'pages', 'text', 'mystery'],
  description: 'Lectern with an open book facing +Z: red cover, left page text (lines option), right page torn short with a jagged edge. Returns { pageL } text handle; anchors <name>_pageL, <name>_torn, <name>_book.',
  options: { lines: "left page lines (['THEY', 'STARTED', 'IT.'])", torn: 'false = intact right page', name: 'anchor prefix (book)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function historyBook(S, o = {}) {
  const n = o.name ?? 'book';
  B(S, { size: [3, 4, 2.4], pos: [0, 2, 0], material: 'Wood', color: '#4a2a1a' });
  B(S, { size: [4.4, 0.4, 3.4], pos: [0, 4.1, 0], material: 'Wood', color: '#3a2014' });
  S.within([0, 4.6, 0], 0, () => {
    B(S, { size: [7.6, 0.5, 5], pos: [0, 0, 0], rot: [18, 0, 0], material: 'Fabric', color: '#6a1a1a' });
    B(S, { size: [3.6, 0.35, 4.6], pos: [-1.85, 0.42, 0.05], rot: [18, 0, 4], material: 'SmoothPlastic', color: '#f4ead2' });
    if (o.torn === false) B(S, { size: [3.6, 0.35, 4.6], pos: [1.85, 0.42, 0.05], rot: [18, 0, -4], material: 'SmoothPlastic', color: '#f4ead2' });
    else {
      B(S, { size: [3.6, 0.35, 2.2], pos: [1.85, 0.8, -1.1], rot: [18, 0, -4], material: 'SmoothPlastic', color: '#f4ead2' });
      for (let i = 0; i < 6; i++) B(S, { size: [0.6, 0.36, 0.6], pos: [0.3 + i * 0.6, 0.48, 0.02 + (i % 2) * 0.3], rot: [18, 45, -4], material: 'SmoothPlastic', color: '#f4ead2' });
    }
  });
  const pageL = S.text({ lines: (o.lines ?? ['THEY', 'STARTED', 'IT.']).map((t) => ({ text: t, size: 1 })), pos: [-1.85, 5.24, 0.28], rot: [-72, 0, 0], size: [3.1, 3.6], font: 'serif', color: '#2a1a10', bg: null, px: 220 });
  S.anchor(`${n}_book`, [0, 5.2, 0.25]); S.anchor(`${n}_pageL`, [-1.85, 5.2, 0.28]); S.anchor(`${n}_torn`, [1.85, 5.4, -0.4]); // S.anchor maps local -> world
  return { pageL };
}
