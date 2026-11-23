// Shared library catalogue: cast presets, environment kits, props, animation clips, fx recipes, music, SFX, models.
//   node engine/cli/library.mjs list   [--type cast|kit|prop|clip|fx|music|sfx|model]
//   node engine/cli/library.mjs search <words...> [--type ...] [--limit 25]
//   node engine/cli/library.mjs index                    rebuild assets/library/catalog.json only
//   node engine/cli/library.mjs thumbs [--type cast|kit|prop] [--only id,id]   preview stills -> assets/library/thumbs/<type>/<id>.png
//                                                        + contact sheet assets/library/thumbs/<type>_sheet.png
// Every command rebuilds catalog.json from the sources first (cast/*.json headers, kits/props `meta` exports, the engine
// clip table, fx/recipes.js, and manifest.jsonl for music/sfx/model). manifest.jsonl is only read, never written.
import { parseArgs } from 'node:util';
import path from 'node:path';
import { readFileSync, readdirSync, existsSync, writeFileSync, renameSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT } from '../lib/server.mjs';

const LIB = path.join(PROJECT_ROOT, 'assets', 'library');
const rel = (p) => path.relative(PROJECT_ROOT, p).split(path.sep).join('/');
const TYPES = ['cast', 'kit', 'prop', 'clip', 'fx', 'music', 'sfx', 'model'];

// One-line descriptions for the procedural engine clips (imported kenney.* / ual.* clips get generated ones).
const CLIP_INFO = {
  stand: 'frozen neutral stand', idle: 'subtle breathing idle', walk: 'R6 walk cycle (loco: to/path)', run: 'run cycle (loco)', sprint: 'fast sprint, leaning (loco)',
  jump: 'single jump, arms up (height)', bounce: 'repeated bouncing jumps', fall: 'falling, arms flailing up', wave: 'right-hand wave', point: 'point at target (aims the arm)',
  talk: 'talking hand gestures', cheer: 'both arms up, hopping cheer', cry: 'hands to face crying', scared: 'cowering, shaking', shrug: 'shoulder shrug (one-shot)',
  facepalm: 'hand to forehead', nod: 'yes nod', headshake: 'no head shake', sit: 'sit (seat height / ground: true)', kneel: 'one knee down', crouch: 'crouch low',
  punch: 'alternating punches', kick: 'single kick', dance: 'side-to-side dance', climb: 'climb a ladder/pipe (loco along path)', fly: 'superhero flight pose', swim: 'swimming crawl',
  trip: 'trip and faceplant (one-shot)', fall_down: 'alias of trip', stumble: 'alias of trip', lie: 'lie on the back (front: true = face down)', look_around: 'head scanning left/right',
  laugh: 'laughing, leaning back', sneeze: 'wind-up and sneeze', float: 'ghostly hovering', zombie: 'arms-out zombie shuffle (loco)', hold: 'right arm held forward',
  hold_l: 'left arm held forward', hold_both: 'both arms forward (offering/holding)', hold_up: 'right arm raised high', carry: 'carry something in both arms', carry_low: 'carry a heavy load low',
  hug: 'hug pose', lift: 'both arms lifted overhead', grab: 'grab forward with the right hand', drag: 'drag something behind, leaning (loco)', push: 'push forward, leaning (loco)',
  carried: 'lying across someone’s arms', held: 'dangling, held up', write: 'writing on a clipboard', yell: 'alias of talk',
  stomp: 'stomping applause: alternate stomps, one hand up (crowd-friendly)', clap: 'clapping hands in front of the chest', eat: 'hand to mouth eating (dangle: true swings legs)',
  sew: 'sewing with a needle', knit: 'knitting (works as a sit layer)', mouth_cover: 'hand clamped over the mouth', hand_over_mouth: 'alias of mouth_cover',
  palms_up: 'both palms up, pleading/asking', reach: 'both arms reaching forward (monster grab)', shake_fist: 'angry raised fist shaking', hop: 'hopping on one leg',
  knock: 'knocking on a door', drag_walk: "giant's heavy knuckle-dragging walk (loco)", crouch_low: 'hunched deep crouch in the dark', stand_up: 'rise from crouch_low (one-shot)',
  rope_climb: 'hand over hand up a rope, legs clamped (loco along a vertical path)', hang_ankle: 'hanging upside down by the right ankle (= actor root), lantern swing (swing, period)',
  ankle_lift: 'yanked up by the right ankle, tips over into hang_ankle (one-shot; animate at keys upward)', tiptoe: 'tiny quick steps on the toes, arms out (loco)',
  tiptoe_stand: 'up on the toes, heels lifted, wobbling', untie: 'both hands working a knot in front (low: true = kneeling at an ankle knot)', hold_rope: "clutching one's own rope at the chest (away: deg = looking away)", hold_rope_away: 'hold_rope looking away left/right by phase (crowd-friendly, no params)', hold_bar: 'both hands on a bar at chest height, leaning back, straining (strain 0..1, look, turn)', push_door: 'leaning hard into a door with both hands, feet braced, trembling (strain, high 0..1, look, turn)', sleep: 'lying on the back asleep, slow deep breathing, head rolled aside (snore 0..1, period, roll)',
  pose: 'static custom pose ({ pose: {...} })', keys: 'keyframed custom poses ({ keys: [{ t, pose }] })',
};
const CLIP_TAGS = { loco: 'locomotion', dur: 'one-shot', loop: 'loop' };

