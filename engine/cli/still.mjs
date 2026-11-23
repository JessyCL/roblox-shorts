// Render PNG stills at given times for visual QA.
//   node engine/cli/still.mjs productions/<slug> --t 0.5,3.2,8 [--preview] [--outdir <dir>]
import { parseArgs } from 'node:util';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { startServer } from '../lib/server.mjs';
import { writePng } from '../lib/encoder.mjs';
import { resolveProduction, openProduction, closeBrowser } from './common.mjs';

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: { t: { type: 'string', default: '0' }, preview: { type: 'boolean', default: false }, outdir: { type: 'string' } },
});
const prod = resolveProduction(positionals[0]);
const outdir = path.resolve(o.outdir ?? path.join(prod.dir, 'stills'));
mkdirSync(outdir, { recursive: true });
const server = await startServer();
const { browser, page, info } = await openProduction(server, prod.url, o.preview ? { quality: 'preview', scale: 0.5, fps: 30 } : { quality: 'final', scale: 1 });
const writes = [];
server.state.sink = async (buf, i) => {
  const file = path.join(outdir, `t${(i / info.fps).toFixed(2).replace('.', '_')}.png`);
  writes.push(writePng(buf, { width: info.width, height: info.height, yuv: true, out: file }).then(() => console.log(file)));
};
try {
  for (const t of o.t.split(',').map(Number)) {
    const f = Math.min(info.frames - 1, Math.max(0, Math.round(t * info.fps)));
    await page.evaluate((f) => R.capture(f, 1), f);
  }
  await Promise.all(writes);
} finally {
  await closeBrowser(browser);
  await server.close();
}
