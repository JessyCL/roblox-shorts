// 2D editor-overlay layer (CapCut-style stickers drawn over the finished, graded frame). A Canvas2D at output size
// is redrawn only on frames that have overlay items, uploaded, and composited by the LAST pass, which also encodes
// to sRGB for the screen. Items come from `post.overlays` (pushed by fx entries, see fx/index.js); each item carries
// `x` = seconds since its start. Coordinates: pos [x, y] in frame fractions from the top-left; sizes in fractions of
// the frame width. Everything is seeded/pure in time (speed lines re-seed every 2 frames at 30 fps).
//
// kinds: sticker { emoji | text | image (URL, preloaded), pos, size, rotate, pop (0.6 -> 1 easeOutBack over ~5
//        frames), pulse: { freq, amount }, opacity } | x_stamp { pos, size, color } (X 1.6 -> 1 in 0.12 s + red ring
//        1 -> 2x fading over 0.25 s) | bubble { pos, size: [w, h], text, tail: [x, y], outline } | speed_lines
//        { count, clear (0.45), color, opacity } | stars { center, count, radius, size, color } | path_draw { points,
//        color, width, dash, dur, ease } | iris { center, radius | from/to radius over `anim` s, ring, ringWidth } |
//        ring { pos, size (final radius, frac W), life: 0.25, from: 0, width, color, period (repeat every s) }
import * as THREE from 'three';
import { Pass } from 'postprocessing';
import { clamp, ease, hashString, lerp, rng } from '../core/math.js';

const images = new Map();
const loadImage = (url) => {
  if (!images.has(url)) images.set(url, new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(`overlay: cannot load ${url}`)); im.src = url; }));
  return images.get(url);
};
const loaded = new Map();

export async function createOverlayPass({ width, height, director }) {
  // Preload sticker images so the first frame that shows one is complete (determinism).
  const urls = new Set();
  for (const s of director?.shots ?? []) for (const e of s.fx ?? []) if (e.image) urls.add(e.image);
  await Promise.all([...urls].map(async (u) => loaded.set(u, await loadImage(u))));
  return new OverlayPass(width, height);
}