const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const files = (dir, ext) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext) && !f.startsWith('_')).sort() : []);
const flatTags = (t) => (Array.isArray(t) ? t : Object.values(t ?? {}).flat()).map(String);
const thumbOf = (type, id) => { const f = path.join(LIB, 'thumbs', type, `${id}.png`); return existsSync(f) ? rel(f) : null; };

export async function buildCatalog() {
  const items = [];
  for (const f of files(path.join(LIB, 'cast'), '.json')) {
    const j = readJson(path.join(LIB, 'cast', f)), h = j.header ?? {}, id = h.id ?? f.slice(0, -5);
    items.push({ type: 'cast', id, tags: flatTags(h.tags), description: h.description ?? '', file: rel(path.join(LIB, 'cast', f)), thumb: thumbOf('cast', id), meta: h.tags });
  }
  for (const [type, dir] of [['kit', 'kits'], ['prop', 'props']]) for (const f of files(path.join(LIB, dir), '.js')) {
    const file = path.join(LIB, dir, f), id = f.slice(0, -3);
    let m = {};
    try { m = (await import(pathToFileURL(file).href)).meta ?? {}; } catch (e) { console.warn(`library: ${rel(file)} meta unreadable (${e.message})`); }
    items.push({ type, id, tags: flatTags(m.tags), description: m.description ?? '', file: rel(file), thumb: thumbOf(type, id), options: m.options, anchors: m.anchors });
  }
  const att = await import(pathToFileURL(path.join(LIB, 'attachments.js')).href);
  for (const [id, m] of Object.entries(att.meta)) {
    items.push({ type: 'prop', id: `attach:${id}`, tags: ['attachment', 'character', ...m.tags], description: `${m.description} Cast spec: attach: ['${id}'].`, file: 'assets/library/attachments.js', thumb: null });
  }
  const { CLIPS } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'engine/runtime/characters/anim.js')).href);
  for (const [id, c] of Object.entries(CLIPS)) {
    items.push({ type: 'clip', id, tags: ['procedural', ...Object.keys(CLIP_TAGS).filter((k) => c[k]).map((k) => CLIP_TAGS[k]), ...id.split('_')], description: CLIP_INFO[id] ?? id.replace(/_/g, ' '), file: 'engine/runtime/characters/anim.js', thumb: null });
  }
  for (const [prefix, f] of [['kenney', 'kenney-blocky.json'], ['ual', 'ual.json']]) {
    const p = path.join(LIB, 'characters', 'animations', f);
    if (!existsSync(p)) continue;
    for (const [name, c] of Object.entries(readJson(p).clips ?? {})) {
      const words = name.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/\bloop\b|\b0\d\b/g, '').trim();
      items.push({ type: 'clip', id: `${prefix}.${name}`, tags: ['imported', prefix, c.loop ? 'loop' : 'one-shot', ...words.split(/\s+/)], description: `${words} (imported ${prefix === 'ual' ? 'Quaternius UAL' : 'Kenney Blocky'} clip, CC0)`, file: rel(p), thumb: null });
    }
  }
  const { RECIPES } = await import(pathToFileURL(path.join(PROJECT_ROOT, 'engine/runtime/fx/recipes.js')).href);
  for (const [id, r] of Object.entries(RECIPES)) {
    items.push({ type: 'fx', id, tags: ['recipe', ...r.tags], description: `${r.description} Use { type: 'recipe', name: '${id}', ... }.`, file: 'engine/runtime/fx/recipes.js', thumb: null,
      options: Object.fromEntries(Object.entries(r.params).map(([k, [def, doc]]) => [k, `${doc}${def === undefined ? ' (required)' : ` (${JSON.stringify(def)})`}`])) });
  }
  const man = path.join(LIB, 'manifest.jsonl');
  if (existsSync(man)) for (const line of readFileSync(man, 'utf8').split('\n')) { // tolerate a line being written right now
    let x; try { x = JSON.parse(line); } catch { continue; }
    const type = x.type ?? x.kind; // music/sfx entries use `type`, imported models `kind`
    if (!['music', 'sfx', 'model'].includes(type)) continue;
    const license = typeof x.license === 'object' ? x.license?.id : x.license;
    const name = x.title ?? x.name ?? (type === 'model' ? `${x.id.split('.').pop()} (${x.category})` : null);
    const desc = x.description ?? x.prompt ?? [name, (x.author ?? x.source?.name) && `by ${x.author ?? x.source.name}`, license].filter(Boolean).join(' - ');
    items.push({ type, id: x.id, tags: flatTags(x.tags ?? x.category), description: desc, file: x.path ?? (x.file ? `assets/library/${x.file}` : null), thumb: null, license: license ?? null });
  }
  return { generated: 'node engine/cli/library.mjs index', counts: Object.fromEntries(TYPES.map((t) => [t, items.filter((i) => i.type === t).length])), items };
}

