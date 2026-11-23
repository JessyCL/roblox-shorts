// Render a production to a video-only H.264 MP4 (audio/captions are added by make.mjs).
//   node engine/cli/render.mjs productions/<slug> [--preview] [--from 0] [--to <s>] [--out file.mp4] [--chunk 60] [--relaunch 1200]
// --preview: 540x960, 30 fps, no motion blur, faster AO/SMAA. Final: production size/fps (1080x1920@60).
// Chrome is relaunched every --relaunch frames (memory growth) and after a crash; frames depend only on their index,
// so resumed frames are identical.
import { parseArgs } from 'node:util';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { startServer } from '../lib/server.mjs';
import { startEncoder } from '../lib/encoder.mjs';
import { resolveProduction, openProduction, closeBrowser } from './common.mjs';

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    preview: { type: 'boolean', default: false }, from: { type: 'string', default: '0' }, to: { type: 'string' },
    out: { type: 'string' }, chunk: { type: 'string', default: '60' }, relaunch: { type: 'string', default: '1200' },
    crf: { type: 'string' }, preset: { type: 'string', default: 'veryfast' },
  },
});
const prod = resolveProduction(positionals[0]);
const loadOpts = o.preview ? { quality: 'preview', scale: 0.5, fps: 30 } : { quality: 'final', scale: 1 };
const out = path.resolve(o.out ?? path.join(prod.dir, 'renders', o.preview ? 'preview_video.mp4' : 'video.mp4'));
mkdirSync(path.dirname(out), { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const server = await startServer();
let browser = null, page = null, info = null, enc = null, restarts = 0, sinceLaunch = 0;
let first = 0, last = 0, next = 0, frameBytes = 0;
const t0 = performance.now();
try {
  while (!info || next < last) {
    try {
      if (!page) {
        ({ browser, page, info } = await openProduction(server, prod.url, loadOpts, log));
        sinceLaunch = 0;
        if (!enc) {
          first = Math.round(+o.from * info.fps);
          last = Math.min(info.frames, o.to ? Math.round(+o.to * info.fps) : info.frames);
          next = first;
          frameBytes = (info.width * info.height * 3) / 2;
          enc = startEncoder({ input: 'yuv', width: info.width, height: info.height, fps: info.fps, out, crf: +(o.crf ?? (o.preview ? 22 : 16)), preset: o.preset });
          server.state.sink = async (buf, i, kind) => {
            if (kind !== 'yuv' || buf.length !== frameBytes) throw new Error(`bad frame ${i}: ${kind}, ${buf.length} bytes`);
            if (i !== next) throw new Error(`out-of-order frame ${i}, expected ${next}`);
            await enc.write(buf);
            next++;
          };
          log(`${prod.url}: ${info.width}x${info.height}@${info.fps}, frames ${first}-${last - 1} of ${info.frames}, ${info.shots.length} shots -> ${out}`);
        }
      }
      const n = Math.min(+o.chunk, last - next);
      const c = performance.now();
      await page.evaluate((s, n) => R.capture(s, n), next, n);
      sinceLaunch += n;
      log(`frames ${next - n}-${next - 1}: ${((n * 1000) / (performance.now() - c)).toFixed(2)} fps (${(((next - first) / (last - first)) * 100).toFixed(1)}%)`);
      if (sinceLaunch >= +o.relaunch && next < last) { await closeBrowser(browser); browser = page = null; }
    } catch (e) {
      if (++restarts > 5) throw e;
      log(`render failed at frame ${next} (${String(e.message).split('\n')[0]}); relaunching Chrome`);
      if (browser) await closeBrowser(browser);
      browser = page = null;
    }
  }
} finally {
  if (browser) await closeBrowser(browser);
}
await enc.end();
await server.close();
const wall = (performance.now() - t0) / 1000;
log(`done: ${last - first} frames in ${wall.toFixed(1)} s (${((last - first) / wall).toFixed(2)} fps), restarts ${restarts} -> ${out}`);
