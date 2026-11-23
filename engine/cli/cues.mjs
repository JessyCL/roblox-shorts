// Re-resolve the music + SFX cues of script.json into timing.json WITHOUT re-running TTS (the voice and word timings
// stay as they are). Use after changing music tracks/levels or adding/moving/removing sound effects, then run
// `make --stage mix` and `--stage final` (no video re-render needed).
//   node engine/cli/cues.mjs productions/<slug>
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? '');
const script = JSON.parse(readFileSync(path.join(dir, 'script.json'), 'utf8'));
const timingPath = path.join(dir, 'timing.json');
const timing = JSON.parse(readFileSync(timingPath, 'utf8'));
const words = timing.words;
const word = (line, w) => {
  const x = words.find((q) => q.line === line && q.w === w);
  if (!x) throw new Error(`cue anchor ${line}:${w} not found in timing.json (token indexes are 0-based per line)`);
  return x;
};
const lastEnd = words.at(-1).end;

const music = (script.music ?? []).map((m) => {
  const t = m.at === 'last_word_end' ? lastEnd + (m.tail_ms ?? 0) / 1000 : word(m.at.line, m.at.w ?? 0).start; // same as tts.py
  const { at, ...rest } = m;
  return { ...rest, t: +t.toFixed(3) };
});
const sfx = [];
for (const L of script.lines) for (const s of L.sfx ?? []) {
  sfx.push({ ...s, line: L.id, t: +(word(L.id, s.w ?? 0).start + (s.offset_ms ?? 0) / 1000).toFixed(3) });
}
if (sfx.length > 10) console.warn(`warning: ${sfx.length} SFX cues (style guide: at most 10)`);
timing.cues = { ...timing.cues, music, sfx };
writeFileSync(timingPath, JSON.stringify(timing, null, 1));
console.log(`${path.relative(process.cwd(), timingPath)}: ${music.length} music cues, ${sfx.length} sfx cues`);
for (const m of music) console.log(`  music ${m.id} ${m.role} @ ${m.t}s${m.track ? ' ' + m.track : ''}${m.level_db_under_voice != null ? ` (${m.level_db_under_voice} dB under voice)` : ''}`);
for (const s of sfx) console.log(`  sfx ${s.id} @ ${s.t}s (${s.gain_db ?? -12} dB)`);
