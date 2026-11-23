// FX recipes: named combos of the existing fx types, usable from any shot's fx list:
//   { type: 'recipe', name: 'bell_tolls', t: 1.2, count: 13, ...params }
// A recipe expands (once per entry, cached) into plain fx entries with shot-local times, so it costs nothing extra and
// behaves exactly like writing the entries by hand. Pure module (no three.js): the library CLI reads RECIPES for the
// catalog (`node engine/cli/library.mjs list --type fx`).
//
// params: { name: [default, 'doc'] } — a default of `undefined` marks a required param.

const req = undefined;
export const RECIPES = {
  hand_reveal: {
    description: 'Magic reveal of a hand/prop: golden glow pulse on the object + white flash + sparkle burst + 2D punch-in.',
    tags: ['reveal', 'magic', 'glow', 'flash', 'sparkle', 'punch', 'climax'],
    params: { at: [req, 'anchor to light up, e.g. "hero.hand_l"'], object: [null, 'mesh/accessory to glow (e.g. "hero.hand_l_mesh")'], t: [0, 'shot-local time of the reveal'],
      color: ['#ffd84a', 'glow colour'], sparkles: [8, 'sparkle count'], flash: [0.5, 'flash alpha'], punch: [0.2, 'punch-in amount (2D zoom, holds)'] },
    expand: (p) => [
      { type: 'glow_pulse', at: p.at, ...(p.object ? { object: p.object } : {}), color: p.color, t: p.t + 0.05, dur: 0.8, sparkles: 0, light: 50, flare: 0.5, emissive: 3 },
      { type: 'sparkles', at: p.at, t: p.t + 0.05, count: p.sparkles },
      { type: 'flash_white', t: p.t, alpha: p.flash, dur: 0.12 },
      { type: 'zoom_punch_in', t: p.t, amount: p.punch, dur: 0.25 },
    ],
  },
  bell_tolls: {
    description: 'A bell tolling N times: a cold flash + small screen shake on every toll.',
    tags: ['bell', 'toll', 'flash', 'shake', 'night', 'ominous'],
    params: { t: [0, 'first toll'], count: [5, 'number of tolls'], interval: [0.25, 'seconds between tolls'], color: ['#cfe0ff', 'flash colour'],
      alpha: [0.55, 'flash alpha'], amp: [0.012, 'shake amplitude'] },
    expand: (p) => Array.from({ length: p.count }, (_, i) => p.t + i * p.interval)
      .flatMap((t) => [{ type: 'flash', color: p.color, alpha: p.alpha, t, dur: 0.12 }, { type: 'camera_shake_impact', t, amp: p.amp, dur: 0.25 }]),
  },
  thunder_clap: {
    description: 'Thunderous impact (a clap, a landing giant, lightning): white flash, shockwave ring of puffs, ground dust burst, heavy shake.',
    tags: ['impact', 'thunder', 'clap', 'shockwave', 'dust', 'shake', 'flash'],
    params: { t: [0, 'impact time'], at: [req, 'shockwave centre [x,y,z]'], dust: [null, 'dust burst centre on the ground (default: below `at`)'],
      scale: [1, 'size multiplier (1 = person-sized clap, 4 = sky-sized thunder)'], flash: [0.7, 'flash alpha'], amp: [0.035, 'shake amplitude'] },
    expand: (p) => {
      const k = p.scale, d = p.dust ?? [p.at[0], 0, p.at[2]];
      return [
        { type: 'flash_white', t: p.t, alpha: p.flash, dur: 0.18 },
        { type: 'camera_shake_impact', t: p.t, amp: p.amp, rot: 2, dur: 0.6 },
        { type: 'particles', kind: 'puff_ring', pos: p.at, bursts: [p.t], count: 14, radial: 6 * k, size: [0.9 * k, 1.2 * k], life: 0.5 },
        { type: 'particles', kind: 'dust_wall', pos: d, area: [30 * k, 1, 8 * k], bursts: [p.t], count: 6, size: [6 * k, 10 * k], life: 2, rate: 0, opacity: 0.35 },
      ];
    },
  },
  monster_entrance: {
    description: 'Monster reveal: dark silhouette over the creature, glowing red eyes pulse, punch-in; optional drifting fog.',
    tags: ['monster', 'horror', 'silhouette', 'eyes', 'reveal', 'scary', 'fog'],
    params: { target: [req, 'actor id (e.g. "grabber")'], t: [0, 'eye-glow time'], amount: [0.92, 'silhouette strength 0..1'], reveal: [false, 'true = silhouette fades 1 -> 0.45 from t'],
      eyes: [null, 'anchor for the eye glow (default "<target>.face")'], eyeColor: ['#ff2a1a', 'eye glow colour'], punch: [0.1, 'zoom punch amount (0 = none)'],
      fog: [null, 'fog wall centre [x,y,z] (null = no fog)'] },
    expand: (p) => [
      p.reveal ? { type: 'silhouette', target: p.target, color: '#0e0a12', from: 1, to: 0.45, t: p.t, dur: 0.5 } : { type: 'silhouette', target: p.target, color: '#0e0a12', amount: p.amount },
      { type: 'glow_pulse', at: p.eyes ?? `${p.target}.face`, color: p.eyeColor, t: p.t, dur: 0.6, sparkles: 0, light: 40 },
      ...(p.punch ? [{ type: 'zoom_punch', t: p.t, amount: p.punch }] : []),
      ...(p.fog ? [{ type: 'particles', kind: 'dust_wall', pos: p.fog, area: [110, 6, 40], rate: 9, color: ['#8a8098', '#9a90a8', '#7a7088'], opacity: 0.42 }] : []),
    ],
  },
  drop_landing: {
    description: 'Something falls from the sky and lands: the set group drops onto its rest position, dust puff + small shake on landing.',
    tags: ['drop', 'fall', 'land', 'impact', 'dust', 'gag'],
    params: { object: [req, 'set group, e.g. "set.crown" (its rest position is the landing spot)'], t: [0, 'landing time'], height: [14, 'fall height (studs)'],
      dur: [0.35, 'fall duration'], dust: [8, 'puff count (0 = none)'], amp: [0.015, 'landing shake (0 = none)'] },
    expand: (p) => [
      { type: 'drop', object: p.object, t: p.t - p.dur, dur: p.dur, height: p.height, dust: p.dust },
      ...(p.amp ? [{ type: 'camera_shake_impact', t: p.t, amp: p.amp, dur: 0.3 }] : []),
    ],
  },
};

export function expandRecipe(e) {
  const r = RECIPES[e.name];
  if (!r) throw new Error(`fx: unknown recipe "${e.name}" (known: ${Object.keys(RECIPES).join(', ')})`);
  const { type, name, ...given } = e, p = {};
  for (const [k, [def]] of Object.entries(r.params)) {
    p[k] = given[k] ?? def;
    if (p[k] === undefined) throw new Error(`fx: recipe "${name}" needs "${k}" (${r.params[k][1]})`);
  }
  return expandRecipes(r.expand({ ...given, ...p }));
}

// Expanded lists are cached per fx list so expanded entries keep their identity across frames (fx state is per entry).
const cache = new WeakMap();
export function expandRecipes(list) {
  if (!list.some((e) => e.type === 'recipe')) return list;
  if (!cache.has(list)) cache.set(list, list.flatMap((e) => (e.type === 'recipe' ? expandRecipe(e) : [e])));
  return cache.get(list);
}

// self-check: bell_tolls reproduces hand-written toll entries
{
  const x = expandRecipe({ type: 'recipe', name: 'bell_tolls', t: 1, count: 2 });
  console.assert(x.length === 4 && x[2].t === 1.25 && x[1].type === 'camera_shake_impact', 'fx recipes self-check failed');
}
