// node --test engine/captions/ass.test.mjs : grouping, text normalisation and pause blanking of ass.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaptions } from './ass.mjs';

const W = (s, t0 = 0, dt = 0.2, gaps = {}) => {
  let t = t0;
  return s.split(' ').map((word, i) => { t += gaps[i] ?? 0; const w = { word, start: t, end: t + dt }; t += dt; return w; });
};

test('function words attach forward, max 3 words, never end a caption', () => {
  const caps = buildCaptions({ duration: 20, words: W('In this world, everyone is born since the day I was born.') });
  assert.deepEqual(caps.map((c) => c.text), ['in this world,', 'everyone', 'is born', 'since the day', 'i was born']);
});

test('words kept as written, punctuation, blank in pauses', () => {
  const caps = buildCaptions({ duration: 20, words: W('It hit 3, then one more. Wait...', 0, 0.2, { 6: 0.6 }) });
  assert.deepEqual(caps.map((c) => c.text), ['it hit 3,', 'then one more', 'wait']);
  assert.ok(caps[1].end < caps[2].start, 'caption must clear during the 0.6 s pause');
  assert.equal(caps[0].start, 0);
});
