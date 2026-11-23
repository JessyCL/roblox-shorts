// Serve the browser preview player for a production and open it in Chrome.
//   node engine/cli/preview.mjs productions/<slug> [--port 5180] [--no-open]
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { startServer } from '../lib/server.mjs';
import { CHROME } from '../lib/chrome.mjs';
import { resolveProduction } from './common.mjs';

const { values: o, positionals } = parseArgs({
  allowPositionals: true, options: { port: { type: 'string', default: '5180' }, 'no-open': { type: 'boolean', default: false } },
});
const prod = resolveProduction(positionals[0]);
const server = await startServer({ port: +o.port });
const url = `${server.url}engine/runtime/preview.html?p=${encodeURIComponent(prod.url)}`;
console.log(`Preview: ${url}\n(Space = play/pause, arrows = step a frame; Ctrl+C to stop)`);
if (!o['no-open']) spawn(CHROME, ['--new-window', url], { detached: true, stdio: 'ignore' }).unref();
