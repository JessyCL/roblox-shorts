// Stone curtain wall segment along local X (front = +Z), standing on y = 0: plinth, wall, walkway, battlements on
// both edges, arrow slits. From "The TINY War" (kingdom walls; scale it 25x for a giant kingdom).
export const meta = {
  id: 'castle_wall', tags: ['wall', 'castle', 'medieval', 'kingdom', 'fortress', 'battlements', 'stone', 'city wall'],
  description: 'Stone curtain wall segment along X with a darker plinth, a walkway on top, battlements on both edges and arrow slits; walkway top at y = h.',
  options: { len: 'length along X (60)', h: 'height to the walkway (14)', t: 'thickness (6)', color: 'stone colour (#8c877d)', trim: 'plinth/merlon colour (#77736a)', slits: 'false = no arrow slits' },
};
const B = (S, p) => S.part({ batch: true, ...p });
export default function castleWall(S, o = {}) {
  const L = o.len ?? 60, h = o.h ?? 14, t = o.t ?? 6, c = o.color ?? '#8c877d', tr = o.trim ?? '#77736a';
  B(S, { size: [L, 2.4, t + 1.2], pos: [0, 1.2, 0], material: 'Cobblestone', color: tr });
  B(S, { size: [L, h - 3.0, t], pos: [0, 2.4 + (h - 3.0) / 2, 0], material: 'Cobblestone', color: c }); // stops under the walkway slab (no shared faces = no flicker)
  B(S, { size: [L, 0.6, t + 0.4], pos: [0, h - 0.3, 0], material: 'Slate', color: '#6a665e' });
  const n = Math.max(2, Math.round(L / 3.2));
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + (i + 0.5) * (L / n);
    if (i % 2 === 0) for (const s of [-1, 1]) B(S, { size: [L / n, 2.4, 1.1], pos: [x, h + 1.2, s * (t / 2 - 0.55)], material: 'Cobblestone', color: tr });
    else B(S, { size: [L / n, 0.9, 1.1], pos: [x, h + 0.45, -(t / 2 - 0.55)], material: 'Cobblestone', color: tr });
    if (o.slits !== false && i % 4 === 1 && h > 8) B(S, { size: [0.5, 2.6, 0.2], pos: [x, h * 0.62, t / 2 + 0.06], material: 'SmoothPlastic', color: '#1e1c1a' });
  }
}
