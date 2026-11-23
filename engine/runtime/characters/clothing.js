// Canvas-generated classic shirt/pants textures (catalog style: flat print on the boxes with baked folds/shading and
// fabric grain), painted into the rig's 8x8-stud body atlas (rig.js RECTS). Original designs only.
//
// spec.shirt: { pattern, color, color2, inner, sleeves: 'long'|'short'|'none', texture: 'cotton'|'knit'|'denim'|'fleece'|'none',
//               collar: 'round'|'v'|'shirt'|'none', buttons, pocket, print: 'star'|'heart'|'bolt'|'smile'|'planet'|'paw'|'flame'|
//               'bib'|'text'|..., printColor, text, gradient: color, tuck, suspenders: color, tie: color, cardigan }
//   patterns: solid tshirt hoodie jacket zip suit waistcoat hivis suspenders knit sweater cardigan plaid stripes dress skeleton
//   torn: true (zombie rips; also on pants)
// spec.pants: { pattern: 'plain'|'jeans'|'shorts'|'skirt'|'plaid'|'cargo'|'track'|'overalls'|'suit', color, color2,
//               belt: color|true, shoes: false|color|{ style: 'sneaker'|'boot'|'shoe', color, sole } }
// spec.skin: name (SKIN) or hex; spec.torsoColor for shirtless torsos.
import * as THREE from 'three';
import { rng } from '../core/math.js';
import { RECTS, ATLAS_UNITS } from './rig.js';

// Common avatar skin tones (BrickColor-style values).
export const SKIN = {
  yellow: '#f5cd30', 'pastel-yellow': '#fdea8d', light: '#eab892', 'light-orange': '#eab892', pale: '#f6dcc6',
  nougat: '#cc8e69', 'pastel-brown': '#ffcc99', tan: '#d39f74', brown: '#7c5c46', 'reddish-brown': '#694028',
  dark: '#4f3324', white: '#f2f2f2', grey: '#a3a2a5', green: '#7fbf6a', blue: '#7fb2e5',
};
export const SKIN_LIST = ['light', 'nougat', 'pastel-brown', 'tan', 'brown', 'reddish-brown', 'pale', 'pastel-yellow', 'yellow'];
export const skinColor = (spec = {}) => spec.skinColor ?? SKIN[spec.skin] ?? spec.skin ?? SKIN.light;

const C = (c) => new THREE.Color(c);
const hex = (c) => '#' + c.getHexString();
const shadeHex = (c, k) => hex(C(c).multiplyScalar(k));
const mixHex = (a, b, u) => hex(C(a).lerp(C(b), u));
const lum = (c) => { const x = C(c); return 0.3 * x.r + 0.59 * x.g + 0.11 * x.b; };

const makeCanvas = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

// ---------- fabric tiles (cached per ppu) ----------
const tileCache = new Map();
function tile(kind, ppu) {
  const key = kind + ppu;
  if (tileCache.has(key)) return tileCache.get(key);
  const r = rng(kind.length * 977 + 13);
  const size = { grain: 96, knit: 0, denim: 0, fleece: 128, rib: 0 }[kind];
  let c;
  if (kind === 'knit') {
    const sx = Math.max(6, Math.round(0.1 * ppu)), sy = Math.max(5, Math.round(0.085 * ppu));
    c = makeCanvas(sx * 4, sy * 4); const g = c.getContext('2d');
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const x = i * sx + sx / 2 + (s * sx) / 4.2, y = j * sy + sy / 2;
      const gr = g.createLinearGradient(x - sx / 4, y - sy / 2, x + sx / 4, y + sy / 2);
      gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(1, '#8a8a8a');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, sx * 0.24, sy * 0.62, s * 0.55, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === 'denim') {
    const p = Math.max(3, Math.round(0.03 * ppu)); c = makeCanvas(p * 8, p * 8); const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, c.width, c.height);
    g.lineWidth = p * 0.45;
    for (let i = -8; i < 16; i++) { g.strokeStyle = i % 2 ? '#9a9a9a' : '#686868'; g.beginPath(); g.moveTo(i * p, 0); g.lineTo(i * p + c.height, c.height); g.stroke(); }
    const id = g.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < id.data.length; i += 4) { const n = (r() - 0.5) * 50; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    g.putImageData(id, 0, 0);
  } else if (kind === 'rib') {
    const p = Math.max(3, Math.round(0.045 * ppu)); c = makeCanvas(p * 2, p * 2); const g = c.getContext('2d');
    g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, c.width, c.height);
    const gr = g.createLinearGradient(0, 0, p, 0); gr.addColorStop(0, '#707070'); gr.addColorStop(0.5, '#b4b4b4'); gr.addColorStop(1, '#707070');
    g.fillStyle = gr; g.fillRect(0, 0, p, c.height); g.fillRect(p, 0, p, c.height);
  } else {
    c = makeCanvas(size, size); const g = c.getContext('2d'), id = g.createImageData(size, size);
    const amp = kind === 'fleece' ? 26 : 34;
    for (let i = 0; i < id.data.length; i += 4) { const n = 128 + (r() - 0.5) * amp; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    if (kind === 'fleece') { g.filter = 'blur(1.2px)'; g.drawImage(c, 0, 0); g.filter = 'none'; }
  }
  tileCache.set(key, c);
  return c;
}

