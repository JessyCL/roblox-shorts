// Canvas-drawn decal faces (original designs in the bold classic-decal style: thick black oval eyes with white glints,
// thick slanted brows, black mouths with red interiors, white teeth). The face is baked into the head texture together
// with the skin colour (no transparency sorting), cached per (skin, style, expression, blink, size).
//
// Expressions: neutral smile grin happy laugh sad cry angry shout(=yell) shock surprised terrified worried smug scared
// evil sleepy love dead determined confused skeptical embarrassed disgusted, mouths talk_a / talk_o.
// Compose with '+': 'angry+talk_a' (angry eyes/brows, talk_a mouth). Blink = eyes closed version of any face.
// Face style (per character, `faceStyle` in the spec, or a preset name 'a'..'h'):
//   { eyes: 'bean'|'round'|'dot'|'tall'|'wide'|'pupil', brows: 'thick'|'thin'|'bushy'|'none', mouth: 'thick'|'thin',
//     glint: 0|1|2, lashes, freckles, size, spacing, browColor, ink }
import * as THREE from 'three';
import { FACE_ARC } from './rig.js';

const INK = '#151313', RED = '#d4302b', DEEP = '#7c1212', TONGUE = '#ff7d7a', TEETH = '#ffffff', TEAR = '#5cc4ff';

export const FACE_STYLES = {
  a: { eyes: 'bean', brows: 'thick', glint: 1 },
  b: { eyes: 'round', brows: 'thin', glint: 2, lashes: true },
  c: { eyes: 'dot', brows: 'thick', glint: 0, mouth: 'thin' },
  d: { eyes: 'tall', brows: 'bushy', glint: 1 },
  e: { eyes: 'wide', brows: 'thin', glint: 2, freckles: true },
  f: { eyes: 'pupil', brows: 'thick', glint: 1 },
  g: { eyes: 'bean', brows: 'none', glint: 1, size: 1.08 },
  h: { eyes: 'round', brows: 'bushy', glint: 1, spacing: 1.1 },
};
const STYLE_DEFAULT = { eyes: 'bean', brows: 'thick', mouth: 'thick', glint: 1, lashes: false, freckles: false, size: 1, spacing: 1, ink: INK };
export const resolveStyle = (s) => ({ ...STYLE_DEFAULT, ...(typeof s === 'string' ? FACE_STYLES[s] : s) });

