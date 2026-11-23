// Chrome launch profiles. Puppeteer already adds --force-color-profile=srgb and the
// anti-throttling flags (--disable-renderer-backgrounding, --disable-background-timer-throttling, ...).
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

// CHROME_PATH, else Chrome (machine or per-user install), else Edge (same Chromium flags work).
const env = process.env, pf = env.ProgramFiles ?? 'C:\\Program Files', pf86 = env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
export const CHROME = env.CHROME_PATH ?? [
  `${pf}\\Google\\Chrome\\Application\\chrome.exe`, `${pf86}\\Google\\Chrome\\Application\\chrome.exe`,
  `${env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`, `${pf}\\Microsoft\\Edge\\Application\\msedge.exe`,
].find((p) => existsSync(p)) ?? 'chrome.exe';

const GPU = ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'];
export const PROFILES = {
  'headless-default': { headless: true, args: [] },
  'headless-d3d11': { headless: true, args: GPU },
  'headless-swiftshader': { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  'headed-d3d11': { headless: false, args: [...GPU, '--window-position=-32000,-32000', '--window-size=500,800'] },
};

export async function openPage(url, profile, { width = 1080, height = 1920, timeout = 600_000, log = true } = {}) {
  const p = PROFILES[profile];
  if (!p) throw new Error(`unknown profile ${profile}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: p.headless,
    protocolTimeout: timeout, // long in-page loops would hit the 180 s default
    defaultViewport: { width, height, deviceScaleFactor: 1 },
    args: ['--force-device-scale-factor=1', '--disable-gpu-watchdog', ...p.args],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(timeout);
  if (log) {
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') console.log(`[page ${m.type()}]`, m.text()); });
    page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  }
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForFunction('window.R !== undefined', { timeout: 30_000 }); // fails fast on module/import-map errors
  return { browser, page };
}

// WebGL renderer string under the render flags (setup.ps1 probe). SwiftShader / Basic Render = no hardware GPU.
export async function gpuRenderer() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--force-device-scale-factor=1', '--disable-gpu-watchdog', ...PROFILES['headless-d3d11'].args] });
  try {
    const page = await browser.newPage();
    return await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      return gl ? gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'no WebGL2';
    });
  } finally {
    await closeBrowser(browser);
  }
}

// browser.close() on Windows can take 10-30 s waiting for the GPU process; cap it, then kill.
export async function closeBrowser(browser) {
  const proc = browser.process();
  await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
  if (proc && proc.exitCode === null) proc.kill();
}
