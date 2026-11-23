// Shared CLI helpers.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { PROJECT_ROOT } from '../lib/server.mjs';
import { openPage, closeBrowser } from '../lib/chrome.mjs';

// 'productions/foo' | 'productions/foo/production.js' | absolute path -> { dir, url }
export function resolveProduction(arg) {
  if (!arg) throw new Error('usage: <production dir or production.js>');
  let file = path.resolve(arg);
  if (!file.endsWith('.js')) file = path.join(file, 'production.js');
  if (!existsSync(file)) throw new Error(`not found: ${file}`);
  const rel = path.relative(PROJECT_ROOT, file);
  if (rel.startsWith('..')) throw new Error(`production must live inside ${PROJECT_ROOT}`);
  return { dir: path.dirname(file), url: '/' + rel.split(path.sep).join('/') };
}

// Launch headless Chrome on the render page, refuse software GL (~60x slower), load the production.
export async function openProduction(server, prodUrl, loadOpts, log = console.log) {
  const { browser, page } = await openPage(server.url + 'engine/runtime/index.html', 'headless-d3d11', { timeout: 600_000 });
  page.on('error', (e) => log('page crashed:', e.message));
  const gpu = await page.evaluate(() => R.gpuInfo());
  if (!/Intel|NVIDIA|AMD|Radeon/i.test(gpu.renderer) || /SwiftShader/i.test(gpu.renderer)) {
    await closeBrowser(browser);
    throw new Error(`no hardware GPU in Chrome: ${gpu.renderer}`);
  }
  const info = await page.evaluate((u, o) => R.load(u, o), prodUrl, loadOpts);
  return { browser, page, info };
}

export { closeBrowser };