// Expression table. eyes: { state, scale, lid: 'angry'|'sad'|'half', lidAmt, look, dy, l/r overrides }
// brows: { a: deg (+ = inner end lower/angry), dy, arch, thick, l/r overrides } or false
// mouth: { kind, w, h, k, dx }
export const EXPRESSIONS = {
  neutral: { eyes: {}, brows: { a: -3 }, mouth: { kind: 'curve', w: 0.2, k: 0.03 } },
  smile: { eyes: {}, brows: { a: -6, dy: 0.015 }, mouth: { kind: 'curve', w: 0.3, k: 0.08 } },
  grin: { eyes: {}, brows: { a: -6, dy: 0.02 }, mouth: { kind: 'grin', w: 0.36, h: 0.15 } },
  happy: { eyes: { state: 'happy' }, brows: { a: -8, dy: 0.05 }, mouth: { kind: 'D', w: 0.32, h: 0.17 }, blush: true },
  laugh: { eyes: { state: 'squint' }, brows: { a: -10, dy: 0.06 }, mouth: { kind: 'D', w: 0.38, h: 0.22 }, blush: true },
  sad: { eyes: { scale: 0.92, lid: 'sad', lidAmt: 0.2 }, brows: { a: -24, dy: 0.03 }, mouth: { kind: 'curve', w: 0.22, k: -0.065 } },
  cry: { eyes: { state: 'closedSad' }, brows: { a: -26, dy: 0.03 }, mouth: { kind: 'wail', w: 0.3, h: 0.15 }, tears: true },
  angry: { eyes: { lid: 'angry', lidAmt: 0.35 }, brows: { a: 28, dy: -0.03, thick: 1.2 }, mouth: { kind: 'curve', w: 0.22, k: -0.05 } },
  shout: { eyes: { lid: 'angry', lidAmt: 0.3 }, brows: { a: 30, dy: -0.025, thick: 1.25 }, mouth: { kind: 'shout', w: 0.36, h: 0.23 }, vein: true },
  shock: { eyes: { scale: 1.22, glint: 1 }, brows: { a: -10, dy: 0.085, arch: 1 }, mouth: { kind: 'O', w: 0.15, h: 0.2 } },
  surprised: { eyes: { scale: 1.12 }, brows: { a: -6, dy: 0.08, arch: 1 }, mouth: { kind: 'O', w: 0.1, h: 0.12 } },
  terrified: { eyes: { state: 'white', scale: 1.3 }, brows: { a: -24, dy: 0.085 }, mouth: { kind: 'grimace', w: 0.38, h: 0.14 }, sweat: true },
  worried: { eyes: { scale: 0.95 }, brows: { a: -22, dy: 0.045 }, mouth: { kind: 'wavy', w: 0.22 }, sweat: true },
  smug: { eyes: { lid: 'half', lidAmt: 0.45 }, brows: { l: { a: -14, dy: 0.075, arch: 1 }, r: { a: 10, dy: -0.01 } }, mouth: { kind: 'smirk', w: 0.27 } },
  scared: { eyes: { scale: 1.14, glint: 2 }, brows: { a: -24, dy: 0.06 }, mouth: { kind: 'wail', w: 0.2, h: 0.11 }, sweat: true },
  evil: { eyes: { lid: 'angry', lidAmt: 0.45 }, brows: { a: 34, dy: -0.015, thick: 1.15 }, mouth: { kind: 'evil', w: 0.42, h: 0.16 } },
  sleepy: { eyes: { state: 'closed' }, brows: { a: -4, dy: -0.02 }, mouth: { kind: 'O', w: 0.08, h: 0.085 } },
  love: { eyes: { state: 'heart' }, brows: { a: -8, dy: 0.05 }, mouth: { kind: 'D', w: 0.28, h: 0.13 }, blush: true },
  dead: { eyes: { state: 'x' }, brows: false, mouth: { kind: 'tongue', w: 0.24 } },
  determined: { eyes: { lid: 'angry', lidAmt: 0.25 }, brows: { a: 18, dy: -0.015, thick: 1.1 }, mouth: { kind: 'grit', w: 0.24, h: 0.065 } },
  confused: { eyes: { l: { scale: 1.12 }, r: { scale: 0.82 } }, brows: { l: { a: -16, dy: 0.08, arch: 1 }, r: { a: 14, dy: -0.005 } }, mouth: { kind: 'wavy', w: 0.2 } },
  skeptical: { eyes: { lid: 'half', lidAmt: 0.4, look: 0.03 }, brows: { l: { a: -10, dy: 0.08, arch: 1 }, r: { a: 12, dy: -0.01 } }, mouth: { kind: 'curve', w: 0.16, k: 0, dx: 0.04 } },
  embarrassed: { eyes: { look: -0.035, scale: 0.9 }, brows: { a: -18, dy: 0.03 }, mouth: { kind: 'wavy', w: 0.15 }, blush: true, sweat: true },
  disgusted: { eyes: { state: 'squint' }, brows: { a: 22, dy: -0.01 }, mouth: { kind: 'grimace', w: 0.26, h: 0.09, dx: 0.03 } },
  deadpan: { eyes: { lid: 'half', lidAmt: 0.5 }, brows: { a: 0, dy: -0.01 }, mouth: { kind: 'curve', w: 0.18, k: 0 } },
  // style-bible additions
  googly_shock: { eyes: { state: 'white', scale: 1.55, pupil: 0.18 }, brows: { a: -12, dy: 0.1, arch: 1 }, mouth: { kind: 'O', w: 0.17, h: 0.22 } },
  side_eye: { eyes: { state: 'white', scale: 1.0, pupil: 0.62, lid: 'half', lidAmt: 0.38 }, brows: { l: { a: 6, dy: -0.01 }, r: { a: -4, dy: 0.02 } }, mouth: { kind: 'curve', w: 0.15, k: -0.01, dx: 0.04 } },
  wink: { eyes: { r: { state: 'happy' } }, brows: { l: { a: -8, dy: 0.04 }, r: { a: 6, dy: -0.01 } }, mouth: { kind: 'grin', w: 0.34, h: 0.14 } },
  yell_wink: { eyes: { r: { state: 'squint' }, l: { lid: 'angry', lidAmt: 0.3, scale: 1.1 } }, brows: { a: 28, dy: -0.02, thick: 1.2 }, mouth: { kind: 'shout', w: 0.38, h: 0.24 } },
  content: { eyes: { state: 'closed' }, brows: { a: -8, dy: 0.03 }, mouth: { kind: 'curve', w: 0.24, k: 0.07 }, blush: true },
  toothy_grin: { eyes: {}, brows: { a: -4, dy: 0.02 }, mouth: { kind: 'toothy', w: 0.4, h: 0.15 } },
  skull: { eyes: { state: 'socket' }, brows: false, mouth: { kind: 'skullTeeth', w: 0.3, h: 0.09 }, nose: true },
  fangs: { eyes: { lid: 'angry', lidAmt: 0.3 }, brows: { a: 26, dy: -0.02 }, mouth: { kind: 'fangs', w: 0.3 } },
  zombie: { eyes: { l: { state: 'white', scale: 1.15, pupil: 0.2 }, r: { scale: 0.7 } }, brows: { l: { a: -10, dy: 0.06 }, r: { a: 15 } }, mouth: { kind: 'wavy', w: 0.26 } },
  // mouth-only shapes (used alone = neutral eyes)
  talk_a: { mouth: { kind: 'talkA', w: 0.21, h: 0.15 } },
  talk_o: { mouth: { kind: 'O', w: 0.12, h: 0.14 } },
};
EXPRESSIONS.yell = EXPRESSIONS.shout;
EXPRESSIONS.happy_closed = EXPRESSIONS.happy;
EXPRESSIONS.content_closed_eyes = EXPRESSIONS.content;
EXPRESSIONS.big_shock = EXPRESSIONS.googly_shock;
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);

