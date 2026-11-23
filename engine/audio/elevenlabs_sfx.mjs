// Batch-generate sound effects with the ElevenLabs Sound Effects API (text -> audio). Search the shared library first
// (node engine/audio/sfx_lib.mjs search "<words>"); for a single effect prefer `sfx_lib.mjs generate`.
//   node engine/audio/elevenlabs_sfx.mjs <list.json> <outDir> [--force]
// list.json: [{ "name": "bell_tolls", "prompt": "Deep eerie church bell tolling…", "duration": 4, "influence": 0.4, "tags": ["bell", "church"] }]
// Writes <outDir>/<name>.mp3 (skips existing files unless --force) and saves every effect to the shared library
// (assets/library/sfx/elevenlabs + manifest id sfx/<name>, _2/_3… if the name is taken; tags default to words of the
// name + prompt). An effect whose exact prompt is already in the library is copied from there instead of re-generated.
// Needs the ELEVENLABS_API_KEY environment variable (paid: each generation uses ElevenLabs credits). Cue the files in
// script.json sfx by library id "sfx/<name>" (or as "sfx/<name>.mp3" relative to the production).
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, elevenlabs, saveGenerated, sfxEntries } from './sfx_lib.mjs';

const [listFile, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
if (!listFile || !outDir) throw new Error('usage: node engine/audio/elevenlabs_sfx.mjs <list.json> <outDir> [--force]');
mkdirSync(outDir, { recursive: true });

for (const s of JSON.parse(readFileSync(listFile, 'utf8'))) {
  if (!/^[a-z0-9_-]+$/i.test(s.name)) throw new Error(`bad sfx name "${s.name}" (letters, digits, _ and - only)`);
  const out = path.join(outDir, `${s.name}.mp3`);
  const lib = sfxEntries().find((e) => e.source === 'elevenlabs' && e.prompt === s.prompt);
  let fresh = false;
  if (existsSync(out) && !force) console.log(`skip ${out} (exists)`);
  else if (lib && !force) { copyFileSync(path.join(ROOT, lib.path), out); console.log(`${out} (from library ${lib.id}, no credits used)`); }
  else {
    const buf = await elevenlabs(s.prompt, s.duration, s.influence ?? 0.4).catch((err) => { throw new Error(`"${s.name}": ${err.message}`); });
    writeFileSync(out, buf);
    fresh = true;
    console.log(`${out} (${(buf.length / 1024).toFixed(0)} KB)`);
  }
  const e = saveGenerated(out, { name: s.name, prompt: s.prompt, tags: s.tags, title: s.title, fresh });
  console.log(`  library: ${e.id}`);
}