// ---------- painter context ----------
function makePainter(g, ppu) {
  const P = {
    g, ppu,
    rect(x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); },
    clip(x, y, w, h, fn) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); fn(); g.restore(); },
    texture(kind, x, y, w, h, alpha = 0.6, op = 'overlay') {
      if (!kind || kind === 'none') return;
      const pat = g.createPattern(tile(kind, ppu), 'repeat');
      pat.setTransform(new DOMMatrix([1 / ppu, 0, 0, 1 / ppu, 0, 0]));
      g.save(); g.globalCompositeOperation = op; g.globalAlpha = alpha; g.fillStyle = pat; g.fillRect(x, y, w, h); g.restore();
    },
    // soft fold / highlight stroke (baked shading)
    fold(pts, width, alpha, light = false) {
      g.save(); g.filter = `blur(${Math.max(1, width * ppu * 0.6).toFixed(1)}px)`;
      g.globalAlpha = alpha; g.strokeStyle = light ? '#ffffff' : '#000000'; g.lineWidth = width; g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      if (pts.length === 6) g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else g.lineTo(pts[2], pts[3]);
      g.stroke(); g.restore();
    },
    vgrad(x, y, w, h, top, bottom) { // multiply-like darkening gradient
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    },
    edges(x, y, w, h, a = 0.16) {
      for (const [x0, x1] of [[x, x + Math.min(0.18, w * 0.2)], [x + w, x + w - Math.min(0.18, w * 0.2)]]) {
        const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
      }
    },
    stitch(x0, y0, x1, y1, color, width = 0.016, dash = 0.05) {
      g.save(); g.setLineDash([dash, dash * 0.8]); g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
    },
    line(x0, y0, x1, y1, color, width) { g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); },
    poly(pts, color, strokeColor, sw = 0.025) {
      g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.closePath();
      if (color) { g.fillStyle = color; g.fill(); }
      if (strokeColor) { g.strokeStyle = strokeColor; g.lineWidth = sw; g.lineJoin = 'round'; g.stroke(); }
    },
    button(x, y, r, color) {
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = color; g.fill();
      g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = r * 0.25; g.stroke();
    },
    text(str, x, y, size, color, font = 'Arial Black, Arial, sans-serif', strokeColor) {
      g.save(); g.translate(x, y); g.scale(0.01, 0.01); g.font = `900 ${size * 100}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (strokeColor) { g.lineWidth = size * 14; g.strokeStyle = strokeColor; g.lineJoin = 'round'; g.strokeText(str, 0, 0); }
      g.fillStyle = color; g.fillText(str, 0, 0); g.restore();
    },
  };
  return P;
}

// cloth fill: colour (or vertical gradient) + fabric + standard shading for a face region
function cloth(P, f, x, y, w, h, color, S = {}) {
  const g = P.g;
  if (S.gradient) {
    const H = f.torso ? 2 : 2; // gradient runs over the garment height
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, color); gr.addColorStop(1, S.gradient);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  } else P.rect(x, y, w, h, color);
  const tex = S.texture ?? 'cotton';
  if (tex === 'knit') { P.texture('knit', x, y, w, h, 0.85); P.texture('grain', x, y, w, h, 0.4); }
  else if (tex === 'denim') { P.texture('denim', x, y, w, h, 0.7); }
  else if (tex === 'fleece') { P.texture('fleece', x, y, w, h, 0.55, 'soft-light'); P.texture('grain', x, y, w, h, 0.25); }
  else if (tex !== 'none') P.texture('grain', x, y, w, h, 0.32);
  // light from above, darker hem, rounded-edge falloff
  P.vgrad(x, y, w, h, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.14)');
  if (f.facing !== 'top' && f.facing !== 'bottom') P.edges(x, y, w, h, 0.14);
}

// standard folds per face
function folds(P, f, y0, y1, k = 1) {
  const { w } = f;
  if (f.torso && (f.facing === 'front' || f.facing === 'back')) {
    P.fold([0.06, 0.32, 0.3, 0.55, 0.42, 0.85], 0.06, 0.18 * k);
    P.fold([w - 0.06, 0.32, w - 0.3, 0.55, w - 0.42, 0.85], 0.06, 0.18 * k);
    P.fold([0.5, y1 - 0.42, 1, y1 - 0.34, 1.5, y1 - 0.42], 0.05, 0.12 * k);
    P.fold([0.35, 0.18, 1.0, 0.1, 1.65, 0.18], 0.08, 0.1 * k, true);
  } else if (f.torso && (f.facing === 'left' || f.facing === 'right')) {
    P.fold([0.5, 0.25, 0.45, 1.0, 0.5, y1 - 0.2], 0.06, 0.12 * k);
  } else if (f.arm && f.facing !== 'top' && f.facing !== 'bottom') {
    const m = Math.min(y1 - 0.25, 1.05);
    if (y1 - y0 > 0.9) { P.fold([0.15, m - 0.06, 0.5, m + 0.02, 0.85, m - 0.08], 0.04, 0.22 * k); P.fold([0.25, m + 0.14, 0.55, m + 0.2, 0.8, m + 0.12], 0.035, 0.16 * k); }
    P.fold([0.2, y0 + 0.12, 0.5, y0 + 0.06, 0.8, y0 + 0.12], 0.07, 0.1 * k, true);
  } else if (f.leg && f.facing !== 'top' && f.facing !== 'bottom') {
    if (y1 - y0 > 1.2) { P.fold([0.18, 0.98, 0.5, 1.05, 0.82, 0.95], 0.04, 0.2 * k); P.fold([0.25, 1.12, 0.5, 1.17, 0.75, 1.1], 0.03, 0.14 * k); }
    if (f.facing === 'inner') P.fold([0.5, 0.0, 0.45, 0.3, 0.5, 0.55], 0.08, 0.18 * k);
    P.fold([0.25, y1 - 0.12, 0.5, y1 - 0.08, 0.75, y1 - 0.14], 0.04, 0.16 * k);
  }
}

// ---------- prints ----------
function drawPrint(P, S, cx, cy, s) {
  const g = P.g, col = S.printColor ?? (lum(S.color) > 0.55 ? '#1b1b1b' : '#ffffff'), kind = S.print;
  const star = (x, y, R, r, n = 5) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r : R; pts.push([x + q * Math.cos(a), y + q * Math.sin(a)]); } return pts; };
  g.save();
  switch (kind) {
    case 'star': P.poly(star(cx, cy, s * 0.42, s * 0.18), col, shadeHex(col, 0.6), 0.02); break;
    case 'heart': g.beginPath(); g.moveTo(cx, cy + s * 0.32); g.bezierCurveTo(cx - s * 0.55, cy - s * 0.05, cx - s * 0.3, cy - s * 0.45, cx, cy - s * 0.18); g.bezierCurveTo(cx + s * 0.3, cy - s * 0.45, cx + s * 0.55, cy - s * 0.05, cx, cy + s * 0.32); g.fillStyle = S.printColor ?? '#e8304a'; g.fill(); break;
    case 'bolt': P.poly([[cx + s * 0.08, cy - s * 0.45], [cx - s * 0.25, cy + s * 0.05], [cx - s * 0.02, cy + s * 0.05], [cx - s * 0.1, cy + s * 0.45], [cx + s * 0.25, cy - s * 0.08], [cx + s * 0.02, cy - s * 0.08]], S.printColor ?? '#ffd21f', '#1b1b1b', 0.02); break;
    case 'smile': {
      g.beginPath(); g.arc(cx, cy, s * 0.36, 0, Math.PI * 2); g.fillStyle = S.printColor ?? '#ffd21f'; g.fill(); g.lineWidth = 0.025; g.strokeStyle = '#1b1b1b'; g.stroke();
      g.fillStyle = '#1b1b1b'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(cx + d * s * 0.12, cy - s * 0.08, s * 0.035, s * 0.07, 0, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(cx, cy + s * 0.02, s * 0.2, 0.3, Math.PI - 0.3); g.lineWidth = 0.03; g.stroke(); break;
    }
    case 'planet': g.beginPath(); g.arc(cx, cy, s * 0.24, 0, Math.PI * 2); g.fillStyle = S.printColor ?? '#ff9f2e'; g.fill(); g.beginPath(); g.ellipse(cx, cy, s * 0.46, s * 0.12, -0.35, 0, Math.PI * 2); g.lineWidth = 0.04; g.strokeStyle = col; g.stroke(); break;
    case 'paw': g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy + s * 0.1, s * 0.2, s * 0.16, 0, 0, Math.PI * 2); g.fill(); for (const [dx, dy] of [[-0.24, -0.1], [-0.09, -0.24], [0.09, -0.24], [0.24, -0.1]]) { g.beginPath(); g.ellipse(cx + dx * s, cy + dy * s, s * 0.07, s * 0.09, 0, 0, Math.PI * 2); g.fill(); } break;
    case 'flame': P.poly([[cx, cy - s * 0.45], [cx + s * 0.28, cy + s * 0.05], [cx + s * 0.18, cy + s * 0.35], [cx - s * 0.18, cy + s * 0.35], [cx - s * 0.28, cy + s * 0.05], [cx - s * 0.08, cy - s * 0.1]], '#ff6a1a', '#c2290f', 0.02); P.poly([[cx, cy - s * 0.1], [cx + s * 0.12, cy + s * 0.2], [cx - s * 0.12, cy + s * 0.2]], '#ffd23a'); break;
    case 'circle': g.beginPath(); g.arc(cx, cy, s * 0.36, 0, Math.PI * 2); g.lineWidth = 0.05; g.strokeStyle = col; g.stroke(); P.text(S.text ?? 'A', cx, cy + s * 0.02, s * 0.36, col); break;
    case 'stripe': P.rect(0, cy - s * 0.12, 2, s * 0.24, S.printColor ?? '#ffffff'); break;
    case 'bib': g.beginPath(); g.roundRect(cx - s * 0.36, cy - s * 0.3, s * 0.72, s * 0.6, 0.04); g.fillStyle = '#fafafa'; g.fill(); g.lineWidth = 0.02; g.strokeStyle = '#333'; g.stroke(); P.text(String(S.text ?? '27'), cx, cy + s * 0.03, s * 0.36, S.printColor ?? '#1b1b1b'); break;
    case 'text': P.text(String(S.text ?? 'COOL'), cx, cy, s * (S.textSize ?? 0.3), col, undefined, S.printStroke); break;
    default: break;
  }
  g.restore();
}

// ---------- shirts ----------
const SLEEVES = { waistcoat: 'long', skeleton: 'full', solid: 'none', tshirt: 'short', stripes: 'short', dress: 'short', hoodie: 'long', jacket: 'long', zip: 'long', suit: 'long', hivis: 'long', suspenders: 'long', knit: 'long', sweater: 'long', cardigan: 'long', plaid: 'long' };
const HAND = 0.3;

function shirtFace(P, f, S) {
  const { w, h } = f, pat = S.pattern;
  const end = f.arm ? ({ long: h - HAND, short: 0.72, none: 0, full: h + 0.1 }[S.sleeves]) : (S.tuck ? h - 0.3 : h);
  if (f.arm && f.facing === 'bottom' && S.sleeves !== 'full') return;
  if (f.arm && f.facing === 'top' && S.sleeves === 'none') return;
  if (end <= 0) return;
  const top = f.facing === 'top' || f.facing === 'bottom';
  const y1 = top ? h : end, base = pat === 'hivis' || pat === 'waistcoat' ? (S.inner ?? (pat === 'hivis' ? '#262626' : '#f4f1e8')) : pat === 'skeleton' ? (S.color ?? '#151515') : S.color;
  const texture = S.texture ?? ({ knit: 'knit', sweater: 'knit', cardigan: 'knit', hoodie: 'fleece' }[pat] ?? 'cotton');
  P.clip(-0.1, -0.1, w + 0.2, y1 + 0.1, () => {
    cloth(P, f, -0.1, -0.1, w + 0.2, y1 + 0.2, base, { ...S, texture });
    if (pat === 'plaid') plaid(P, -0.1, -0.1, w + 0.2, y1 + 0.2, S);
    if (pat === 'stripes') for (let y = 0.1; y < y1; y += S.period ?? 0.36) P.rect(-0.1, y, w + 0.2, (S.period ?? 0.36) * 0.5, S.color2 ?? '#ffffff');
    if (!top) folds(P, f, 0, y1);
  });
  if (top) return;
  const rib = (x, y, ww, hh, color) => P.clip(x, y, ww, hh, () => { P.rect(x, y, ww, hh, color); P.texture('rib', x, y, ww, hh, 0.5); P.vgrad(x, y, ww, hh, 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)'); });
  // sleeve ends
  if (f.arm) {
    const cuffK = { hoodie: 1, knit: 1, sweater: 1, cardigan: 1, zip: 1, jacket: 1 }[pat];
    if (cuffK) rib(-0.1, end - 0.16, w + 0.2, 0.16, shadeHex(S.color, 0.85));
    else if (pat === 'suit') P.rect(-0.1, end - 0.07, w + 0.2, 0.07, '#f4f4f4');
    else P.fold([0, end - 0.03, w, end - 0.03], 0.03, 0.35);
    if (pat === 'hivis' && S.sleeves === 'long') P.fold([0, end - 0.03, w, end - 0.03], 0.03, 0.3);
    return;
  }
  // torso details
  const front = f.facing === 'front', back = f.facing === 'back', cx = w / 2;
  const ink = shadeHex(S.color, 0.55);
  if (pat === 'tshirt' || (pat === 'solid' && S.collar === 'round') || ((pat === 'knit' || pat === 'sweater') && S.collar !== 'v')) {
    if (front || back) { const d = front ? 0.16 : 0.07; P.g.save(); P.g.beginPath(); P.g.ellipse(cx, -0.02, 0.36, d + 0.07, 0, 0, Math.PI); P.g.ellipse(cx, -0.02, 0.36 - 0.07, d, 0, Math.PI, 0, true); P.g.fillStyle = shadeHex(S.color, 0.82); P.g.fill(); P.g.restore(); }
  }
  if ((pat === 'knit' || pat === 'sweater') && S.collar === 'v' && front) P.poly([[cx - 0.32, -0.02], [cx, 0.5], [cx + 0.32, -0.02], [cx + 0.2, -0.02], [cx, 0.36], [cx - 0.2, -0.02]], shadeHex(S.color, 0.8));
  if (pat === 'knit' || pat === 'sweater' || pat === 'cardigan' || pat === 'hoodie') rib(-0.1, h - 0.18, w + 0.2, 0.2, shadeHex(S.color, 0.85));
  if (pat === 'hoodie') {
    const lin = shadeHex(S.color, 0.7);
    if (front) {
      P.g.beginPath(); P.g.moveTo(cx - 0.62, -0.05); P.g.quadraticCurveTo(cx - 0.55, 0.5, cx, 0.52); P.g.quadraticCurveTo(cx + 0.55, 0.5, cx + 0.62, -0.05); P.g.lineTo(cx + 0.38, -0.05); P.g.quadraticCurveTo(cx + 0.3, 0.3, cx, 0.32); P.g.quadraticCurveTo(cx - 0.3, 0.3, cx - 0.38, -0.05); P.g.closePath();
      P.g.fillStyle = shadeHex(S.color, 1.08); P.g.fill(); P.g.lineWidth = 0.025; P.g.strokeStyle = lin; P.g.stroke();
      P.fold([cx - 0.5, 0.42, cx, 0.6, cx + 0.5, 0.42], 0.06, 0.25);
      const sc = S.color2 ?? '#f2f2f2';
      for (const d of [-0.13, 0.13]) { P.line(cx + d, 0.4, cx + d * 1.15, 0.95, sc, 0.035); P.rect(cx + d * 1.15 - 0.025, 0.93, 0.05, 0.09, shadeHex(sc, 0.75)); }
      const py = 1.18, ph = 0.52;
      P.poly([[cx - 0.5, py], [cx + 0.5, py], [cx + 0.66, py + ph], [cx - 0.66, py + ph]], shadeHex(S.color, 0.96), lin, 0.022);
      P.fold([cx - 0.5, py + 0.02, cx - 0.62, py + ph * 0.6], 0.035, 0.45); P.fold([cx + 0.5, py + 0.02, cx + 0.62, py + ph * 0.6], 0.035, 0.45);
      P.stitch(cx - 0.45, py + 0.05, cx + 0.45, py + 0.05, shadeHex(S.color, 0.75), 0.012, 0.035);
    } else if (back) {
      P.g.beginPath(); P.g.moveTo(cx - 0.55, -0.05); P.g.quadraticCurveTo(cx - 0.6, 0.75, cx, 0.8); P.g.quadraticCurveTo(cx + 0.6, 0.75, cx + 0.55, -0.05); P.g.closePath();
      P.g.fillStyle = shadeHex(S.color, 1.04); P.g.fill(); P.g.lineWidth = 0.025; P.g.strokeStyle = lin; P.g.stroke();
      P.fold([cx - 0.45, 0.7, cx, 0.86, cx + 0.45, 0.7], 0.07, 0.3); P.stitch(cx, 0, cx, 0.75, lin, 0.012, 0.035);
    }
  }
  if ((pat === 'jacket' || pat === 'zip') && (front || back)) {
    if (front && pat === 'jacket') {
      const inner = S.inner ?? '#f0f0f0';
      P.clip(cx - 0.24, -0.1, 0.48, h + 0.2, () => { cloth(P, f, cx - 0.3, -0.1, 0.6, h + 0.2, inner); if (S.print) drawPrint(P, { ...S, color: inner }, cx, 0.85, 0.5); });
      for (const d of [-1, 1]) { P.stitch(cx + d * 0.24, 0.25, cx + d * 0.24, h, '#9a9a9a', 0.03, 0.03); P.fold([cx + d * 0.27, 0, cx + d * 0.27, h], 0.04, 0.35); }
      for (const d of [-1, 1]) P.poly([[cx + d * 0.24, 0], [cx + d * 0.62, 0], [cx + d * 0.34, 0.42], [cx + d * 0.24, 0.32]], shadeHex(S.color, 0.9), ink, 0.02);
    } else if (front) {
      P.stitch(cx, 0.08, cx, h, '#a8a8a8', 0.035, 0.028); P.line(cx, 0.08, cx, h, 'rgba(0,0,0,0.25)', 0.012);
      P.g.beginPath(); P.g.roundRect(cx - 0.035, 0.12, 0.07, 0.17, 0.02); P.g.fillStyle = '#c9c9c9'; P.g.fill();
      P.rect(cx - 0.42, -0.02, 0.84, 0.12, shadeHex(S.color, 0.88));
    }
    if (front) for (const d of [-1, 1]) { P.line(cx + d * 0.42, 1.28, cx + d * 0.7, 1.4, shadeHex(S.color, 0.5), 0.03); }
    if (pat === 'jacket') rib(-0.1, h - 0.14, w + 0.2, 0.16, shadeHex(S.color, 0.85));
  }
  if (pat === 'suit' && front) {
    const shirt = S.inner ?? '#f6f6f6', tie = S.tie ?? '#b3202a';
    P.poly([[cx - 0.33, -0.02], [cx, 0.98], [cx + 0.33, -0.02]], shirt);
    P.poly([[cx - 0.07, 0.02], [cx + 0.07, 0.02], [cx + 0.05, 0.14], [cx - 0.05, 0.14]], shadeHex(tie, 0.85));
    P.poly([[cx - 0.05, 0.14], [cx + 0.05, 0.14], [cx + 0.1, 0.8], [cx, 0.92], [cx - 0.1, 0.8]], tie);
    P.line(cx - 0.02, 0.2, cx + 0.03, 0.75, 'rgba(255,255,255,0.18)', 0.02);
    for (const d of [-1, 1]) P.poly([[cx + d * 0.33, -0.02], [cx + d * 0.5, -0.02], [cx + d * 0.42, 0.35], [cx + d * 0.52, 0.42], [cx + d * 0.08, 1.02], [cx, 0.98]], shadeHex(S.color, 0.82), shadeHex(S.color, 0.5), 0.015);
    P.button(cx, 1.2, 0.04, shadeHex(S.color, 0.6)); P.button(cx, 1.5, 0.04, shadeHex(S.color, 0.6));
    P.line(cx + 0.45, 0.62, cx + 0.8, 0.62, shadeHex(S.color, 0.5), 0.025); P.poly([[cx + 0.5, 0.62], [cx + 0.58, 0.52], [cx + 0.66, 0.6], [cx + 0.74, 0.53], [cx + 0.78, 0.62]], '#ffffff');
    for (const d of [-1, 1]) P.line(cx + d * 0.45, 1.45, cx + d * 0.8, 1.45, shadeHex(S.color, 0.5), 0.025);
  }
  if (pat === 'hivis') {
    const v = S.color ?? '#d6ff2e', band = S.color2 ?? '#c4c8cc';
    const pip = shadeHex(v, 0.7);
    if (front) P.clip(-0.1, -0.1, w + 0.2, h + 0.2, () => {
      P.poly([[0.18, -0.1], [cx - 0.3, -0.1], [cx, 0.62], [cx + 0.3, -0.1], [w - 0.18, -0.1], [w + 0.1, 0.32], [w + 0.1, h + 0.1], [-0.1, h + 0.1], [-0.1, 0.32]], v, pip, 0.03);
    });
    else P.clip(-0.1, -0.1, w + 0.2, h + 0.2, () => P.rect(-0.1, back ? 0.0 : 0.25, w + 0.2, h + 0.2, v));
    P.clip(-0.1, -0.1, w + 0.2, h + 0.2, () => { P.texture('grain', -0.1, -0.1, w + 0.2, h + 0.2, 0.25); folds(P, f, 0, h, 0.8); P.edges(-0.1, -0.1, w + 0.2, h + 0.2, 0.1); });
    const refl = (x, y, ww, hh) => { P.rect(x, y, ww, hh, band); P.rect(x, y + hh * 0.38, ww, hh * 0.24, '#eff1f3'); P.rect(x, y, ww, hh * 0.1, shadeHex(band, 0.75)); P.rect(x, y + hh * 0.9, ww, hh * 0.1, shadeHex(band, 0.75)); };
    for (const y of [1.08, 1.52]) refl(-0.1, y, w + 0.2, 0.16);
    if (front) for (const x of [0.38, w - 0.52]) refl(x, -0.1, 0.14, 1.18);
    if (back) { refl(0.38, -0.1, 0.14, 1.2); refl(w - 0.52, -0.1, 0.14, 1.2); }
  }
  if (pat === 'dress') {
    const sk = S.color2 ?? S.color;
    P.clip(-0.1, 1.2, w + 0.2, h, () => { cloth(P, f, -0.1, 1.2, w + 0.2, h, sk, S); for (let x = 0.2; x < w; x += 0.32) P.fold([x, 1.3, x + 0.02, h], 0.04, 0.16); });
    P.rect(-0.1, 1.17, w + 0.2, 0.07, shadeHex(S.color, 0.75));
  }
  if (pat === 'waistcoat' && (front || back)) {
    if (front) {
      P.poly([[-0.1, -0.1], [cx - 0.3, -0.1], [cx, 0.72], [cx + 0.3, -0.1], [w + 0.1, -0.1], [w + 0.1, h + 0.1], [cx + 0.1, h + 0.1], [cx, h - 0.05], [cx - 0.1, h + 0.1], [-0.1, h + 0.1]], S.color, shadeHex(S.color, 0.55), 0.02);
      P.texture('grain', -0.1, -0.1, w + 0.2, h + 0.2, 0.3);
      for (let y = 0.95; y < h - 0.15; y += 0.28) P.button(cx, y, 0.04, S.buttonColor ?? '#d8b25a');
      for (const d of [-1, 1]) P.line(cx + d * 0.45, 1.35, cx + d * 0.75, 1.35, shadeHex(S.color, 0.5), 0.025);
      const tie = S.tie ?? '#efe3c4';
      P.poly([[cx - 0.14, 0.02], [cx + 0.14, 0.02], [cx + 0.07, 0.16], [cx + 0.12, 0.5], [cx, 0.62], [cx - 0.12, 0.5], [cx - 0.07, 0.16]], tie, shadeHex(tie, 0.7), 0.015);
    } else P.rect(-0.1, -0.1, w + 0.2, h + 0.2, shadeHex(S.color, 0.9));
    P.clip(-0.1, -0.1, w + 0.2, h + 0.2, () => folds(P, f, 0, h, 0.8));
  }
  if (pat === 'skeleton') bones(P, f);
  if (S.torn) torn(P, f, P.skin);
  // generic details
  if ((pat === 'plaid' || S.collar === 'shirt') && front) for (const d of [-1, 1]) P.poly([[cx, 0.05], [cx + d * 0.42, -0.02], [cx + d * 0.36, 0.22], [cx + d * 0.1, 0.24]], shadeHex(S.color, 1.08), shadeHex(S.color, 0.55), 0.02);
  if ((S.buttons ?? (pat === 'plaid' || pat === 'cardigan')) && front) {
    P.line(cx, 0.15, cx, h, shadeHex(S.color, 0.6), 0.02);
    for (let y = 0.4; y < h - 0.1; y += 0.42) P.button(cx + 0.06, y, 0.045, S.buttonColor ?? '#f1ece0');
  }
  if ((S.pocket ?? (pat === 'plaid' || pat === 'cardigan')) && front) {
    const px = cx + 0.38, py = 0.48;
    P.g.beginPath(); P.g.rect(px, py, 0.36, 0.38); P.g.lineWidth = 0.025; P.g.strokeStyle = shadeHex(S.color, 0.45); P.g.stroke();
    P.line(px, py + 0.08, px + 0.36, py + 0.08, shadeHex(S.color, 0.5), 0.02);
    if (pat === 'cardigan') P.button(px + 0.18, py + 0.1, 0.035, S.buttonColor ?? '#f1ece0');
  }
  if (S.print && front && pat !== 'jacket') drawPrint(P, S, cx, S.printY ?? 0.85, S.printSize ?? 0.95);
  if (S.suspenders || pat === 'suspenders') {
    const sc = typeof S.suspenders === 'string' ? S.suspenders : S.color2 ?? '#6e1b1b';
    if (front) for (const x of [0.5, w - 0.66]) { P.rect(x, -0.1, 0.16, h + 0.2, sc); P.line(x + 0.03, -0.1, x + 0.03, h, 'rgba(255,255,255,0.15)', 0.015); P.rect(x - 0.01, h - 0.42, 0.18, 0.1, '#c8c8c8'); }
    else if (back) { P.line(0.55, -0.1, w - 0.55, h + 0.1, sc, 0.16); P.line(w - 0.55, -0.1, 0.55, h + 0.1, sc, 0.16); }
    else if (f.facing === 'top') for (const x of [0.5, w - 0.66]) P.rect(x, -0.1, 0.16, h + 0.2, sc);
  }
}

function bones(P, f, color = '#f2f0e6') {
  const { w, h } = f, g = P.g, cx = w / 2;
  const bone = (x0, y0, x1, y1, t = 0.1) => { P.line(x0, y0, x1, y1, color, t); for (const [x, y] of [[x0, y0], [x1, y1]]) for (const d of [-1, 1]) { g.beginPath(); g.arc(x + d * t * 0.45, y, t * 0.55, 0, Math.PI * 2); g.fillStyle = color; g.fill(); } };
  if (f.torso && f.facing === 'front') { P.line(cx, 0.1, cx, h - 0.2, color, 0.12); for (let i = 0; i < 4; i++) { const y = 0.35 + i * 0.3; g.beginPath(); g.ellipse(cx, y, 0.62 - i * 0.05, 0.1, 0, Math.PI * 0.05, Math.PI * 0.95); g.lineWidth = 0.07; g.strokeStyle = color; g.stroke(); } P.poly([[cx - 0.4, h - 0.35], [cx + 0.4, h - 0.35], [cx + 0.25, h - 0.05], [cx - 0.25, h - 0.05]], color); }
  else if (f.torso && f.facing === 'back') { for (let y = 0.15; y < h - 0.1; y += 0.18) P.rect(cx - 0.08, y, 0.16, 0.12, color); }
  else if ((f.arm || f.leg) && f.facing !== 'top' && f.facing !== 'bottom') { bone(cx, 0.15, cx, h * 0.48, 0.1); bone(cx, h * 0.55, cx, h - 0.15, 0.1); }
}
function torn(P, f, skin) {
  if (f.facing === 'top' || f.facing === 'bottom') return;
  const r = rng((f.part.length * 13 + f.facing.length * 7) | 0);
  for (let k = 0; k < 2; k++) {
    const x = 0.2 + r() * (f.w - 0.4), y = 0.4 + r() * (f.h - 0.8), s = 0.12 + r() * 0.15, pts = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, q = s * (i % 2 ? 0.55 : 1); pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q * 1.3]); }
    P.poly(pts, skin, 'rgba(40,20,10,0.6)', 0.02);
  }
}

function plaid(P, x, y, w, h, S) {
  const g = P.g, c2 = S.color2 ?? shadeHex(S.color, 0.45), c3 = S.color3 ?? mixHex(S.color, '#ffffff', 0.6), p = S.period ?? 0.5;
  g.save(); g.globalAlpha = 0.45;
  for (let u = Math.floor(x / p) * p; u < x + w; u += p) { P.rect(u, y, p * 0.36, h, c2); }
  for (let v = Math.floor(y / p) * p; v < y + h; v += p) { P.rect(x, v, w, p * 0.36, c2); }
  g.globalAlpha = 0.6;
  for (let u = Math.floor(x / p) * p + p * 0.68; u < x + w; u += p) P.rect(u, y, 0.025, h, c3);
  for (let v = Math.floor(y / p) * p + p * 0.68; v < y + h; v += p) P.rect(x, v, w, 0.025, c3);
  g.restore();
}

// ---------- pants ----------
function shoeStyle(Pn) {
  if (Pn.shoes === false || Pn.shoes === 'none') return null;
  const d = { jeans: 'sneaker', shorts: 'sneaker', track: 'sneaker', skirt: 'shoe', suit: 'shoe', overalls: 'boot' }[Pn.pattern] ?? 'shoe';
  const s = typeof Pn.shoes === 'string' ? { color: Pn.shoes } : Pn.shoes ?? {};
  const style = s.style ?? d;
  const color = s.color ?? { sneaker: '#f2f2f2', boot: '#5a3b24', shoe: '#2a2626' }[style];
  return { style, color, sole: s.sole ?? (style === 'sneaker' ? '#ffffff' : shadeHex(color, 0.6)), accent: s.accent ?? '#d23a2a' };
}

function pantsFace(P, f, Pn, S) {
  const { w, h } = f, pat = Pn.pattern, color = Pn.color;
  const texture = Pn.texture ?? (pat === 'jeans' || pat === 'overalls' ? 'denim' : 'cotton');
  const fill = (x, y, ww, hh, col = color) => P.clip(x, y, ww, hh, () => { cloth(P, f, x - 0.1, y - 0.1, ww + 0.2, hh + 0.2, col, { texture }); if (pat === 'plaid') plaid(P, x - 0.1, y - 0.1, ww + 0.2, hh + 0.2, { color, color2: Pn.color2, period: 0.42 }); });
  if (f.torso) {
    if (f.facing === 'top') return;
    const y0 = f.facing === 'bottom' ? -0.1 : h - 0.32;
    if (pat === 'overalls') {
      if (f.facing === 'front') {
        const cx = w / 2; fill(-0.1, h - 0.3, w + 0.2, 0.4); fill(cx - 0.62, 0.62, 1.24, h);
        P.g.save(); P.g.beginPath(); P.g.rect(cx - 0.62, 0.62, 1.24, h); P.g.lineWidth = 0.02; P.g.strokeStyle = '#d9a441'; P.g.setLineDash([0.04, 0.03]); P.g.stroke(); P.g.restore();
        for (const d of [-1, 1]) { P.poly([[cx + d * 0.62, 0.66], [cx + d * 0.42, 0.66], [cx + d * 0.55, -0.1], [cx + d * 0.78, -0.1]], color); P.button(cx + d * 0.52, 0.72, 0.05, '#e3b23c'); }
        P.g.beginPath(); P.g.rect(cx - 0.25, 0.85, 0.5, 0.4); P.g.setLineDash([0.04, 0.03]); P.g.strokeStyle = '#d9a441'; P.g.lineWidth = 0.018; P.g.stroke(); P.g.setLineDash([]);
        P.texture('denim', cx - 0.62, -0.1, 1.24, h, 0.4);
      } else if (f.facing === 'back') { fill(-0.1, h - 0.45, w + 0.2, 0.6); P.line(0.4, -0.1, w - 0.6, h - 0.4, color, 0.18); P.line(w - 0.4, -0.1, 0.6, h - 0.4, color, 0.18); }
      else if (f.facing === 'bottom') fill(-0.1, -0.1, w + 0.2, h + 0.2);
      else fill(-0.1, h - 0.3, w + 0.2, 0.4);
      return;
    }
    const col = pat === 'skirt' ? Pn.color : color;
    fill(-0.1, y0, w + 0.2, h - y0 + 0.1, col);
    if (f.facing === 'front' && pat === 'jeans') { P.stitch(w / 2 + 0.06, y0 + 0.05, w / 2 + 0.06, h, '#d9a441', 0.014, 0.03); P.button(w / 2, y0 + 0.1, 0.035, '#b8b8b8'); }
    const belt = Pn.belt === true ? '#4b2f1c' : Pn.belt;
    if (belt && f.facing !== 'bottom') {
      P.rect(-0.1, y0 + 0.02, w + 0.2, 0.14, belt); P.line(-0.1, y0 + 0.04, w + 0.1, y0 + 0.04, 'rgba(255,255,255,0.12)', 0.012);
      if (f.facing === 'front') { P.g.beginPath(); P.g.roundRect(w / 2 - 0.1, y0, 0.2, 0.18, 0.02); P.g.lineWidth = 0.035; P.g.strokeStyle = '#d7d2c4'; P.g.stroke(); }
    }
    return;
  }
  // legs
  const shoe = shoeStyle(Pn);
  const cover = pat === 'shorts' ? 0.92 : pat === 'skirt' ? (Pn.length ?? 1.0) : h;
  if (f.facing === 'top') { fill(-0.1, -0.1, w + 0.2, h + 0.2); return; }
  if (f.facing === 'bottom') { P.rect(-0.1, -0.1, w + 0.2, h + 0.2, shoe ? shoe.sole : cover >= h ? color : P.skin); return; }
  if (pat === 'skirt') {
    fill(-0.1, -0.1, w + 0.2, cover + 0.1, Pn.color);
    for (let x = 0.15; x < w; x += 0.3) P.fold([x, 0, x + 0.04, cover], 0.04, 0.18);
    P.rect(-0.1, cover - 0.06, w + 0.2, 0.06, shadeHex(Pn.color, 0.75));
  } else {
    fill(-0.1, -0.1, w + 0.2, cover + 0.1);
    P.clip(-0.1, -0.1, w + 0.2, cover + 0.1, () => folds(P, f, 0, cover));
    if (pat === 'shorts') P.rect(-0.1, cover - 0.07, w + 0.2, 0.07, shadeHex(color, 0.78));
  }
  if (pat === 'jeans') {
    P.clip(-0.1, -0.1, w + 0.2, h, () => {
      if (f.facing === 'front') { const g = P.g, gr = g.createRadialGradient(w / 2, 0.6, 0.05, w / 2, 0.6, 0.6); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-0.1, 0, w + 0.2, 1.4); }
      if (f.facing === 'outer') { P.stitch(w / 2 - 0.04, 0, w / 2 - 0.04, h, '#d9a441', 0.014, 0.035); P.stitch(w / 2 + 0.04, 0, w / 2 + 0.04, h, '#d9a441', 0.014, 0.035); }
      if (f.facing === 'front') { const ox = f.isLeft ? w : 0; P.g.beginPath(); P.g.moveTo(Math.abs(ox - 0.05), 0); P.g.quadraticCurveTo(Math.abs(ox - 0.12), 0.28, Math.abs(ox - 0.5), 0.3); P.g.lineWidth = 0.02; P.g.strokeStyle = shadeHex(color, 0.5); P.g.stroke(); }
      if (f.facing === 'back') { P.g.save(); P.g.setLineDash([0.035, 0.025]); P.g.strokeStyle = '#d9a441'; P.g.lineWidth = 0.015; P.g.beginPath(); P.g.moveTo(0.2, 0.12); P.g.lineTo(0.8, 0.12); P.g.lineTo(0.78, 0.5); P.g.lineTo(0.5, 0.6); P.g.lineTo(0.22, 0.5); P.g.closePath(); P.g.stroke(); P.g.restore(); }
    });
    if (cover >= h && shoe) P.rect(-0.1, h - (shoe.style === 'boot' ? 0.62 : 0.38) - 0.1, w + 0.2, 0.1, mixHex(color, '#ffffff', 0.25));
  }
  if (pat === 'skeleton') bones(P, f);
  if (Pn.torn) torn(P, f, P.skin);
  if (pat === 'cargo' && f.facing === 'outer') { P.g.beginPath(); P.g.rect(0.18, 0.75, 0.64, 0.5); P.g.lineWidth = 0.025; P.g.strokeStyle = shadeHex(color, 0.55); P.g.stroke(); P.rect(0.15, 0.72, 0.7, 0.14, shadeHex(color, 0.9)); }
  if (pat === 'track' && f.facing === 'outer') { P.rect(0.32, -0.1, 0.1, h, Pn.color2 ?? '#ffffff'); P.rect(0.58, -0.1, 0.1, h, Pn.color2 ?? '#ffffff'); }
  if ((pat === 'suit' || pat === 'plain') && f.facing === 'front' && cover >= h) P.fold([w / 2, 0.1, w / 2, h - 0.3], 0.03, 0.12, true);
  if (shoe) shoeFace(P, f, shoe);
}

function shoeFace(P, f, s) {
  const { w, h } = f, H = s.style === 'boot' ? 0.62 : s.style === 'sneaker' ? 0.38 : 0.3, y = h - H;
  P.clip(-0.1, y, w + 0.2, H + 0.2, () => {
    P.rect(-0.1, y, w + 0.2, H + 0.2, s.color);
    P.texture('grain', -0.1, y, w + 0.2, H + 0.2, 0.25);
    P.vgrad(-0.1, y, w + 0.2, H, 'rgba(255,255,255,0.12)', 'rgba(0,0,0,0.1)');
    const sole = s.style === 'sneaker' ? 0.11 : 0.07;
    P.rect(-0.1, h - sole, w + 0.2, sole + 0.1, s.sole);
    if (s.style === 'sneaker') {
      P.line(-0.1, h - sole, w + 0.1, h - sole, 'rgba(0,0,0,0.25)', 0.012);
      if (f.facing === 'front') { for (let i = 0; i < 3; i++) { const yy = y + 0.06 + i * 0.06; P.line(w / 2 - 0.13, yy, w / 2 + 0.13, yy + 0.03, '#ffffff', 0.025); } P.rect(-0.1, h - sole - 0.07, w + 0.2, 0.05, s.accent); }
      if (f.facing === 'outer') P.poly([[0.15, h - sole - 0.04], [0.55, y + 0.1], [0.85, y + 0.1], [0.45, h - sole - 0.04]], s.accent);
      if (f.facing === 'back') P.rect(w / 2 - 0.15, y + 0.04, 0.3, 0.14, s.accent);
    } else if (s.style === 'boot') {
      P.rect(-0.1, y, w + 0.2, 0.07, shadeHex(s.color, 0.75));
      if (f.facing === 'front') for (let i = 0; i < 4; i++) P.line(w / 2 - 0.1, y + 0.12 + i * 0.1, w / 2 + 0.1, y + 0.12 + i * 0.1, '#d9c9a8', 0.02);
    } else if (f.facing === 'front') P.fold([0.2, y + 0.1, 0.5, y + 0.06, 0.8, y + 0.1], 0.06, 0.4, true);
  });
}

// ---------- atlas ----------
function normalize(spec) {
  const shirtIn = spec.shirt === null ? null : typeof spec.shirt === 'string' ? { pattern: spec.shirt } : spec.shirt ?? {};
  const S = shirtIn && { pattern: 'solid', color: '#3f7fc4', ...shirtIn };
  if (S) {
    if (S.pattern === 'sweater') S.texture ??= 'knit';
    if (S.pattern === 'tshirt') S.collar ??= 'round';
    S.sleeves ??= SLEEVES[S.pattern] ?? 'none';
    S.tuck ??= ['suit', 'plaid', 'suspenders'].includes(S.pattern) || !!S.suspenders;
    if (S.pattern === 'hivis') S.color = shirtIn.color ?? '#d6ff2e';
  }
  const pantsIn = typeof spec.pants === 'string' ? { pattern: spec.pants } : spec.pants ?? {};
  const defPants = S?.pattern === 'dress' ? { pattern: 'skirt', color: S.color2 ?? S.color } : S?.pattern === 'suit' ? { pattern: 'suit', color: S.color } : {};
  const Pn = { pattern: 'plain', color: '#2f3e57', ...defPants, ...pantsIn };
  if (Pn.pattern === 'jeans' && !pantsIn.color) Pn.color = '#4a6fa5';
  if (Pn.pattern === 'overalls' && !pantsIn.color) Pn.color = '#3d63a8';
  if (Pn.pattern === 'skeleton' && !pantsIn.color) Pn.color = '#151515';
  if (S?.pattern === 'skeleton' && !shirtIn.color) S.color = '#151515';
  return { S, Pn };
}

const FACINGS = (part, side) => {
  if (part === 'torso') return side;
  if (side === 'front' || side === 'back' || side === 'top' || side === 'bottom') return side;
  const isLeft = part[0] === 'l';
  return (side === 'left') === isLeft ? 'outer' : 'inner';
};

// Paints the whole body atlas for a spec into context g at (x0,y0) with ppu pixels per atlas unit.
export function paintBody(g, spec, { ppu = 192, x0 = 0, y0 = 0 } = {}) {
  const { S, Pn } = normalize(spec);
  const skin = skinColor(spec);
  const P = makePainter(g, ppu);
  P.skin = skin;
  // pass 0 paints every rect with a 3 px bleed (no seams under mip filtering), pass 1 repaints the exact rects so no
  // neighbour's bleed is left inside a rect (that showed as a skin line on box edges)
  for (const bleed of [3, 0]) for (const part of Object.keys(RECTS)) for (const side of Object.keys(RECTS[part])) {
    const [x, y, w, h] = RECTS[part][side];
    const f = { part, side, facing: FACINGS(part, side), w, h, torso: part === 'torso', arm: part.endsWith('Arm'), leg: part.endsWith('Leg'), isLeft: part[0] === 'l' };
    g.save();
    g.beginPath(); g.rect(x0 + x * ppu - bleed, y0 + y * ppu - bleed, w * ppu + 2 * bleed, h * ppu + 2 * bleed); g.clip();
    g.setTransform(ppu, 0, 0, ppu, x0 + x * ppu, y0 + y * ppu);
    P.rect(-0.2, -0.2, w + 0.4, h + 0.4, f.torso ? spec.torsoColor ?? skin : skin);
    if (f.leg || f.torso) pantsFace(P, f, Pn, S);
    if (S && (f.arm || f.torso)) shirtFace(P, f, S);
    if (Pn.pattern === 'overalls' && f.torso && S) pantsFace(P, f, Pn, S); // bib goes over the shirt
    g.restore();
  }
}

const texCache = new Map();
export function bodyTexture(spec, { ppu = 192 } = {}) {
  const key = JSON.stringify([spec.shirt, spec.pants, spec.skin, spec.skinColor, spec.torsoColor, ppu]);
  if (!texCache.has(key)) {
    const N = ATLAS_UNITS * ppu, c = makeCanvas(N, N);
    paintBody(c.getContext('2d'), spec, { ppu });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