export function parseExpression(name = 'neutral') {
  const [base, mouthName] = String(name).split('+');
  const b = EXPRESSIONS[base];
  if (!b) throw new Error(`unknown face expression "${base}" (known: ${EXPRESSION_NAMES.join(', ')})`);
  const e = b.eyes ? b : { ...EXPRESSIONS.neutral, mouth: b.mouth };
  if (mouthName) {
    const m = EXPRESSIONS[mouthName]?.mouth;
    if (!m) throw new Error(`unknown mouth "${mouthName}" in "${name}"`);
    return { ...e, mouth: { ...m, dx: e.mouth?.dx } };
  }
  return e;
}
export const hasOpenEyes = (e) => !e.eyes?.state || e.eyes.state === 'white';

// ---------- drawing (face units: 1 = head face size, origin = head centre, y up) ----------
const side2key = (side) => (side > 0 ? 'l' : 'r'); // viewer-right (+x) is the character's left
const pick = (o, side) => (o ? { ...o, ...(o[side2key(side)] ?? {}) } : o);

function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(rx, 1e-4), Math.max(ry, 1e-4), rot, 0, Math.PI * 2); }
function stroke(g, w, color = INK) { g.lineWidth = w; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }

const EYE_SHAPES = { bean: [0.062, 0.1], round: [0.07, 0.08], dot: [0.042, 0.056], tall: [0.05, 0.115], wide: [0.08, 0.095], pupil: [0.085, 0.1] };

