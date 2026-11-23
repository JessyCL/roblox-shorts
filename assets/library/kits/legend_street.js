// Legend street: a long sandstone canyon of tall flat-roofed buildings on warm brick (from proto_ticket, the
// "legends" who asked for a crown / a boat). Street runs along -Z from z 6; width 34 between facades.
export const meta = {
  id: 'legend_street', tags: ['street', 'city', 'canyon', 'buildings', 'downtown', 'brick', 'day', 'urban', 'modern'],
  description: 'Endless city canyon: 2 rows of tall concrete buildings (sandstone tones) along a warm brick street running into the distance. Good for walk-ups, drops from the sky and parades.',
  options: { look: "lighting look ('day')", rows: 'buildings per side (14)', halfWidth: 'street half-width to the facades (17)', colors: 'two alternating facade colours', ground: 'ground colour' },
  anchors: { spot_center: 'street centre (0,0,0)', spot_far: 'far down the street', cam_street: 'eye-level camera looking down the street', cam_high: 'high camera over the canyon' },
};

export default async function legendStreet(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  const rows = o.rows ?? 14, hw = o.halfWidth ?? 17, [c1, c2] = o.colors ?? ['#cfae84', '#d8bd93'];
  if (o.look !== null) S.look(o.look ?? 'day');
  S.ground({ material: 'Brick', color: o.ground ?? '#d9a07f', size: 800 });
  for (let i = 0; i < rows; i++) {
    for (const side of [-1, 1]) S.building({ pos: [side * hw, 6 - i * 22], yaw: side > 0 ? -90 : 90, size: [22, 34 + (i % 3) * 4, 14], material: 'Concrete', color: i % 2 ? c2 : c1, roof: 'flat' });
  }
  A('spot_center', [0, 0, 0]); A('spot_far', [0, 0, -60]);
  A('cam_street', [0, 4.2, 14]); A('cam_street_at', [0, 3, -4]);
  A('cam_high', [8, 30, 40]); A('cam_high_at', [0, 6, -40]);
  return { anchors: out };
}
