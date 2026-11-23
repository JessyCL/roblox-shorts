// Chunky chocolate-chip cookie (0.84 studs across), lying flat; `upright: true` stands it facing +Z.
export const meta = {
  id: 'cookie', tags: ['cookie', 'food', 'snack', 'sweet', 'chocolate', 'kid'],
  description: 'Golden chocolate-chip cookie (big blocky chips) - flat on a table or upright; scale it up for a giant cookie.',
  options: { upright: 'true = disc faces +Z', color: 'dough colour (#c9873e)', bite: 'true = one round bite missing (at +X)' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default function cookie(S, o = {}) {
  const up = !!o.upright, at = (x, y) => (up ? [x, y + 0.42, 0.07] : [x, 0.14, -y]); // chips on the face
  const R = 0.42, bx = 0.4, by = 0.08, br = 0.24, bitten = (x, y) => !!o.bite && Math.hypot(x - bx, y - by) < br; // one bite missing at +x
  if (!o.bite) B(S, { shape: 'cylinder', size: [0.14, 0.84, 0.84], pos: up ? [0, 0.42, 0] : [0, 0.07, 0], rot: up ? [0, 90, 0] : [0, 0, 90], material: 'Plastic', color: o.color ?? '#c9873e' });
  else for (let k = 0; k < 14; k++) { // the disc as 14 strips with a round bite cut out of them (blocky, Roblox-style)
    const y = -R + (k + 0.5) * (2 * R / 14), h = Math.sqrt(Math.max(0, R * R - y * y)), segs = [];
    const cut = Math.abs(y - by) < br ? Math.sqrt(br * br - (y - by) ** 2) : null;
    if (cut == null || bx - cut > h) segs.push([-h, h]); else { if (bx - cut > -h) segs.push([-h, bx - cut]); if (bx + cut < h) segs.push([bx + cut, h]); }
    for (const [x0, x1] of segs) { const p = at((x0 + x1) / 2, y); B(S, { size: up ? [x1 - x0, 2 * R / 14 + 0.004, 0.14] : [x1 - x0, 0.14, 2 * R / 14 + 0.004], pos: up ? [p[0], p[1], 0] : [p[0], 0.07, p[2]], material: 'Plastic', color: o.color ?? '#c9873e' }); }
  }
  for (const [x, y] of [[0.15, 0.1], [-0.18, 0.05], [0.02, -0.2], [-0.05, 0.22]]) if (!bitten(x, y)) B(S, { size: [0.1, up ? 0.1 : 0.06, up ? 0.06 : 0.1], pos: at(x, y), material: 'SmoothPlastic', color: '#4a2a14' });
}
