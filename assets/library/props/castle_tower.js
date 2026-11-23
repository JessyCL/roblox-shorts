// Round castle tower standing on y = 0: stone body, corbelled crown with battlements, arrow slits, a stepped conical
// slate roof and a banner on top. From "The TINY War".
export const meta = {
  id: 'castle_tower', tags: ['tower', 'castle', 'medieval', 'kingdom', 'turret', 'battlements', 'stone', 'cone roof', 'banner'],
  description: 'Round stone castle tower (radius r, height h) with a battlemented crown, arrow slits, stepped conical slate roof and a coloured banner on the spire. Roof: false = open battlement top.',
  options: { r: 'radius (7)', h: 'height of the body (26)', color: 'stone (#8c877d)', roof: "roof colour (#3a3f52) or false", banner: 'banner colour (#c42a2a) or false', door: 'true = wooden door at the front (+Z)' },
};
const B = (S, p) => S.part({ batch: true, ...p });
const V = (S, y, h, d, p) => B(S, { shape: 'cylinder', size: [h, d, d], pos: [0, y, 0], rot: [0, 0, 90], ...p });
export default function castleTower(S, o = {}) {
  const r = o.r ?? 7, h = o.h ?? 26, c = o.color ?? '#8c877d';
  V(S, 1.2, 2.4, 2 * r + 1.4, { material: 'Cobblestone', color: '#77736a' });
  V(S, h / 2, h, 2 * r, { material: 'Cobblestone', color: c });
  V(S, h + 0.9, 1.8, 2 * r + 1.6, { material: 'Cobblestone', color: '#7e7a71' });
  const n = Math.max(8, Math.round(r * 1.6));
  for (let i = 0; i < n; i += 2) { const a = (i / n) * Math.PI * 2; B(S, { size: [2 * Math.PI * (r + 0.6) / n, 2.2, 1], pos: [Math.cos(a) * (r + 0.4), h + 2.9, Math.sin(a) * (r + 0.4)], rot: [0, -a * 180 / Math.PI + 90, 0], material: 'Cobblestone', color: '#7e7a71' }); }
  for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + k * 0.6; B(S, { size: [0.5, 2.4, 0.3], pos: [Math.cos(a) * (r + 0.05), h * (0.3 + k * 0.22), Math.sin(a) * (r + 0.05)], rot: [0, -a * 180 / Math.PI + 90, 0], material: 'SmoothPlastic', color: '#1e1c1a' }); }
  if (o.door) B(S, { size: [3.6, 6, 0.6], pos: [0, 3.4, r - 0.1], material: 'WoodPlanks', color: '#5a3a22' });
  let top = h + 1.8;
  if (o.roof !== false) {
    const rh = r * 2.2, steps = 12;
    for (let i = 0; i < steps; i++) V(S, top + (i + 0.5) * (rh / steps), rh / steps + 0.02, (2 * r + 2) * (1 - i / steps), { material: 'Slate', color: o.roof ?? '#3a3f52' });
    top += rh;
  }
  if (o.banner !== false) {
    B(S, { shape: 'cylinder', size: [6, 0.35, 0.35], pos: [0, top + 3, 0], rot: [0, 0, 90], material: 'Metal', color: '#c9a03a' });
    B(S, { size: [3.6, 2.2, 0.15], pos: [1.9, top + 4.6, 0], material: 'Fabric', color: o.banner ?? '#c42a2a' });
  }
}