function writeCatalog(cat) {
  const f = path.join(LIB, 'catalog.json'), tmp = `${f}.${process.pid}.tmp`, body = JSON.stringify(cat, null, 1) + '\n';
  if (existsSync(f) && readFileSync(f, 'utf8') === body) return;
  writeFileSync(tmp, body);
  renameSync(tmp, f); // atomic replace (catalog.json is generated; only this tool writes it)
}

export function search(items, words, type) {
  const toks = words.map((w) => w.toLowerCase()).filter(Boolean);
  return items.filter((i) => !type || i.type === type).map((i) => {
    const id = i.id.toLowerCase(), tags = i.tags.map((t) => t.toLowerCase()), desc = i.description.toLowerCase();
    let score = 0, hits = 0;
    for (const t of toks) {
      const s = (id === t ? 6 : id.includes(t) ? 3 : 0) + (tags.includes(t) ? 3 : tags.some((x) => x.includes(t)) ? 1 : 0) + (desc.includes(t) ? 1 : 0);
      score += s; if (s) hits++;
    }
    return { i, score: score * (hits === toks.length ? 2 : 1) }; // all words matched ranks first
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || TYPES.indexOf(a.i.type) - TYPES.indexOf(b.i.type) || a.i.id.localeCompare(b.i.id)).map((r) => r.i);
}

const show = (list) => {
  for (const i of list) console.log(`${i.type.padEnd(5)} ${i.id.padEnd(28)} ${i.description.slice(0, 110)}${i.description.length > 110 ? '...' : ''}`);
  console.log(`(${list.length} item${list.length === 1 ? '' : 's'})`);
};

// ---------- thumbnails: a generated throwaway production, one 1-s shot per item, rendered with the still pipeline ----------
const CAM_PREF = ['cam_wide', 'cam_aerial', 'cam_front', 'cam_ews', 'cam_street', 'cam_walk', 'cam_top', 'cam_aisle'];
function thumbProduction(list) {
  const lines = ["import { defineProduction } from '/engine/runtime/api.js';", 'const sets = {}, cast = {}, shots = [];', 'let t = 0;',
    "const studio = (S) => { S.look('day'); S.ground({ material: 'SmoothPlastic', color: '#cfd6de', size: 400 }); };",
    'const add = (s) => { shots.push({ start: t, end: t + 1, ...s }); t += 1; };'];
  let studio = false;
  for (const i of list) {
    const q = JSON.stringify(i.id);
    if (i.type === 'kit') {
      const cam = CAM_PREF.find((c) => i.anchors?.[c]) ?? Object.keys(i.anchors ?? {}).find((k) => k.startsWith('cam_'));
      lines.push(`sets['kit:' + ${q}] = (S) => S.kit(${q});`);
      lines.push(`add({ id: 'kit:' + ${q}, set: 'kit:' + ${q}, camera: ${cam ? `{ move: 'static', pos: 'set.${cam}', target: 'set.${cam}_at', fov: 50, zoom: 0 }` : "{ move: 'static', pos: [30, 25, 60], target: [0, 5, 0], fov: 50, zoom: 0 }"} });`);
    } else if (i.type === 'prop') {
      lines.push(`sets['prop:' + ${q}] = async (S) => { studio(S); await S.prop(${q}, { name: 'thumb' }); };`);
      lines.push(`{ const cam = { move: 'static', pos: [6, 4, 10], target: [0, 1, 0], fov: 40, zoom: 0 }; let done = false;
  add({ id: 'prop:' + ${q}, set: 'prop:' + ${q}, camera: cam, update(ctx) { if (done) return; done = true; // frame the prop's bounding sphere
    const sph = new ctx.THREE.Box3().setFromObject(ctx.set.S.groups.thumb).getBoundingSphere(new ctx.THREE.Sphere()), c = sph.center, r = Math.max(0.4, sph.radius);
    cam.target = [c.x, c.y, c.z]; cam.pos = [c.x + r * 2.4, c.y + r * 1.6, c.z + r * 4.4]; } }); }`);
    } else if (i.type === 'cast') {
      const spec = readJson(path.join(PROJECT_ROOT, i.file)).spec, key = `c_${i.id}`;
      lines.push(`cast[${JSON.stringify(key)}] = { preset: ${q} };`);
      if (!studio) { lines.push('sets.studio = studio;'); studio = true; }
      const camera = spec.crowd ? "{ move: 'static', pos: [0, 9, 30], target: [0, 2, 0], fov: 50, zoom: 0 }"
        : `{ move: 'static', target: ${JSON.stringify(key)}, frame: '${(spec.height ?? 0) > 7 ? 'ws' : (spec.scale ?? 1) < 0.7 || spec.template === 'baby' ? 'ms' : 'mws'}', yaw: 25, fov: 40, zoom: 0 }`;
      lines.push(`add({ id: 'cast:' + ${q}, set: 'studio', actors: { ${JSON.stringify(key)}: { at: [0, 0, 0], yaw: 0, ${spec.crowd ? '' : "anim: [{ clip: 'idle' }], "} } }, camera: ${camera} });`);
    }
  }
  lines.push("export default defineProduction({ look: 'day', camera: { widen: 1.15 }, cast, sets, shots });");
  return lines.join('\n') + '\n';
}
const sets = {};

async function thumbs(items, type, only) {
  const types = type ? [type] : ['cast', 'kit', 'prop'];
  if (types.some((t) => !['cast', 'kit', 'prop'].includes(t))) throw new Error('thumbs: --type must be cast, kit or prop');
  const { startServer } = await import('../lib/server.mjs');
  const { writePng } = await import('../lib/encoder.mjs');
  const { openProduction, closeBrowser } = await import('./common.mjs');
  for (const t of types) {
    const list = items.filter((i) => i.type === t && /^assets\/library\/(cast|kits|props)\//.test(i.file) && (!only || only.includes(i.id))); // not attach:* entries
    if (!list.length) continue;
    const dir = path.join(LIB, 'thumbs', '_render'), out = path.join(LIB, 'thumbs', t);
    mkdirSync(dir, { recursive: true }); mkdirSync(out, { recursive: true });
    writeFileSync(path.join(dir, 'production.js'), thumbProduction(list));
    const server = await startServer();
    let browser;
    try {
      const o = await openProduction(server, '/' + rel(path.join(dir, 'production.js')), { quality: 'preview', scale: 0.5, fps: 30 });
      browser = o.browser;
      const writes = [];
      server.state.sink = async (buf, f) => {
        const item = list[Math.floor(f / o.info.fps)], file = path.join(out, `${item.id}.png`);
        writes.push(writePng(buf, { width: o.info.width, height: o.info.height, yuv: true, out: file }).then(() => console.log(rel(file))));
      };
      for (let k = 0; k < list.length; k++) await o.page.evaluate((f) => R.capture(f, 1), Math.round((k + 0.6) * o.info.fps));
      await Promise.all(writes);
    } finally {
      if (browser) await closeBrowser(browser);
      await server.close();
      rmSync(dir, { recursive: true, force: true });
    }
    contactSheet(t, list.map((i) => i.id).filter((id) => existsSync(path.join(out, `${id}.png`))));
  }
}

function contactSheet(type, ids) { // grid of 6 columns, 270x480 cells, item id under each
  if (!ids.length) return;
  const cols = Math.min(6, ids.length), W = 270, H = 480, args = ['-y', '-v', 'error'];
  const font = 'assets/fonts/Poppins-Bold.ttf';
  ids.forEach((id) => args.push('-i', `assets/library/thumbs/${type}/${id}.png`));
  const f = ids.map((id, k) => `[${k}:v]scale=${W}:${H},drawtext=fontfile=${font}:text='${id}':fontsize=20:fontcolor=white:borderw=3:x=(w-tw)/2:y=h-36[v${k}]`);
  const layout = ids.map((_, k) => `${(k % cols) * W}_${Math.floor(k / cols) * H}`).join('|');
  f.push(`${ids.map((_, k) => `[v${k}]`).join('')}xstack=inputs=${ids.length}:layout=${layout}:fill=black[out]`);
  const sheet = `assets/library/thumbs/${type}_sheet.png`;
  const r = spawnSync('ffmpeg', [...args, '-filter_complex', ids.length === 1 ? f[0].replace('[v0]', '[out]') : f.join(';'), '-map', '[out]', '-frames:v', '1', sheet], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`contact sheet failed: ${r.stderr}`);
  console.log(sheet);
}

// ---------- main ----------
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values: o, positionals } = parseArgs({ allowPositionals: true, options: { type: { type: 'string' }, limit: { type: 'string', default: '25' }, only: { type: 'string' } } });
  const [cmd, ...words] = positionals;
  if (o.type && !TYPES.includes(o.type)) throw new Error(`--type must be one of ${TYPES.join(', ')}`);
  const cat = await buildCatalog();
  writeCatalog(cat);
  if (cmd === 'index') console.log(`catalog.json: ${Object.entries(cat.counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  else if (cmd === 'list') show(cat.items.filter((i) => !o.type || i.type === o.type));
  else if (cmd === 'search') {
    if (!words.length) throw new Error('usage: library.mjs search <words...> [--type t]');
    show(search(cat.items, words, o.type).slice(0, Number(o.limit)));
  } else if (cmd === 'thumbs') {
    await thumbs(cat.items, o.type, o.only?.split(','));
    writeCatalog(await buildCatalog()); // pick up the new thumb paths
  } else {
    console.log('usage: node engine/cli/library.mjs list|search <words>|index|thumbs [--type cast|kit|prop|clip|fx|music|sfx|model]');
    process.exitCode = 1;
  }
}
