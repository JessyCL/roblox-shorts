// Word-timed captions: productions/<slug>/timing.json -> captions.ass (burned in by libass in make.mjs) + captions.json
// ({ style, words: [{ start, end, text }] } for the browser preview; one entry per on-screen caption).
//   node engine/captions/ass.mjs productions/<slug> [--font poppins|montserrat|archivo] [--color white|yellow|#RRGGBB]
//        [--y 0.70] [--size 145] [--outline 7] [--pop]   (145 = 'everybody' ~460 px wide @1080, as measured in the refs)
// Defaults come from productions/<slug>/caption_style.json if present ({ font, color, y, size, outline, pop }), then flags.
// House style (sample analyses): Poppins Bold, white, black outline ~7 px @1080, drop shadow (+3,+6), centred at
// y = 70 % of height, 1-3 lowercase words per caption (short function words attach to the next word), commas/?/! kept,
// periods dropped, words exactly as in script.json (digits only where the script uses them), hard cut on at the word onset, blank during pauses (> 0.25 s).
// --pop: each caption scales 84 % -> 100 % over 4 frames (133 ms) via \t. Fonts live in assets/fonts (OFL).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const FONTS = { poppins: ['Poppins', -1], montserrat: ['Montserrat ExtraBold', 0], archivo: ['Archivo Black', 0] };
const COLORS = { white: '#FFFFFF', yellow: '#F2FC0C' };
const FUNC = new Set(('a an the of to in on at by for from with into onto over under about above below and but or nor so ' +
  'if as than then that this these those is am are was were be been being it its i im my me we our us you your he his him ' +
  'she her they them their do does did has have had will would can could should not no just when while who what which ' +
  'since until because after before though although through across around toward towards upon without within every each ' +
  'some any all there here how why where').split(' '));
const PAUSE = 0.25; // gap (s) that blanks the caption and breaks a group
const txt = (w) => w.text ?? w.word; // timing.json tokens: {text} (script schema); older files used {word}

export function groupWords(words) {
  const bare = (w) => txt(w).toLowerCase().replace(/[^a-z0-9']/g, '');
  const clauseEnd = (w) => /[.,!?;:…]$/.test(txt(w));
  const groups = [];
  for (let i = 0; i < words.length; ) {
    const g = [words[i++]];
    // a function word (or a very short word) pulls in the next word, up to 3 words, never across a pause or clause end
    while (g.length < 3 && i < words.length && !clauseEnd(g.at(-1)) && words[i].start - g.at(-1).end < PAUSE &&
           (FUNC.has(bare(g.at(-1))) || bare(g.at(-1)).length <= 3)) g.push(words[i++]);
    // a group never ends on a function word: hand it to the next caption ('the day i' -> 'the day' + 'i was born')
    if (g.length > 1 && FUNC.has(bare(g.at(-1))) && !clauseEnd(g.at(-1)) && i < words.length) { g.pop(); i--; }
    groups.push(g);
  }
  return groups;
}

export function captionText(g) {
  return g.map((w) => {
    // Words stay as written: script.json already uses digits where a number should show ("13 times"), while
    // "one hand" / "needs one" must stay words, so no word->digit conversion here.
    return txt(w).toLowerCase().replace(/[{}\\"“”]/g, '').replace(/\.+|…/g, '');
  }).join(' ').trim();
}

export function buildCaptions(timing, style = {}) {
  const groups = groupWords(timing.words);
  return groups.map((g, k) => {
    const start = g[0].start, lastEnd = g.at(-1).end, next = groups[k + 1]?.[0].start ?? Infinity;
    const end = next - lastEnd > PAUSE ? lastEnd + 0.05 : next; // blank in pauses, otherwise hand straight to the next caption
    return { start: +start.toFixed(3), end: +Math.min(end, timing.duration).toFixed(3), text: captionText(g) };
  });
}

const assTime = (s) => {
  const cs = Math.round(s * 100), h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, sec = Math.floor(cs / 100) % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};
const assColor = (hex) => { const h = hex.replace('#', ''); return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); };

export function toAss(caps, st) {
  const [font, bold] = FONTS[st.font] ?? FONTS.poppins;
  const y = Math.round(1920 * st.y);
  const pop = st.pop ? '\\fscx84\\fscy84\\t(0,133,\\fscx100\\fscy100)' : '';
  return [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1080', 'PlayResY: 1920', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', 'YCbCr Matrix: TV.709', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Cap,${font},${st.size},${assColor(COLORS[st.color] ?? st.color)},&H000000FF,&H00000000,&H60000000,${bold},0,0,0,100,100,0,0,1,${st.outline},3,5,60,60,0,1`,
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...caps.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Cap,,0,0,0,,{\\pos(540,${y})\\xshad3\\yshad6${pop}}${c.text}`),
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values: o, positionals } = parseArgs({ allowPositionals: true, options: {
    font: { type: 'string' }, color: { type: 'string' }, y: { type: 'string' }, size: { type: 'string' },
    outline: { type: 'string' }, pop: { type: 'boolean' } } });
  if (!positionals[0]) { console.error('usage: node engine/captions/ass.mjs productions/<slug> [--font ..] [--color ..] [--y ..] [--pop]'); process.exit(1); }
  const dir = path.resolve(positionals[0]);
  const file = path.join(dir, 'caption_style.json');
  const st = { font: 'poppins', color: 'white', y: 0.7, size: 145, outline: 7, pop: false,
    ...(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}),
    ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) };
  st.y = +st.y; st.size = +st.size; st.outline = +st.outline;
  const timing = JSON.parse(readFileSync(path.join(dir, 'timing.json'), 'utf8'));
  const caps = buildCaptions(timing, st);
  writeFileSync(path.join(dir, 'captions.ass'), toAss(caps, st));
  writeFileSync(path.join(dir, 'captions.json'), JSON.stringify({ style: st, words: caps }, null, 1));
  console.log(`${caps.length} captions -> ${path.relative(process.cwd(), path.join(dir, 'captions.ass'))}: ` + caps.map((c) => c.text).join(' | '));
}
