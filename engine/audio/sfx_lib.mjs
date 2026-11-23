// Shared SFX library for every production: assets/library/sfx/<source>/ + entries in assets/library/manifest.jsonl
// ({ id: 'sfx/<name>', type: 'sfx', name, title, path, tags, prompt, duration, source, license, credit_required }).
// Search it first, generate with ElevenLabs only when nothing fits; generated effects are saved to the library.
//   node engine/audio/sfx_lib.mjs search "<words>" [-n 10]
//   node engine/audio/sfx_lib.mjs list [--source elevenlabs|derived|procedural|kenney]
//   node engine/audio/sfx_lib.mjs generate --name <n> --prompt "<p>" --duration <s> [--tags a,b] [--title "..."] [--influence 0.4]
//   node engine/audio/sfx_lib.mjs find-or-generate --query "<words>" --prompt "<p>" --duration <s> [--name <n>] [--tags a,b] [--min 0.6]
//   node engine/audio/sfx_lib.mjs add <file> --name <n> --tags a,b [--title "..."] [--from sfx/<id>] [--process "..."]
//   node engine/audio/sfx_lib.mjs selftest
// `add` saves a locally made variant (loop, trim, compressed copy) to assets/library/sfx/derived/.
// Cue a result in script.json line sfx as { "id": "sfx/<name>" }; engine/audio/mix.py resolves ids from the manifest.
// generate needs the ELEVENLABS_API_KEY environment variable (paid: each generation uses the user's ElevenLabs credits).
import { readFileSync, writeFileSync, renameSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cfg = JSON.parse(readFileSync(path.join(ROOT, 'engine/config.json'), 'utf8'));
const MANIFEST = path.join(ROOT, cfg.library, 'manifest.jsonl');
export const ELEVEN_LICENSE = "Generated with ElevenLabs on the user's account; commercial use requires a paid ElevenLabs plan";
const posix = (p) => path.relative(ROOT, p).split(path.sep).join('/');

// ---- manifest ----
const readLines = () => (existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8').split(/\r?\n/).filter((l) => l.trim()) : []);
export const manifest = () => readLines().map((l) => JSON.parse(l));
export const sfxEntries = () => manifest().filter((e) => (e.type ?? e.kind) === 'sfx');

/** Merge entries into the manifest by id ({...old, ...new}); unknown ids are appended. Atomic read-merge-write: other
 *  agents write this file too, so it is re-read right before writing, untouched lines are kept byte-for-byte, and the
 *  new file replaces the old one with a rename. */
export function upsert(entries) {
  const pending = new Map(entries.map((e) => [e.id, e]));
  const lines = readLines().map((l) => {
    const old = JSON.parse(l), n = pending.get(old.id);
    if (!n) return l;
    pending.delete(old.id);
    return JSON.stringify({ ...old, ...n });
  });
  const tmp = `${MANIFEST}.${process.pid}.tmp`;
  writeFileSync(tmp, [...lines, ...[...pending.values()].map((e) => JSON.stringify(e))].join('\n') + '\n');
  for (let i = 0; ; i++) {
    try { renameSync(tmp, MANIFEST); return; } catch (err) { // Windows: EPERM/EBUSY while another process reads the file
      if (i >= 30 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

/** elevenlabs | derived | procedural | kenney (older entries store a URL or 'generated' in `source`). */
export const sourceOf = (e) => (['elevenlabs', 'derived', 'procedural', 'kenney'].includes(e.source) ? e.source
  : /kenney/i.test(`${e.source} ${e.author}`) ? 'kenney' : e.source === 'generated' ? 'procedural' : String(e.source));

// ---- search ----
const norm = (w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w); // footsteps = footstep
const words = (s) => (String(s ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? []).map(norm);

/** 0..1: per query word 1 for a tag/name/title hit, 0.5 for a prefix hit there or a prompt hit; averaged. */
export function score(e, query) {
  const q = [...new Set(words(query))];
  if (!q.length) return 0;
  const strong = new Set([...(e.tags ?? []).flatMap(words), ...words(e.name), ...words(e.title)]), weak = new Set(words(e.prompt));
  const hit = (w) => (strong.has(w) ? 1 : weak.has(w) || [...strong].some((s) => s.length >= 4 && w.length >= 4 && (s.startsWith(w) || w.startsWith(s))) ? 0.5 : 0);
  return q.reduce((a, w) => a + hit(w), 0) / q.length;
}

/** Ranked hits [{e, score, variants}]; numbered variants (Kenney *_000.._004) collapse into one hit. */
export function search(query, n = 10, entries = sfxEntries()) {
  const groups = new Map();
  for (const e of entries) {
    const s = score(e, query);
    if (s <= 0) continue;
    const key = e.id.replace(/_\d{3}(?![0-9])/, ''), g = groups.get(key);
    if (!g) groups.set(key, { e, score: s, variants: 1 });
    else { g.variants++; if (s > g.score) Object.assign(g, { e, score: s }); }
  }
  return [...groups.values()].sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id)).slice(0, n);
}

const show = ({ e, score: s, variants }) => console.log(`${s.toFixed(2)}  ${e.id}${variants > 1 ? ` (+${variants - 1} variants)` : ''}  [${sourceOf(e)}${e.duration ? `, ${e.duration}s` : ''}]  ${e.title ?? e.name}\n      tags: ${(e.tags ?? []).join(', ')}`);

// ---- files ----
// same lookup as engine/lib/config.mjs + common.py: config value, else setup.ps1's tools/bin build, else PATH
const ffprobe = ((v) => (/[\\/]/.test(v) ? path.resolve(ROOT, v) : v))(cfg.ffprobe || (existsSync(path.join(ROOT, 'tools/bin/ffprobe.exe')) ? 'tools/bin/ffprobe.exe' : 'ffprobe'));
export const duration = (file) => +(+execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { cwd: ROOT, encoding: 'utf8' })).toFixed(2);
const STOP = new Set('a an the of and or with on in at to for one very no music voice voices short quick close up then into from by over about per second only like that sound sounds followed each some its it is'.split(' '));
export const autoTags = (name, prompt) => [...new Set([...name.toLowerCase().split(/[_-]+/), ...words(prompt)].filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 12);
const checkName = (name) => { if (!/^[a-z0-9_-]+$/i.test(name ?? '')) throw new Error(`bad sfx name "${name}" (letters, digits, _ and - only)`); };
const uniqueName = (name, taken = new Set(sfxEntries().map((e) => e.id))) => {
  let n = name;
  for (let i = 2; taken.has(`sfx/${n}`); i++) n = `${name}_${i}`;
  return n;
};

/** Copy files into assets/library/sfx/<source>/ and add manifest entries (one manifest write). items: [{ file, name,
 *  source: 'elevenlabs'|'derived', tags?, title?, prompt?, license?, author?, ...extra }]. Returns the entries. */
export function addFiles(items) {
  const entries = items.map(({ file, name, source = 'derived', tags, title, prompt, license, ...extra }) => {
    checkName(name);
    const dest = path.join(ROOT, cfg.library, 'sfx', source, `${name}${path.extname(file).toLowerCase()}`);
    mkdirSync(path.dirname(dest), { recursive: true });
    if (path.resolve(file) !== dest) copyFileSync(file, dest);
    return {
      id: `sfx/${name}`, type: 'sfx', name, title: title ?? name.replace(/[_-]+/g, ' '), path: posix(dest),
      tags: tags?.length ? tags : autoTags(name, prompt), prompt: prompt ?? null, duration: duration(dest), source,
      license: license ?? ELEVEN_LICENSE, credit_required: false, ...extra,
    };
  });
  upsert(entries);
  return entries;
}

/** ElevenLabs Sound Effects API: text -> mp3 Buffer. */
export async function elevenlabs(prompt, seconds, influence = 0.4) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set (user environment variable)');
  const body = { text: prompt, prompt_influence: influence };
  if (seconds) body.duration_seconds = Math.min(22, Math.max(0.5, +seconds));
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`ElevenLabs returned only ${buf.length} bytes`);
  return buf;
}

/** Generate one effect into the library (refuses a taken name before spending credits). */
export async function generate({ name, prompt, duration: seconds, tags, title, influence }) {
  checkName(name);
  if (!prompt) throw new Error('generate needs --prompt');
  if (sfxEntries().some((e) => e.id === `sfx/${name}`)) throw new Error(`sfx/${name} is already in the library (cue it, or pick another --name)`);
  const file = path.join(ROOT, cfg.library, 'sfx', 'elevenlabs', `${name}.mp3`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, await elevenlabs(prompt, seconds, influence == null ? 0.4 : +influence));
  return addFiles([{ file, name, source: 'elevenlabs', tags, title, prompt }])[0];
}

/** Save an ElevenLabs file made elsewhere (e.g. a production's sfx/) to the library unless the same prompt is already
 *  there (fresh: a new take, always saved); a taken name gets a _2, _3... suffix. Returns the library entry. */
export function saveGenerated(file, { name, prompt, tags, title, fresh = false }) {
  const have = !fresh && sfxEntries().find((e) => e.source === 'elevenlabs' && prompt && e.prompt === prompt);
  // `||`, not `??`: `have` is `false` (not null) for fresh generations, and `??` would skip saving them
  return have || addFiles([{ file, name: uniqueName(name), source: 'elevenlabs', tags, title, prompt }])[0];
}

// ---- CLI ----
function selftest() {
  const lib = [
    { id: 'sfx/footsteps_cobble', name: 'footsteps_cobble', tags: ['footsteps', 'cobblestone', 'boots'], prompt: 'walking on a street' },
    { id: 'sfx/kenney/footstep_snow_000', name: 'footstep_snow_000', tags: ['footstep', 'snow'] },
    { id: 'sfx/kenney/footstep_snow_001', name: 'footstep_snow_001', tags: ['footstep', 'snow'] },
    { id: 'sfx/bell_strike', name: 'bell_strike', tags: ['bell', 'clang'], prompt: 'church bell' },
  ];
  assert.equal(score(lib[0], 'footstep cobblestones'), 1);
  assert.equal(score(lib[0], 'street'), 0.5);
  assert.equal(score(lib[3], 'door'), 0);
  const r = search('snow footsteps', 10, lib);
  assert.deepEqual(r.map((x) => [x.e.id, x.variants]), [['sfx/kenney/footstep_snow_000', 2], ['sfx/footsteps_cobble', 1]]);
  assert.deepEqual(autoTags('door_slam', 'A heavy wooden door slams shut'), ['door', 'slam', 'heavy', 'wooden', 'shut']);
  console.log('sfx_lib selftest ok');
}

async function main() {
  const argv = process.argv.slice(2), cmd = argv[0], pos = [], o = {};
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '-n') o.n = argv[++i];
    else if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
    else pos.push(argv[i]);
  }
  const tags = o.tags ? String(o.tags).split(',').map((t) => t.trim()).filter(Boolean) : undefined;
  const say = (e) => console.log(`${e.id}  ${e.path}  (${e.duration}s)\ncue it in script.json as { "id": "${e.id}" }`);
  if (cmd === 'search') search(pos.join(' ') || o.query || '', +(o.n ?? 10)).forEach(show);
  else if (cmd === 'list') {
    const all = sfxEntries().filter((e) => !o.source || sourceOf(e) === o.source);
    all.forEach((e) => console.log(`${e.id}  [${sourceOf(e)}${e.duration ? `, ${e.duration}s` : ''}]  ${(e.tags ?? []).join(', ')}`));
    console.log(`${all.length} sfx`);
  } else if (cmd === 'generate') say(await generate({ ...o, tags }));
  else if (cmd === 'find-or-generate') {
    const q = o.query ?? pos.join(' '), min = +(o.min ?? 0.6), [best] = search(q, 1);
    if (best && best.score >= min) { show(best); console.log(`library match (score ${best.score.toFixed(2)} >= ${min}): no generation`); say(best.e); }
    else {
      console.log(`no library match >= ${min} for "${q}"${best ? ` (best ${best.e.id} ${best.score.toFixed(2)})` : ''}: generating`);
      say(await generate({ ...o, name: o.name ?? uniqueName(words(q).join('_')), tags: tags ?? words(q) }));
    }
  } else if (cmd === 'add') {
    if (!pos[0] || !existsSync(pos[0])) throw new Error('add needs an existing <file>');
    const { name, title, from, process: proc } = o, src = from && sfxEntries().find((e) => e.id === from);
    if (from && !src) throw new Error(`--from ${from}: no such library sfx`);
    if (!o.license && !src) throw new Error('add needs --from sfx/<id> (inherits its license) or --license "..."');
    say(addFiles([{ file: pos[0], name, source: 'derived', tags, title, prompt: src?.prompt, license: o.license ?? src.license,
      ...(src?.author ? { author: src.author } : {}), ...(from ? { derived_from: from } : {}), ...(proc ? { process: proc } : {}) }])[0]);
  } else if (cmd === 'selftest') selftest();
  else { console.error(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport')[0]); process.exit(1); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