function drawEye(g, side, ex, st, L, blink) {
  ex = pick(ex, side);
  const sc = (ex.scale ?? 1) * st.size;
  const [rx0, ry0] = EYE_SHAPES[st.eyes] ?? EYE_SHAPES.bean;
  const rx = rx0 * sc, ry = ry0 * sc * (ex.squash ?? 1);
  const cx = side * L.eyeX + (ex.look ?? 0), cy = L.eyeY + (ex.dy ?? 0);
  const ink = st.ink;
  let state = ex.state ?? 'open';
  const lidA = ex.lid === 'angry' ? 22 : ex.lid === 'sad' ? -18 : 0;
  if (blink && (state === 'open' || state === 'white')) state = 'blink';
  g.save();
  switch (state) {
    case 'blink': {
      const slope = Math.tan((lidA * Math.PI) / 180) * side, dx = rx * 1.25;
      g.beginPath(); g.moveTo(cx - dx, cy - slope * dx - 0.01); g.quadraticCurveTo(cx, cy - 0.04, cx + dx, cy + slope * dx - 0.01);
      stroke(g, 0.036 * st.size, ink); break;
    }
    case 'happy': {
      g.beginPath(); g.moveTo(cx - rx * 1.15, cy - ry * 0.25); g.quadraticCurveTo(cx, cy + ry * 1.25, cx + rx * 1.15, cy - ry * 0.25);
      stroke(g, 0.042 * st.size, ink); break;
    }
    case 'closed': {
      g.beginPath(); g.moveTo(cx - rx * 1.2, cy - 0.005); g.quadraticCurveTo(cx, cy - ry * 0.55, cx + rx * 1.2, cy - 0.005);
      stroke(g, 0.036 * st.size, ink); break;
    }
    case 'closedSad': {
      g.beginPath(); g.moveTo(cx - rx * 1.2, cy - ry * 0.1 + side * 0.012); g.quadraticCurveTo(cx, cy + ry * 0.7, cx + rx * 1.2, cy - ry * 0.1 - side * 0.012);
      stroke(g, 0.04 * st.size, ink); break;
    }
    case 'squint': {
      const s = 0.055 * st.size;
      g.beginPath(); g.moveTo(cx + side * s, cy + s); g.lineTo(cx - side * s * 0.9, cy); g.lineTo(cx + side * s, cy - s);
      stroke(g, 0.04 * st.size, ink); break;
    }
    case 'x': {
      const s = 0.055 * st.size;
      g.beginPath(); g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy + s); g.moveTo(cx - s, cy + s); g.lineTo(cx + s, cy - s);
      stroke(g, 0.036 * st.size, ink); break;
    }
    case 'heart': {
      const s = 0.1 * st.size;
      g.beginPath(); g.moveTo(cx, cy - s * 0.85);
      g.bezierCurveTo(cx - s * 1.25, cy - s * 0.05, cx - s * 0.75, cy + s * 0.95, cx, cy + s * 0.35);
      g.bezierCurveTo(cx + s * 0.75, cy + s * 0.95, cx + s * 1.25, cy - s * 0.05, cx, cy - s * 0.85);
      g.fillStyle = '#e8304a'; g.fill(); stroke(g, 0.018, ink);
      ellipse(g, cx - s * 0.4, cy + s * 0.35, s * 0.16, s * 0.11, 0.6); g.fillStyle = '#fff'; g.fill(); break;
    }
    case 'white': {
      const wx = rx * 1.25, wy = ry * 1.15, pr = ex.pupil != null && ex.pupil < 0.3 ? ex.pupil : 0.26;
      const px = ex.pupil >= 0.3 ? cx + wx * (ex.pupil - 0.1) : cx + side * -0.004;
      g.save();
      if (ex.lid) { const yc = cy + wy * (1 - 2 * (ex.lidAmt ?? 0.3)); g.beginPath(); g.rect(cx - 1, cy - 1, 2, yc - cy + 1); g.clip(); }
      ellipse(g, cx, cy, wx, wy); g.fillStyle = '#fff'; g.fill();
      ellipse(g, px, cy - wy * 0.05, wx * pr, wx * pr * 1.1); g.fillStyle = ink; g.fill();
      ellipse(g, cx, cy, wx, wy); stroke(g, 0.03 * st.size, ink);
      g.restore();
      if (ex.lid) { const yc = cy + wy * (1 - 2 * (ex.lidAmt ?? 0.3)); g.beginPath(); g.moveTo(cx - wx * 1.05, yc); g.lineTo(cx + wx * 1.05, yc); stroke(g, 0.03 * st.size, ink); }
      break;
    }
    case 'socket': {
      ellipse(g, cx, cy - 0.01, rx * 1.55, ry * 1.05); g.fillStyle = ink; g.fill(); break;
    }
    default: { // open
      // lid clip: half-plane under a line through the eye (angry: inner end lower; sad: outer lower; half: flat)
      if (ex.lid) {
        const amt = ex.lidAmt ?? 0.3, t = (lidA * Math.PI) / 180;
        const yc = cy + ry * (1 - 2 * amt), slope = Math.tan(t) * side; // rises toward the outer side for angry
        g.beginPath(); g.moveTo(cx - 1, yc - slope * 1); g.lineTo(cx + 1, yc + slope * 1); g.lineTo(cx + 1, cy - 1); g.lineTo(cx - 1, cy - 1); g.closePath(); g.clip();
      }
      if (st.eyes === 'pupil') {
        ellipse(g, cx, cy, rx, ry); g.fillStyle = '#fff'; g.fill(); stroke(g, 0.026 * st.size, ink);
        ellipse(g, cx + (ex.look ?? 0) * 0.6, cy - ry * 0.12, rx * 0.5, ry * 0.55); g.fillStyle = ink; g.fill();
        if ((ex.glint ?? st.glint) > 0) { ellipse(g, cx - rx * 0.18, cy + ry * 0.12, rx * 0.17, rx * 0.17); g.fillStyle = '#fff'; g.fill(); }
      } else {
        ellipse(g, cx, cy, rx, ry); g.fillStyle = ink; g.fill();
        const gl = ex.glint ?? st.glint;
        if (gl > 0) { ellipse(g, cx - rx * 0.28, cy + ry * 0.4, rx * 0.34, rx * 0.36); g.fillStyle = '#fff'; g.fill(); }
        if (gl > 1) { ellipse(g, cx + rx * 0.32, cy - ry * 0.42, rx * 0.15, rx * 0.15); g.fillStyle = '#fff'; g.fill(); }
      }
      if (ex.lid) { // lid edge stroke so cut eyes read crisp
        const amt = ex.lidAmt ?? 0.3, t = (lidA * Math.PI) / 180, yc = cy + ry * (1 - 2 * amt), slope = Math.tan(t) * side;
        g.restore(); g.save();
        g.beginPath(); g.moveTo(cx - rx * 1.1, yc - slope * rx * 1.1); g.lineTo(cx + rx * 1.1, yc + slope * rx * 1.1); stroke(g, 0.024 * st.size, ink);
      }
      if (st.lashes) {
        const ox = cx + side * rx * 0.75, oy = cy + ry * 0.65;
        g.beginPath();
        for (let i = 0; i < 2; i++) { const a = 0.5 + i * 0.45; g.moveTo(ox - side * i * 0.02, oy - i * 0.012); g.lineTo(ox + side * Math.cos(a) * 0.05, oy + Math.sin(a) * 0.05 - i * 0.012); }
        stroke(g, 0.018, ink);
      }
    }
  }
  g.restore();
  return { top: cy + ry, rx, ry, cx, cy };
}

