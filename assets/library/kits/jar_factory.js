// Jar factory: a boarded-up brick block with a smokestack, planked windows, JAR FACTORY sign and a CLOSED 1931 notice.
// Local frame: front faces +Z, centred on x = 0 (from "Everyone Has ONE Hand").
export const meta = {
  id: 'jar_factory', tags: ['factory', 'abandoned', 'closed', 'brick', 'industrial', 'boarded', 'jar', 'village', 'old'],
  description: 'Abandoned brick factory (26 x 24 x 20) with a chimney stack, boarded windows and door, a JAR FACTORY sign and a red CLOSED 1931 notice.',
  options: { pos: 'placement [x,z] or [x,y,z]', yaw: 'facing (deg)', name: "sign text ('JAR FACTORY')", closed: "notice lines (['CLOSED', '1931']); false = none",
    ground: 'false = no ground/look (inside another set)', look: "look when standalone ('day')" },
  anchors: { factory: 'sign height on the facade', factorySign: 'the CLOSED notice', factoryFront: 'street spot in front', cam_front: 'wide of the facade', cam_sign: 'close on the notice' },
};

const B = (S, p) => S.part({ batch: true, ...p });
export default async function jarFactory(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.ground !== false) { S.look(o.look ?? 'day'); S.ground({ material: 'Cobblestone', color: '#a39c90', size: 400 }); }
  S.within(o.pos ?? [0, 0, 0], o.yaw ?? 0, () => {
    const w = 26, h = 24, d = 20, fz = d / 2;
    B(S, { size: [w, h, d], pos: [0, h / 2, 0], material: 'Brick', color: '#8a4a36' });
    B(S, { size: [w + 1, 1.2, d + 1], pos: [0, h + 0.3, 0], material: 'Concrete', color: '#5a4a44' });
    B(S, { shape: 'cylinder', size: [18, 3.5, 3.5], pos: [8, h + 9, -4], rot: [0, 0, 90], material: 'Brick', color: '#7a3a2a' });
    for (const y of [5, 13, 20]) for (const x of [-9, -3, 3, 9]) {
      if (y === 5 && Math.abs(x) < 4) continue;
      B(S, { size: [3.6, 4.4, 0.3], pos: [x, y, fz + 0.1], material: 'SmoothPlastic', color: '#1e1a18' });
      for (const a of [30, -30]) B(S, { size: [4.6, 0.6, 0.3], pos: [x, y, fz + 0.35], rot: [0, 0, a], material: 'WoodPlanks', color: '#9a7a52' });
    }
    B(S, { size: [6, 8, 0.4], pos: [0, 4, fz + 0.1], material: 'WoodPlanks', color: '#5a3a22' });
    for (const y of [2, 4.5, 7]) B(S, { size: [7, 0.7, 0.3], pos: [0, y, fz + 0.4], rot: [0, 0, y === 4.5 ? -8 : 6], material: 'WoodPlanks', color: '#a8865a' });
    const sign = S.part({ size: [16, 3, 0.5], pos: [0, 9.6, fz + 0.4], material: 'WoodPlanks', color: '#e6d2a6' });
    S.text({ part: sign, face: 'front', text: o.name ?? 'JAR FACTORY', color: '#3a2412', font: 'western' });
    if (o.closed !== false) {
      const closed = S.part({ size: [7, 2.6, 0.3], pos: [0, 6.2, fz + 0.75], rot: [0, 0, -6], material: 'SmoothPlastic', color: '#f4f0e6' });
      S.text({ part: closed, face: 'front', lines: (o.closed ?? ['CLOSED', '1931']).map((text) => ({ text, color: '#c4281c' })), font: 'gotham' });
    }
    A('factory', [0, 9, fz]);
    A('factorySign', [0, 6.2, fz + 0.8]);
    A('factoryFront', [0, 0, fz + 6]);
    A('cam_front', [6, 8, 44]); A('cam_front_at', [0, 11, 0]);
    A('cam_sign', [1.5, 6.6, 18]); A('cam_sign_at', [0, 6.2, fz + 0.8]);
  });
  return { anchors: out };
}
