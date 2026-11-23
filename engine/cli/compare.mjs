// Side-by-side QA against a reference clip: video (ref | ours, with audio from ours) + a stills sheet.
//   node engine/cli/compare.mjs --ours productions/x/out/final.mp4 --ref <clip.mp4> [--ref-from 0] [--from 0]
//        [--dur 15] [--stills 8] [--out productions/x/out/compare]
// Writes <out>.mp4 (1080x960: two 540x960 panes) and <out>_sheet.png (rows: ref on top, ours below, same timestamps).
import { parseArgs } from 'node:util';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { ffmpeg } from '../lib/encoder.mjs';

const { values: o } = parseArgs({
  options: {
    ours: { type: 'string' }, ref: { type: 'string' }, 'ref-from': { type: 'string', default: '0' }, from: { type: 'string', default: '0' },
    dur: { type: 'string', default: '15' }, stills: { type: 'string', default: '8' }, out: { type: 'string' },
  },
});
if (!o.ours || !o.ref) throw new Error('usage: --ours <mp4> --ref <mp4> [--ref-from s] [--from s] [--dur s]');
const out = path.resolve(o.out ?? path.join(path.dirname(o.ours), 'compare'));
mkdirSync(path.dirname(out), { recursive: true });
const font = "fontfile='C\\:/Windows/Fonts/arialbd.ttf'";
const label = (txt) => `drawtext=${font}:text='${txt}':x=16:y=16:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8`;
const pane = (txt) => `fps=30,scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2,setsar=1,${label(txt)}`;

await ffmpeg(['-y', '-ss', o['ref-from'], '-t', o.dur, '-i', o.ref, '-ss', o.from, '-t', o.dur, '-i', o.ours,
  '-filter_complex', `[0:v]${pane('REFERENCE')}[a];[1:v]${pane('OURS')}[b];[a][b]hstack=2[v]`,
  '-map', '[v]', '-map', '1:a?', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
  '-shortest', '-movflags', '+faststart', `${out}.mp4`]);

// Stills sheet: N evenly spaced timestamps, reference row over ours row.
const n = +o.stills, d = +o.dur;
const ts = Array.from({ length: n }, (_, i) => ((i + 0.5) * d) / n);
const inputs = [], chains = [];
ts.forEach((t, i) => {
  inputs.push('-ss', String(+o['ref-from'] + t), '-i', o.ref, '-ss', String(+o.from + t), '-i', o.ours);
  const tag = `${t.toFixed(1)}s`;
  chains.push(`[${2 * i}:v]scale=270:480,${label(tag).replace('fontsize=34', 'fontsize=22')}[r${i}]`, `[${2 * i + 1}:v]scale=270:480[o${i}]`);
});
const top = ts.map((_, i) => `[r${i}]`).join(''), bot = ts.map((_, i) => `[o${i}]`).join('');
await ffmpeg(['-y', ...inputs, '-filter_complex', `${chains.join(';')};${top}hstack=${n}[T];${bot}hstack=${n}[B];[T][B]vstack=2`,
  '-frames:v', '1', `${out}_sheet.png`]);
console.log(`${out}.mp4\n${out}_sheet.png`);