function drawBrow(g, side, b, st, L, eyeTop) {
  if (!b || st.brows === 'none') return;
  b = pick(b, side);
  const W = { thick: [0.052, 0.038], thin: [0.028, 0.022], bushy: [0.075, 0.045] }[st.brows] ?? [0.052, 0.038];
  const th = (b.thick ?? 1) * st.size;
  const len = 0.14 * st.size * (b.len ?? 1), a = ((b.a ?? 0) * Math.PI) / 180;
  const cx = side * L.eyeX, cy = Math.max(eyeTop, L.eyeY + 0.09 * st.size) + 0.065 + (b.dy ?? 0);
  const ix = cx - side * (len / 2) * Math.cos(a), iy = cy - (len / 2) * Math.sin(a);
  const ox = cx + side * (len / 2) * Math.cos(a), oy = cy + (len / 2) * Math.sin(a);
  const arch = (b.arch ?? 0.3) * 0.03;
  const mx = (ix + ox) / 2, my = (iy + oy) / 2 + arch;
  // tapered filled stroke: thick at the inner end
  const N = 14, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, x = (1 - u) ** 2 * ix + 2 * u * (1 - u) * mx + u * u * ox, y = (1 - u) ** 2 * iy + 2 * u * (1 - u) * my + u * u * oy;
    const dx = 2 * (1 - u) * (mx - ix) + 2 * u * (ox - mx), dy = 2 * (1 - u) * (my - iy) + 2 * u * (oy - my), l = Math.hypot(dx, dy) || 1;
    const w = (W[0] + (W[1] - W[0]) * u) * th / 2;
    top.push([x - (dy / l) * w, y + (dx / l) * w]); bot.push([x + (dy / l) * w, y - (dx / l) * w]);
  }
  g.beginPath(); g.moveTo(...top[0]); for (const p of top) g.lineTo(...p); for (const p of bot.reverse()) g.lineTo(...p); g.closePath();
  g.fillStyle = st.browColor ?? st.ink; g.fill();
  g.lineWidth = W[1] * th * 0.5; g.strokeStyle = st.browColor ?? st.ink; g.lineJoin = 'round'; g.stroke();
}

