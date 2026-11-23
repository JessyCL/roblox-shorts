// Small story props from "The TINY War", one prop with a `kind` option (each kind built at the local origin):
//   spool (thread-spool seat, top at y 8.4) · clipping (giant toenail-clipping crescent, ~11 wide) · vacuum (red
//   giant vacuum cleaner, nozzle at the origin) · sock (loose giant sock, centred, length along Z) · hand (giant pinching
//   hand, fingertips at the origin, arm going up) · crumb (bread crumb) · page (small paper sheet facing +Z) ·
//   shield (round metal shield lying flat) · pea (frozen green pea, d 9)
export const meta = {
  id: 'story_bits', tags: ['spool', 'toenail', 'vacuum', 'sock', 'giant hand', 'crumb', 'page', 'paper', 'shield', 'pea', 'tiny war', 'props'],
  description: "Small props by kind: 'spool' seat, 'clipping' toenail crescent, 'vacuum' giant vacuum, 'sock' loose giant sock, 'hand' giant pinching hand, 'crumb', 'page' paper sheet, 'shield' round shield, 'pea' frozen pea.",
  options: { kind: "'spool' | 'clipping' | 'vacuum' | 'sock' | 'hand' | 'crumb' | 'page' | 'shield' | 'pea'", skin: 'hand skin colour (#f1c9a5)', color: 'main colour override' },
};
export default function storyBits(S, o = {}) {
  const P = (p) => S.part(p), V = (y, h, d, p) => P({ shape: 'cylinder', size: [h, d, d], pos: [0, y, 0], rot: [0, 0, 90], ...p });
  switch (o.kind) {
    case 'spool': V(0.6, 1.2, 12, { material: 'Wood', color: '#c49a6a' }); V(4.2, 6, 8, { material: 'Fabric', color: o.color ?? '#c42a2a' }); V(7.8, 1.2, 12, { material: 'Wood', color: '#c49a6a' }); break;
    case 'clipping': for (let i = -8; i <= 8; i++) { const a = (i / 8) * 1.25, th = 2.2 - Math.abs(i) * 0.18; P({ size: [1.5, th, 1.4], pos: [Math.sin(a) * 6, 2 + Math.cos(a) * 6, 0], rot: [0, 0, (-a * 180) / Math.PI], material: 'SmoothPlastic', color: '#f2ead8' }); } break;
    case 'vacuum':
      P({ size: [40, 14, 26], pos: [0, 7, 0], material: 'SmoothPlastic', color: o.color ?? '#c42a2a' });
      P({ shape: 'cylinder', size: [120, 5, 5], pos: [0, 66, -8], rot: [0, 0, 90], material: 'Metal', color: '#9aa2ac' });
      P({ size: [12, 6, 30], pos: [0, 128, -8], material: 'SmoothPlastic', color: '#2a2a2a' }); break;
    case 'sock':
      P({ size: [28, 22, 64], pos: [0, 0, 0], material: 'Fabric', color: '#f4f1ea' });
      P({ size: [28.6, 22.6, 5], pos: [0, 0, 26], material: 'Fabric', color: '#d8262c' });
      P({ size: [28.6, 22.6, 5], pos: [0, 0, 18], material: 'Fabric', color: '#2f5fae' });
      P({ size: [26, 20, 50], pos: [0, 0, -50], material: 'Fabric', color: '#f4f1ea' }); break;
    case 'hand': {
      const sk = o.skin ?? '#f1c9a5';
      P({ size: [16, 14, 7], pos: [0, 12, 0], material: 'SmoothPlastic', color: sk });
      for (const s of [-1, 1]) P({ size: [4.5, 9, 4.5], pos: [s * 3.5, 3.5, 0], material: 'SmoothPlastic', color: sk });
      P({ size: [12, 40, 9], pos: [0, 38, 0], material: 'SmoothPlastic', color: sk }); break;
    }
    case 'crumb': P({ size: [5, 4, 4.5], pos: [0, 2, 0], rot: [8, 20, 5], material: 'Sand', color: '#d8a860' }); P({ size: [3, 2.4, 3], pos: [1.6, 3.6, 0.8], rot: [20, 0, 15], material: 'Sand', color: '#c89850' }); break;
    case 'page': P({ size: [2.2, 2.8, 0.1], pos: [0, 0, 0], material: 'SmoothPlastic', color: '#efe2c0' }); break;
    case 'shield': P({ shape: 'cylinder', size: [0.8, 6, 6], pos: [0, 0, 0], rot: [0, 0, 90], material: 'Metal', color: o.color ?? '#9aa2ac' }); break;
    case 'pea': P({ shape: 'ball', size: [9, 9, 9], pos: [0, 0, 0], material: 'SmoothPlastic', color: '#5ab83a' }); break;
    default: throw new Error(`story_bits: unknown kind "${o.kind}"`);
  }
}
