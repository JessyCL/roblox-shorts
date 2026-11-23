// Imports for production files. Keep productions declarative; heavy logic lives in the modules.
export { EASE, ease, lerp, clamp, deg, rng, noise1, fbm1, sampleKeys } from './core/math.js';

// Identity with light validation hook; the director validates fully at load.
export function defineProduction(p) {
  // 30 fps unique frames: the target edits are 30 fps duplicated to 60 (no motion blur);
  // the final mux duplicates frames to 60 fps.
  return { fps: 30, width: 1080, height: 1920, look: 'day', cast: {}, ...p };
}

// Helpers to anchor shots to narration words from timing.json ({ words: [{ start, end, word }], lines: [...] }).
export const wordAt = (timing, i) => timing.words[Math.max(0, Math.min(timing.words.length - 1, i))];