// Closed mouth shapes are strokes; open shapes are filled ink with an inset red interior (+ teeth / tongue).
function mouthPath(g, kind, w, h) {
  g.beginPath();
  switch (kind) {
    case 'D': g.moveTo(-w / 2, h * 0.32); g.quadraticCurveTo(0, h * 0.12, w / 2, h * 0.32); g.bezierCurveTo(w * 0.42, -h * 0.9, -w * 0.42, -h * 0.9, -w / 2, h * 0.32); break;
    case 'grin': g.moveTo(-w / 2, h * 0.38); g.quadraticCurveTo(0, h * 0.2, w / 2, h * 0.38); g.bezierCurveTo(w * 0.4, -h * 0.75, -w * 0.4, -h * 0.75, -w / 2, h * 0.38); break;
    case 'evil': g.moveTo(-w / 2, h * 0.75); g.quadraticCurveTo(0, h * 0.05, w / 2, h * 0.75); g.bezierCurveTo(w * 0.3, -h * 0.75, -w * 0.3, -h * 0.75, -w / 2, h * 0.75); break;
    case 'talkA': g.moveTo(-w / 2, h * 0.25); g.quadraticCurveTo(0, h * 0.42, w / 2, h * 0.25); g.bezierCurveTo(w * 0.45, -h * 0.75, -w * 0.45, -h * 0.75, -w / 2, h * 0.25); break;
    case 'wail': g.moveTo(-w / 2, -h * 0.4); g.bezierCurveTo(-w * 0.4, h * 0.85, w * 0.4, h * 0.85, w / 2, -h * 0.4); g.quadraticCurveTo(0, -h * 0.2, -w / 2, -h * 0.4); break;
    case 'shout': {
      const tw = w / 2, bw = w * 0.36, r = h * 0.25;
      g.moveTo(-tw + r, h / 2); g.lineTo(tw - r, h / 2); g.quadraticCurveTo(tw, h / 2, tw - r * 0.3, h / 2 - r);
      g.lineTo(bw, -h / 2 + r); g.quadraticCurveTo(bw - r * 0.2, -h / 2, bw - r, -h / 2); g.lineTo(-bw + r, -h / 2);
      g.quadraticCurveTo(-bw + r * 0.2, -h / 2, -bw, -h / 2 + r); g.lineTo(-tw + r * 0.3, h / 2 - r); g.quadraticCurveTo(-tw, h / 2, -tw + r, h / 2); break;
    }
    case 'grimace': case 'grit': g.roundRect(-w / 2, -h / 2, w, h, h * 0.42); break;
    case 'toothy': g.moveTo(-w / 2, h * 0.45); g.quadraticCurveTo(0, h * 0.25, w / 2, h * 0.45); g.bezierCurveTo(w * 0.42, -h * 0.85, -w * 0.42, -h * 0.85, -w / 2, h * 0.45); break;
    default: g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); // 'O'
  }
  g.closePath();
}

