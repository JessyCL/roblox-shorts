// Page-side API (window.R) driven from Node via puppeteer, and by the preview player.
// Capture loops run inside the page and ship frames to the local Node server as binary POSTs.
import * as THREE from 'three';
import { createDirector } from './director.js';
import { createPipeline } from './pipeline.js';
import * as world from './world/index.js';
import * as characters from './characters/index.js';
import * as camera from './camera/index.js';
import * as fx from './fx/index.js';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
let contextLost = false;
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost = true; console.error('webglcontextlost'); });

let P = null, D = null, info = null, yuv = null;
const nextTask = () => new Promise((r) => setTimeout(r, 0)); // real macrotask: WebGL fence status refreshes between tasks
const check = () => { if (contextLost || P.gl.isContextLost()) throw new Error('WebGL context lost'); };

async function post(body, i, kind) {
  const res = await fetch(`/frame?i=${i}&kind=${kind}`, { method: 'POST', body: new Blob([body]) }); // Blob body: 5-10x faster than ArrayBuffer
  if (!res.ok) throw new Error(`frame ${i}: HTTP ${res.status} ${await res.text()}`);
}

function gpuInfo() {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return { webgl2: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const r = { webgl2: true, renderer: gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) };
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return r;
}

window.R = {
  gpuInfo,
  canvas,
  get director() { return D; },
  get pipeline() { return P; },

  // url: '/productions/<slug>/production.js'. quality: 'final' | 'preview'. scale: output size multiplier.
  async load(url, { quality = 'final', scale = 1, fps } = {}) {
    const prod = (await import(url)).default;
    const width = Math.round((prod.width * scale) / 8) * 8, height = Math.round((prod.height * scale) / 2) * 2;
    fps = fps ?? prod.fps;
    canvas.width = width; canvas.height = height;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // softness = light.shadow.radius
    D = await createDirector(renderer, prod, { world, characters, camera, fx }, { quality });
    P = await createPipeline(canvas, D, {
      width, height, fps, quality,
      finishing: fx.createFinishingEffect?.() ?? null,
      overlay: (await fx.createOverlayPass?.({ width, height, director: D })) ?? null,
    });
    yuv = new Uint8Array((width * height * 3) / 2);
    P.renderFrame(0); P.sync(); // compile every shader up front
    info = { width, height, fps, duration: D.duration, frames: Math.round(D.duration * fps), shots: D.shots.map((s) => ({ id: s.id, start: s.start, end: s.end })) };
    return info;
  },

  renderFrame(frame) { check(); P.renderFrame(frame); },

  // Pipelined capture: frame i renders on the GPU while frame i-1 is copied out of a pixel-pack buffer and POSTed.
  async capture(start, count) {
    const gl = P.gl;
    const [w, h] = P.yuvSize;
    const pbos = [0, 1].map(() => { const b = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, b); gl.bufferData(gl.PIXEL_PACK_BUFFER, yuv.byteLength, gl.STREAM_READ); return b; });
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    let pending = null;
    try {
      for (let i = start; i <= start + count; i++) {
        check();
        let cur = null;
        if (i < start + count) {
          P.renderFrame(i);
          P.packYUV();
          const pbo = pbos[i & 1];
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          P.renderer.setRenderTarget(null);
          cur = { pbo, i, fence: gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) };
          gl.flush();
        }
        if (pending) {
          while (gl.clientWaitSync(pending.fence, 0, 0) === gl.TIMEOUT_EXPIRED) await nextTask();
          gl.deleteSync(pending.fence);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pending.pbo);
          gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, yuv);
          gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
          await post(yuv, pending.i, 'yuv');
        }
        pending = cur;
      }
    } finally {
      for (const b of pbos) gl.deleteBuffer(b);
    }
  },

  stats() {
    const i = P.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null };
  },
};
