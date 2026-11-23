// Save a subagent's hand-back report (blocked from writing report.md itself) from its JSONL transcript.
//   node tools/extract_report.mjs <transcript.jsonl> <out report.md> [marker]
// Takes the last text block containing the marker (default "# FULL REPORT"), keeps what follows the marker line,
// and inlines `<!--SHOT_TABLE-->` from work/shots_table.md next to the output if present.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const [src, out, marker = '# FULL REPORT'] = process.argv.slice(2);
const texts = [];
const collect = (v) => {
  if (typeof v === 'string') { if (v.includes(marker)) texts.push(v); return; }
  if (v && typeof v === 'object') for (const x of Object.values(v)) collect(x);
};
for (const line of readFileSync(src, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  try { collect(JSON.parse(line)); } catch { /* partial line */ }
}
if (!texts.length) { console.error(`marker "${marker}" not found`); process.exit(1); }
// Longest match: short hand-back summaries may mention the marker too.
let t = texts.reduce((a, b) => (b.length >= a.length ? b : a));
t = t.slice(t.indexOf(marker));
t = t.slice(t.indexOf('\n') + 1).replace(/^\s*\n/, '');
if (/^ {2}\S/m.test(t) && !/^\S/m.test(t)) t = t.replace(/^ {2}/gm, ''); // undo hand-back indentation
const table = path.join(path.dirname(out), 'work', 'shots_table.md');
if (t.includes('<!--SHOT_TABLE-->') && existsSync(table)) t = t.replace('<!--SHOT_TABLE-->', readFileSync(table, 'utf8').trim());
writeFileSync(out, t);
console.log(`wrote ${out}: ${t.length} chars, ${t.split('\n').length} lines`);