function drawMouth(g, m, st, L) {
  if (!m) return;
  const ink = st.ink, lw = (st.mouth === 'thin' ? 0.028 : 0.04) * st.size;
  const w = (m.w ?? 0.25) * st.size, h = (m.h ?? 0.14) * st.size;
  g.save(); g.translate(m.dx ?? 0, L.mouthY);
  switch (m.kind) {
    case 'curve': { const k = (m.k ?? 0.06) * st.size; g.beginPath(); g.moveTo(-w / 2, k / 2); g.quadraticCurveTo(0, k / 2 - 2 * k, w / 2, k / 2); stroke(g, lw, ink); break; }
    case 'smirk': g.beginPath(); g.moveTo(-w / 2, -0.004); g.quadraticCurveTo(w * 0.18, -0.05 * st.size, w / 2, 0.05 * st.size); stroke(g, lw, ink); break;
    case 'wavy': { g.beginPath(); for (let i = 0; i <= 24; i++) { const x = -w / 2 + (w * i) / 24; g[i ? 'lineTo' : 'moveTo'](x, 0.016 * Math.sin((i / 24) * Math.PI * 3)); } stroke(g, lw, ink); break; }
    case 'fangs': {
      const k = 0.05 * st.size; g.beginPath(); g.moveTo(-w / 2, k / 2); g.quadraticCurveTo(0, k / 2 - 2 * k, w / 2, k / 2); stroke(g, lw, ink);
      for (const s2 of [-1, 1]) { const x = s2 * w * 0.28, y = -0.012; g.beginPath(); g.moveTo(x - 0.028, y); g.lineTo(x + 0.028, y + 0.004 * s2); g.lineTo(x, y - 0.075); g.closePath(); g.fillStyle = '#fff'; g.fill(); stroke(g, 0.012, ink); }
      break;
    }
    case 'skullTeeth': {
      g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h * 0.2); g.fillStyle = '#fff'; g.fill(); stroke(g, 0.022, ink);
      g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); for (let i = 1; i < 6; i++) { const x = -w / 2 + (w * i) / 6; g.moveTo(x, -h / 2); g.lineTo(x, h / 2); } stroke(g, 0.014, ink);
      break;
    }
    case 'tongue': {
      g.beginPath(); g.moveTo(-w / 2, 0.01); g.lineTo(w / 2, -0.01); stroke(g, lw, ink);
      g.beginPath(); g.moveTo(w * 0.05, -0.005); g.lineTo(w * 0.05, -0.06); g.arc(w * 0.17, -0.06, w * 0.12, Math.PI, 0, false); g.lineTo(w * 0.29, -0.012);
      g.fillStyle = TONGUE; g.fill(); stroke(g, 0.02, ink);
      g.beginPath(); g.moveTo(w * 0.17, -0.02); g.lineTo(w * 0.17, -0.08); stroke(g, 0.012, '#c4454a'); break;
    }
    default: {
      const b = 0.022 * st.size;
      mouthPath(g, m.kind, w, h); g.fillStyle = ink; g.fill(); g.lineWidth = b * 0.6; g.strokeStyle = ink; g.lineJoin = 'round'; g.stroke();
      const iw = Math.max(0.01, w - 2.2 * b), ih = Math.max(0.01, h - 2.2 * b);
      g.save(); mouthPath(g, m.kind, iw, ih); g.clip();
      if (m.kind === 'grimace' || m.kind === 'grit' || m.kind === 'toothy') {
        g.fillStyle = TEETH; g.fillRect(-w, -h, 2 * w, 2 * h);
        g.beginPath(); g.moveTo(-w, 0); g.lineTo(w, 0);
        const n = m.kind === 'grit' ? 5 : m.kind === 'toothy' ? 8 : 7;
        for (let i = 1; i < n; i++) { const x = -iw / 2 + (iw * i) / n; g.moveTo(x, -h); g.lineTo(x, h); }
        stroke(g, 0.011 * st.size, '#3a3030');
      } else {
        g.fillStyle = RED; g.fillRect(-w, -h, 2 * w, 2 * h);
        g.fillStyle = DEEP; ellipse(g, 0, ih * 0.5, iw * 0.6, ih * 0.35); g.fill();
        const teeth = { grin: 0.5, D: 0.18, evil: 0.42, shout: 0.2, talkA: 0.16 }[m.kind] ?? 0;
        if (teeth) {
          const top = { grin: ih * 0.32, D: ih * 0.26, evil: ih * 0.72, shout: ih / 2, talkA: ih * 0.32 }[m.kind];
          g.fillStyle = TEETH; g.fillRect(-w, top - ih * teeth, 2 * w, ih * 2);
          if (m.kind === 'evil') { g.fillStyle = RED; g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(-iw / 2 + (iw * i) / 8, top - ih * teeth - (i % 2 ? 0 : ih * 0.12)); g.lineTo(iw, -h); g.lineTo(-iw, -h); g.fill(); }
        }
        if (m.kind !== 'grin' && m.kind !== 'evil') { ellipse(g, 0, -ih * 0.42, iw * 0.32, ih * 0.26); g.fillStyle = TONGUE; g.fill(); }
      }
      g.restore();
    }
  }
  g.restore();
}