class OverlayPass extends Pass {
  constructor(w, h) {
    super('OverlayPass');
    this.needsSwap = true;
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.g = this.canvas.getContext('2d', { willReadFrequently: true }); // CPU-backed: GPU canvases uploaded stale/black on a first draw
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.generateMipmaps = false;
    this.tex.minFilter = THREE.LinearFilter;
    this.items = [];
    this.fullscreenMaterial = new THREE.ShaderMaterial({
      uniforms: { inputBuffer: { value: null }, overlay: { value: this.tex }, hasOverlay: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: `uniform sampler2D inputBuffer; uniform sampler2D overlay; uniform float hasOverlay; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(inputBuffer, vUv);
          if (hasOverlay > 0.5) { vec4 o = texture2D(overlay, vUv); c.rgb = mix(c.rgb, o.rgb, o.a); }
          gl_FragColor = vec4(c.rgb, 1.0);
          #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false,
    });
  }

  apply(post) { this.items = post.overlays ?? []; }

  render(renderer, inputBuffer, outputBuffer) {
    const has = this.items.length > 0;
    if (has) {
      const g = this.g;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, this.w, this.h);
      for (const it of this.items) { g.save(); DRAW[it.kind](g, it, this.w, this.h); g.restore(); }
      this.tex.needsUpdate = true;
    }
    const U = this.fullscreenMaterial.uniforms;
    U.inputBuffer.value = inputBuffer.texture;
    U.hasOverlay.value = has ? 1 : 0;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }
}

const popScale = (it, from = 0.6, dur = 0.167) => (it.pop === false ? 1 : lerp(from, 1, ease('outBack')(clamp(it.x / dur))));
const pulse = (it) => (it.pulse ? 1 + (it.pulse.amount ?? 0.1) * Math.sin(2 * Math.PI * (it.pulse.freq ?? 4) * it.x) : 1);
const fadeOut = (it) => (it.dur && it.out !== false ? clamp((it.dur - it.x) / (it.outDur ?? 0.08)) : 1);

function star4(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, b = a + Math.PI / 4;
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    g.quadraticCurveTo(x + Math.cos(b) * r * 0.12, y + Math.sin(b) * r * 0.12, x + Math.cos(a + Math.PI / 2) * r, y + Math.sin(a + Math.PI / 2) * r);
  }
  g.closePath();
}

export const DRAW = {
  ring(g, it, W, H) { // expanding fading ring (shockwave / heart pulse / sound ping)
    const life = it.life ?? (it.period ? 0.8 : 0.25), [px, py] = it.pos ?? [0.5, 0.5];
    const starts = it.period ? Array.from({ length: Math.ceil(life / it.period) + 1 }, (_, i) => (Math.floor(it.x / it.period) - i) * it.period) : [0];
    g.strokeStyle = it.color ?? '#ffffff';
    for (const s of starts) {
      const u = (it.x - s) / life;
      if (s < 0 || u < 0 || u > 1) continue;
      g.globalAlpha = (it.opacity ?? 0.9) * (1 - u);
      g.lineWidth = (it.width ?? 0.012) * W * (1 - 0.5 * u);
      g.beginPath(); g.arc(px * W, py * H, Math.max(0, lerp(it.from ?? 0.1, 1, ease('outQuad')(u)) * (it.size ?? 0.3) * W), 0, Math.PI * 2); g.stroke();
    }
  },
  sticker(g, it, W, H) {
    const [px, py] = it.pos ?? [0.5, 0.4], size = (it.size ?? 0.15) * W;
    g.globalAlpha = (it.opacity ?? 1) * fadeOut(it);
    g.translate(px * W, py * H);
    g.rotate(((it.rotate ?? 0) * Math.PI) / 180);
    const s = popScale(it) * pulse(it);
    g.scale(s, s);
    if (it.image) { const im = loaded.get(it.image); if (im) g.drawImage(im, -size / 2, -size / 2 * (im.height / im.width), size, size * (im.height / im.width)); return; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${it.emoji ? '' : 'bold '}${Math.round(size)}px ${it.emoji ? '"Segoe UI Emoji","Noto Color Emoji",sans-serif' : it.font ?? '"Comic Sans MS","Arial Black",sans-serif'}`;
    if (!it.emoji) { g.lineJoin = 'round'; g.lineWidth = size * 0.12; g.strokeStyle = it.outline ?? '#000'; g.strokeText(it.text ?? '', 0, 0); g.fillStyle = it.color ?? '#fff'; }
    g.fillText(it.emoji ?? it.text ?? '', 0, 0);
  },
  x_stamp(g, it, W, H) {
    const [px, py] = it.pos ?? [0.5, 0.5], size = (it.size ?? 0.12) * W, col = it.color ?? '#e8261c';
    g.translate(px * W, py * H);
    const ru = clamp(it.x / 0.25);
    if (ru < 1) { // expanding shock ring
      g.globalAlpha = 1 - ru;
      g.strokeStyle = col; g.lineWidth = size * 0.1;
      g.beginPath(); g.arc(0, 0, size * 0.55 * (1 + ru), 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    }
    const s = lerp(1.6, 1, ease('outCubic')(clamp(it.x / 0.12))) * fadeOut(it);
    g.scale(s, s);
    g.lineCap = 'round';
    for (const [w, c] of [[size * 0.26, '#5a0a06'], [size * 0.18, col]]) {
      g.lineWidth = w; g.strokeStyle = c;
      g.beginPath(); g.moveTo(-size / 2, -size / 2); g.lineTo(size / 2, size / 2); g.moveTo(size / 2, -size / 2); g.lineTo(-size / 2, size / 2); g.stroke();
    }
  },
  bubble(g, it, W, H) {
    const [px, py] = it.pos ?? [0.5, 0.25], [bw, bh] = (it.size ?? [0.42, 0.14]).map((v) => v * W), outline = it.outline ?? '#1b2550';
    const [tx, ty] = it.tail ?? [px - 0.05, py + 0.12];
    const s = popScale(it) * fadeOut(it);
    g.translate(px * W, py * H); g.scale(s, s);
    const tip = [(tx - px) * W / s, (ty - py) * H / s];
    g.lineJoin = 'round'; g.lineWidth = W * 0.016; // fills below cover the inner half of the stroke
    const ell = () => { g.beginPath(); g.ellipse(0, 0, bw / 2, bh / 2, 0, 0, Math.PI * 2); };
    const tail = () => { g.beginPath(); g.moveTo(-bw * 0.12, bh * 0.3); g.lineTo(tip[0], tip[1]); g.lineTo(bw * 0.05, bh * 0.42); g.closePath(); };
    g.fillStyle = '#ffffff'; g.strokeStyle = outline;
    ell(); g.stroke(); tail(); g.stroke();
    ell(); g.fill(); tail(); g.fill();
    g.fillStyle = it.color ?? outline; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${Math.round(bh * 0.42)}px ${it.font ?? '"Comic Sans MS","Segoe Print",sans-serif'}`;
    g.fillText(it.text ?? '', 0, bh * 0.03, bw * 0.85);
  },
  speed_lines(g, it, W, H) {
    const r = rng(hashString(`${it.seed ?? 0}`) + Math.floor(it.x * (it.seedRate ?? 15)));
    const cx = (it.center?.[0] ?? 0.5) * W, cy = (it.center?.[1] ?? 0.5) * H, R = Math.hypot(W, H) * 0.6, clear = (it.clear ?? 0.45) * Math.hypot(W, H) / 2;
    g.globalAlpha = it.opacity ?? 0.9;
    g.fillStyle = it.color ?? '#ffffff';
    const n = it.count ?? 60;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, w = 0.004 + r() * 0.016, r0 = clear * (1 + r() * 0.35);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
      g.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
      g.fill();
    }
  },
  stars(g, it, W, H) {
    const r = rng(hashString(`stars${it.seed ?? 0}`)), [cx, cy] = it.center ?? [0.5, 0.4], n = it.count ?? 5;
    g.fillStyle = it.color ?? '#ffe14a';
    g.globalAlpha = fadeOut(it);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = (0.4 + 0.6 * r()) * (it.radius ?? 0.18) * W, ph = r() * 6.3;
      const s = (it.size ?? 0.05) * W * (0.6 + 0.4 * r()) * popScale(it, 0) * (1 + 0.1 * Math.sin(2 * Math.PI * (it.freq ?? 4) * it.x + ph));
      star4(g, cx * W + Math.cos(a) * d, cy * H + Math.sin(a) * d, s);
      g.fill();
    }
  },
  path_draw(g, it, W, H) {
    const pts = (it.points ?? []).map(([x, y]) => [x * W, y * H]);
    if (pts.length < 2) return;
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    let left = seg.reduce((a, b) => a + b, 0) * ease(it.ease ?? 'linear')(clamp(it.x / (it.drawDur ?? it.dur ?? 1)));
    g.strokeStyle = it.color ?? '#3cff5a'; g.lineWidth = (it.width ?? 0.008) * W; g.lineCap = 'round';
    g.setLineDash((it.dash ?? [0.018, 0.014]).map((v) => v * W));
    g.beginPath(); g.moveTo(...pts[0]);
    for (let i = 0; i < seg.length && left > 0; i++) {
      const f = Math.min(1, left / seg[i]);
      g.lineTo(lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f));
      left -= seg[i];
    }
    g.stroke();
  },
  iris(g, it, W, H) {
    const [cx, cy] = it.center ?? [0.5, 0.45];
    const rad = (it.from != null ? lerp(it.from, it.to ?? it.radius ?? 0.4, ease(it.ease ?? 'inOutSine')(clamp(it.x / (it.anim ?? 0.6)))) : it.radius ?? 0.4) * W;
    g.fillStyle = it.color ?? '#000';
    g.beginPath(); g.rect(0, 0, W, H); g.arc(cx * W, cy * H, Math.max(0, rad), 0, Math.PI * 2); g.fill('evenodd');
    if (it.ring !== false && rad > 1) {
      const rw = (it.ringWidth ?? 0.02) * W, gr = g.createLinearGradient(cx * W - rad, cy * H - rad, cx * W + rad, cy * H + rad);
      gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.5, it.ring ?? '#d9a520'); gr.addColorStop(1, '#7a5208');
      g.strokeStyle = gr; g.lineWidth = rw;
      g.beginPath(); g.arc(cx * W, cy * H, rad + rw / 2, 0, Math.PI * 2); g.stroke();
    }
  },
};
