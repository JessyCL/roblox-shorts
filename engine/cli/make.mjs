// Full pipeline for one production.
//   node engine/cli/make.mjs productions/<slug> --stage tts|captions|render|mix|final|all [--preview]
// tts      script.json -> audio/narration.wav + timing.json          (voice engine elevenlabs: engine/audio/tts_elevenlabs.py;
//          kokoro: engine/audio/tts.py; presets + default in engine/voices.json; audio venv)
// captions timing.json -> captions.ass + captions.json               (engine/captions/ass.mjs)
// render   production.js -> renders/video.mp4 (or preview_video.mp4)  (engine/cli/render.mjs)
// mix      cues.json + narration -> audio/mix.wav (+ mix_report.json)  (engine/audio/mix.py)
// final    video + mix + burned captions -> out/final.mp4 (1080x1920, 60 fps by frame duplication, H.264 CRF 18 high,
//          yuv420p BT.709, AAC 192k, faststart) or out/preview.mp4 (preview render size, 30 fps); writes out/credits.txt.
// all      tts, captions, render, mix, final (render needs timing.json, so tts runs first).
// Tool paths (audio venv python, ffmpeg) come from engine/config.json with auto-detection (engine/lib/config.mjs).
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from '../lib/server.mjs';
import { BT709_TAGS } from '../lib/encoder.mjs';
import { CONFIG as cfg, PYTHON, FFMPEG } from '../lib/config.mjs';

const { values: o, positionals } = parseArgs({ allowPositionals: true, options: {
  stage: { type: 'string', default: 'all' }, preview: { type: 'boolean', default: false }, passes: { type: 'string' } } });
const STAGES = ['tts', 'captions', 'render', 'mix', 'final'];
if (!positionals[0] || ![...STAGES, 'all'].includes(o.stage)) {
  console.error('usage: node engine/cli/make.mjs productions/<slug> --stage tts|captions|render|mix|final|all [--preview]');
  process.exit(1);
}
const dir = path.resolve(positionals[0]);
const relDir = path.relative(PROJECT_ROOT, dir).split(path.sep).join('/'); // ffmpeg filter args: relative, no drive colon
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), '[make]', ...a);

function run(cmd, args) {
  log(cmd === process.execPath ? 'node' : path.basename(cmd), args.join(' '));
  const r = spawnSync(cmd, args, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  if (r.status !== 0) { log(`failed (${r.status ?? r.error?.message})`); process.exit(1); }
}
const py = (script, extra = []) => run(PYTHON, ['-I', '-X', 'utf8', `engine/audio/${script}`, relDir, ...extra]);

// TTS engine from script.json voice: its own `engine`, else its `preset` (or the default) in engine/voices.json.
function ttsEngine() {
  const v = JSON.parse(readFileSync(path.join(dir, 'script.json'), 'utf8')).voice ?? {};
  if (v.engine) return v.engine;
  const P = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'engine', 'voices.json'), 'utf8'));
  return P.presets[v.preset ?? P.default]?.engine;
}

const stages = {
  tts: () => ttsEngine() === 'elevenlabs' ? py('tts_elevenlabs.py') // ElevenLabs (paid, cached per line)
    : py('tts.py', o.passes ? ['--passes', o.passes] : []), // Kokoro; --passes N: extra pace-calibration renders
  captions: () => run(process.execPath, ['engine/captions/ass.mjs', relDir]),
  render: () => run(process.execPath, ['engine/cli/render.mjs', relDir, ...(o.preview ? ['--preview'] : [])]),
  mix: () => py('mix.py'),
  final: () => {
    const video = `${relDir}/renders/${o.preview ? 'preview_video.mp4' : 'video.mp4'}`;
    const out = `${relDir}/out/${o.preview ? 'preview.mp4' : 'final.mp4'}`;
    for (const f of [video, `${relDir}/audio/mix.wav`, `${relDir}/captions.ass`])
      if (!existsSync(path.join(PROJECT_ROOT, f))) { log(`missing ${f}: run its stage first`); process.exit(1); }
    mkdirSync(path.join(dir, 'out'), { recursive: true });
    const v = o.preview ? '[0:v]' : '[0:v]fps=60,scale=1080:1920:flags=lanczos,'; // 30 unique fps -> 60 by duplication
    run(FFMPEG, ['-hide_banner', '-loglevel', 'warning', '-stats', '-y', '-i', video, '-i', `${relDir}/audio/mix.wav`,
      '-filter_complex', `${v}subtitles=filename='${relDir}/captions.ass':fontsdir='${cfg.fonts}'[v];[1:a]apad[a]`,
      '-map', '[v]', '-map', '[a]', '-shortest', // video length rules; audio padded with silence if shorter
      '-c:v', 'libx264', '-preset', o.preview ? 'veryfast' : 'medium', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      ...BT709_TAGS, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]);
    const rep = path.join(dir, 'audio', 'mix_report.json');
    const credits = existsSync(rep) ? JSON.parse(readFileSync(rep, 'utf8')).credits : [];
    writeFileSync(path.join(dir, 'out', 'credits.txt'),
      (credits.length ? 'Music:\n' + credits.join('\n\n') : 'No attribution-required music used.') + '\n');
    log(`-> ${out} (+ out/credits.txt)`);
  },
};

for (const s of o.stage === 'all' ? STAGES : [o.stage]) { log(`stage ${s}`); stages[s](); }