function drawExtras(e, g, st, L, eyes) {
  if (e.blush) for (const s of [-1, 1]) { ellipse(g, s * (L.eyeX + 0.075), L.eyeY - 0.14, 0.075, 0.035); g.fillStyle = 'rgba(255,96,120,0.42)'; g.fill(); }
  if (st.freckles) { g.fillStyle = 'rgba(130,70,40,0.55)'; for (const s of [-1, 1]) for (const [dx, dy] of [[0, 0], [0.03, -0.015], [-0.025, -0.02]]) { ellipse(g, s * (L.eyeX + 0.05 + dx), L.eyeY - 0.13 + dy, 0.009, 0.009); g.fill(); } }
  if (e.tears) for (const ey of eyes) {
    const x = ey.cx * 1.18, y0 = ey.cy - ey.ry * 0.6;
    g.beginPath(); g.roundRect(x - 0.03, -0.75, 0.06, y0 + 0.75, 0.03); g.fillStyle = TEAR; g.fill();
    g.beginPath(); g.roundRect(x - 0.008, -0.75, 0.016, y0 + 0.73, 0.008); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
    ellipse(g, x, y0, 0.045, 0.03); g.fillStyle = TEAR; g.fill();
  }
  if (e.nose) { g.beginPath(); g.moveTo(0, L.eyeY - 0.08); g.lineTo(-0.035, L.eyeY - 0.15); g.lineTo(0.035, L.eyeY - 0.15); g.closePath(); g.fillStyle = st.ink; g.fill(); }
  if (e.sweat) {
    const x = 0.36, y = L.eyeY + 0.2;
    g.beginPath(); g.moveTo(x, y + 0.075); g.bezierCurveTo(x + 0.045, y + 0.01, x + 0.04, y - 0.04, x, y - 0.04); g.bezierCurveTo(x - 0.04, y - 0.04, x - 0.045, y + 0.01, x, y + 0.075);
    g.fillStyle = '#8fd8ff'; g.fill(); stroke(g, 0.012, '#2a6f9a');
    ellipse(g, x - 0.013, y - 0.012, 0.01, 0.016); g.fillStyle = '#fff'; g.fill();
  }
  if (e.vein) {
    g.save(); g.translate(0.32, L.eyeY + 0.25); g.rotate(0.2);
    g.beginPath();
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.moveTo(a * 0.012, b * 0.045); g.quadraticCurveTo(a * 0.012, b * 0.012, a * 0.045, b * 0.012); }
    stroke(g, 0.016, '#e0262a'); g.restore();
  }
}

export function drawFace(g, exprName, style, blink = false) {
  const st = resolveStyle(style), e = parseExpression(exprName);
  const L = { eyeX: 0.2 * st.spacing, eyeY: 0.06, mouthY: -0.215 };
  const eyes = [-1, 1].map((s) => drawEye(g, s, e.eyes ?? {}, st, L, blink));
  [-1, 1].forEach((s, i) => drawBrow(g, s, e.brows, st, L, eyes[i].top));
  drawMouth(g, e.mouth, st, L);
  drawExtras(e, g, st, L, eyes);
}

// ---------- head textures ----------
const makeCanvas = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
const texCache = new Map();

// Draws skin + face for a head of dims {r,h,fillet} into an existing 2D context region (used by crowd atlases too).
export function paintHead(g, x0, y0, W, H, head, skin, expr, style, blink) {
  g.save();
  g.beginPath(); g.rect(x0, y0, W, H); g.clip();
  g.fillStyle = skin; g.fillRect(x0, y0, W, H);
  const Fu = Math.min(2 * head.r, head.h);
  const pxX = W / (head.r * FACE_ARC), pxY = H / head.h;
  g.setTransform(pxX * Fu, 0, 0, -pxY * Fu, x0 + W / 2, y0 + H / 2);
  drawFace(g, expr, style, blink);
  g.restore();
}

export function faceTexture({ head, skin, expr = 'neutral', style, blink = false, width = 1536 }) {
  const key = [skin, JSON.stringify(style ?? null), expr, blink, width, head.r, head.h].join('|');
  let tex = texCache.get(key);
  if (!tex) {
    const W = width, H = Math.round((width * head.h) / (head.r * FACE_ARC) / 4) * 4;
    const c = makeCanvas(W, H), g = c.getContext('2d');
    paintHead(g, 0, 0, W, H, head, skin, expr, style, blink);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    texCache.set(key, tex);
  }
  return tex;
}
