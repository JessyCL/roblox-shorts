// engine/config.json + tool auto-detection (paths are project-relative, so the project folder can move between PCs).
//   PYTHON: config `python`, else engine/.venv (setup.ps1), else the research venv this project started with.
//   FFMPEG: config `ffmpeg` (path or command), else tools/bin/ffmpeg.exe (setup.ps1 download), else ffmpeg on PATH.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './server.mjs';

export const CONFIG = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'engine', 'config.json'), 'utf8'));
const abs = (p) => path.resolve(PROJECT_ROOT, p);
const firstExisting = (...c) => c.find((p) => p && existsSync(abs(p)));

export const PYTHON = abs(firstExisting(CONFIG.python, 'engine/.venv/Scripts/python.exe',
  'research/audio/venvs/kokoro/Scripts/python.exe') ?? 'engine/.venv/Scripts/python.exe');

const tool = (name) => {
  const v = CONFIG[name] || firstExisting(`tools/bin/${name}.exe`) || name;
  return /[\\/]/.test(v) ? abs(v) : v;
};
export const FFMPEG = tool('ffmpeg');
