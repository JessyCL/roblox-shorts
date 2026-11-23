// SurfaceGui-like text: a canvas-textured plane on a part face (S.text({ part, face })) or free-standing (pos/rot/size).
//   text: 'HELLO' | (t) => string | [{ t, v }]  (functions/keys are evaluated each frame at GLOBAL time; for
//         shot-local changes call mesh.setText(str) from shot.update)
//   lines: ['NOW SERVING', { text: '4', size: 1.8, color: '#ffe66b' }]  (relative line sizes)
//   font: 'gotham' | 'cartoon' | 'serif' | 'mono' | 'arcade' | 'western' | any CSS family; weight, italic
//   color, bg (panel colour or null), stroke: { color, width (fraction of line height) }, align, padding (fraction)
//   glow: N -> unlit and HDR (N x colour) so it blooms like Neon; unlit: true -> SurfaceGui LightInfluence 0
//   size: [w, h] studs (default: the part face), px: canvas pixels per stud (default 96, capped at 2048 px)
import * as THREE from 'three';
import { sampleKeys } from '../core/math.js';
import { toColor } from './palette.js';
import { addWorldUniforms } from './materials.js';

const FONTS = {
  gotham: ["'Segoe UI Black', 'Arial Black', 'Segoe UI', Arial, sans-serif", 900],
  cartoon: ["'Comic Sans MS', 'Segoe Print', cursive", 700],
  serif: ["Georgia, 'Times New Roman', serif", 700],
  mono: ["Consolas, 'Courier New', monospace", 700],
  arcade: ["'Lucida Console', Consolas, monospace", 700],
  western: ["Rockwell, 'Rockwell Extra Bold', Georgia, serif", 900],
  sans: ["'Segoe UI', Arial, sans-serif", 700],
};
const css = (c) => '#' + toColor(c).getHexString(THREE.SRGBColorSpace);

const plane = new THREE.PlaneGeometry(1, 1);
export function createText(o = {}) {
  const [W, H] = o.size ?? [1, 1];
  const px = o.px ?? 96;
  const cw = Math.min(2048, Math.max(64, Math.round(o.size ? W * px : 1024))), ch = Math.min(2048, Math.max(32, Math.round(o.size ? H * px : 1024 / (o.aspect ?? 2))));
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const glow = o.glow ?? 0;
  const mat = glow > 0 || o.unlit
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: new THREE.Color(1, 1, 1).multiplyScalar(Math.max(1, glow)), depthWrite: false })
    : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, depthWrite: false });
  mat.onBeforeCompile = (s) => addWorldUniforms(s);
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(plane, mat);
  mesh.name = 'text';
  mesh.renderOrder = 2;
  if (o.size) { mesh.scale.set(W, H, 1); mesh.userData.explicitSize = true; }
  const [family, defWeight] = FONTS[o.font ?? 'gotham'] ?? [o.font, 700];
  const weight = o.weight ?? defWeight;
  let current = null;

  function draw(content) {
    const lines = (Array.isArray(content) ? content : String(content).split('\n')).map((l) => (typeof l === 'object' ? l : { text: String(l) }));
    const pad = (o.padding ?? 0.08) * Math.min(cw, ch);
    const padX = Math.max(pad, (o.padX ?? 0.07) * cw); // side margin: letters never touch the panel edge
    ctx.clearRect(0, 0, cw, ch);
    if (o.bg) { ctx.fillStyle = css(o.bg); ctx.fillRect(0, 0, cw, ch); }
    const rel = lines.map((l) => l.size ?? 1), total = rel.reduce((a, b) => a + b, 0) * 1.15;
    let fs = (ch - 2 * pad) / total;
    const fit = () => lines.every((l, i) => { ctx.font = `${o.italic ? 'italic ' : ''}${weight} ${fs * rel[i]}px ${family}`; return ctx.measureText(l.text).width <= cw - 2 * padX; });
    while (fs > 4 && !fit()) fs *= 0.92;
    let y = (ch - fs * total) / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = o.align ?? 'center';
    const x = o.align === 'left' ? pad : o.align === 'right' ? cw - pad : cw / 2;
    lines.forEach((l, i) => {
      const s = fs * rel[i], lh = s * 1.15;
      ctx.font = `${o.italic ? 'italic ' : ''}${weight} ${s}px ${family}`;
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = (o.stroke.width ?? 0.12) * s; ctx.strokeStyle = css(o.stroke.color ?? '#000000'); ctx.strokeText(l.text, x, y + lh / 2); }
      ctx.fillStyle = css(l.color ?? o.color ?? '#ffffff');
      ctx.fillText(l.text, x, y + lh / 2);
      y += lh;
    });
    tex.needsUpdate = true;
  }
  const src = o.lines ?? o.text ?? '';
  const isFn = typeof src === 'function', isKeys = Array.isArray(src) && src.length && src[0]?.t !== undefined && src[0]?.v !== undefined;
  const valueAt = (t) => (isFn ? src(t) : isKeys ? keyedValue(src, t) : src);
  function setText(v) {
    const k = JSON.stringify(v);
    if (k !== current) { current = k; draw(v); }
  }
  setText(valueAt(0));
  mesh.setText = setText;
  return { mesh, dynamic: isFn || isKeys, update(t) { setText(valueAt(t)); } };
}
// Step (not interpolated) keyed values: the last key with key.t <= t wins; numbers may opt into interpolation via { lerp: true }.
function keyedValue(keys, t) {
  if (keys[0].lerp) return String(Math.round(sampleKeys(keys, t)));
  let v = keys[0].v;
  for (const k of keys) if (k.t <= t) v = k.v;
  return v;
}
