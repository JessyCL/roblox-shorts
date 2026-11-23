// Prototype: small worked example (original assets).
// Shot boundaries come from timing.json (narration word timings): each cut lands 1 frame before a word onset.
import { defineProduction, clamp, EASE } from '/engine/runtime/api.js';
import timing from './timing.json' with { type: 'json' };

const FPS = 30;
const word = (line, w) => {
  const x = timing.words.find((q) => q.line === line && q.w === w);
  if (!x) throw new Error(`no word ${line}:${w}`);
  return x;
};
const cut = (line, w) => Math.max(0, word(line, w).start - 1 / FPS);
const END = timing.duration;

// Cut points (absolute seconds), in shot order.
const T = [0, cut('L01', 9), cut('L02', 0), cut('L02', 8), cut('L03', 0), cut('L04', 0), cut('L05', 0), cut('L06', 0), END];
const span = (i) => ({ start: T[i], end: T[i + 1] });
const local = (i, line, w) => word(line, w).start - T[i]; // shot-local time of a word

export default defineProduction({
  look: 'day',
  cast: { // library presets (assets/library/cast)
    baby: { preset: 'newborn' }, waitA: { preset: 'queue_cardigan' }, waitB: { preset: 'queue_old_man' }, waitC: { preset: 'queue_hoodie' },
    tam: { preset: 'tam' }, legend1: { preset: 'legend_suit' }, legend2: { preset: 'legend_purple' },
  },
  sets: { // library kits + props (assets/library/kits, assets/library/props)
    nursery: (S) => S.kit('nursery'),
    plaza: (S) => S.kit('brick_plaza'), // NOW SERVING sign hanging from sky-clouds + 360-person serpentine queue
    legend: async (S) => {
      await S.kit('legend_street');
      await S.prop('crown', { name: 'crown', pos: [0, 14, 0] }); // pivot = crown centre; dropped onto legend1's head in shot 7
      await S.prop('boat', { name: 'boat', pos: [0, 18, 0] });   // pivot = hull centre; dropped in shot 8
    },
  },
  shots: [
    { // 1. hook: intro zoom-blur onto the newborn, push onto the ticket number
      id: 'ticket', set: 'nursery', ...span(0),
      actors: { baby: { at: [0, 0.6, 0], yaw: 180, anim: [{ clip: 'lie' }], face: 'sleepy' } },
      camera: { move: 'static', target: [0, 1.4, 0.9], angle: 'top', dist: 8.5, fov: 40, zoom: { from: 1, to: 1.7, ease: 'outCubic' } },
      fx: [{ type: 'intro_zoom_blur', t: 0 }],
      post: { dof: { focus: 'set.ticket', bokeh: 2 } },
    },
    { // 2. aerial of the endless queue
      id: 'aerial', set: 'plaza', ...span(1),
      camera: { move: 'static', target: [-6, 0, -14], pitch: 42, dist: 84, yaw: 32, fov: 60, zoom: 'slow' },
    },
    { // 3. tilt up from the queue's backs to the hanging sign, spring settle
      id: 'tiltup', set: 'plaza', ...span(2),
      camera: { move: 'tilt', pos: [0, 6, 2], target: [0, 4.5, -8], aimTo: 'set.sign', t: 0.15, dur: 0.5, ease: 'spring', fov: 52 },
    },
    { // 4. low angle on the sign
      id: 'sign', set: 'plaza', ...span(3),
      camera: { move: 'static', target: [0, 24, -40], pos: [22, 9, 78], fov: 58, zoom: 'slow' },
    },
    { // 5. same sign at night ("for 200 years")
      id: 'sign_night', set: 'plaza', ...span(4), look: 'night',
      camera: { move: 'static', target: [0, 24, -40], pos: [22, 9, 78], fov: 58, zoom: 'slow' },
      post: { grade: { preset: 'night' } },
    },
    { // 6. people waiting in line
      id: 'waiting', set: 'plaza', ...span(5),
      actors: {
        waitA: { at: [-3.2, 0, 34], yaw: 18, anim: [{ clip: 'look_around' }] },
        waitB: { at: [0.4, 0, 33], yaw: 0, anim: [{ clip: 'idle' }] },
        waitC: { at: [3.6, 0, 34.5], yaw: -16, anim: [{ clip: 'shrug', t: 0.4 }] },
        tam: { at: [-10, 0, 38.5], anim: [{ clip: 'walk', to: [10, 0, 38.5], speed: 9 }] },
      },
      camera: { move: 'static', target: [0, 3, 35], pos: [0, 4.6, 53], fov: 52, zoom: 'slow' },
      post: { dof: { focus: 'waitB.head', bokeh: 3 } },
    },
    { // 7. legend #1 asks for a crown; it drops in; face swap on the payoff word
      id: 'legend1', set: 'legend', ...span(6),
      actors: { legend1: { at: [0, 0, -16], face: [{ t: 0, expr: 'smile' }, { t: local(6, 'L05', 12), expr: 'grin' }],
        anim: [{ clip: 'walk', to: [0, 0, 0], speed: 10 }, { t: local(6, 'L05', 10) + 0.25, clip: 'cheer' }] } },
      camera: { move: 'static', target: [0, 3, -4], pos: [0, 4.2, 14], fov: 58, zoom: { from: 1, to: 1.45, ease: 'inOutSine' } },
      fx: [{ type: 'particles', kind: 'puff', at: 'legend1.head', t: local(6, 'L05', 10) + 0.2, count: 8 }],
      update(ctx) {
        const land = word('L05', 10).start;
        const u = EASE.inQuad(clamp((ctx.t - land) / 0.2));
        ctx.set.S.groups.crown.position.y = 14 - u * (14 - 5.55); // pivot = crown centre (world y): sky -> head top
      },
    },
    { // 8. legend #2 asks for a boat
      id: 'legend2', set: 'legend', ...span(7),
      actors: { legend2: { at: [-7, 0, -10], face: [{ t: 0, expr: 'smile' }, { t: local(7, 'L06', 5), expr: 'happy' }],
        anim: [{ clip: 'walk', to: [-0.6, 0, -6], speed: 9 }, { t: local(7, 'L06', 4) + 0.3, clip: 'jump' }] } },
      camera: { move: 'static', target: [0.5, 3.2, -8], pos: [1, 4.4, 10], fov: 58, zoom: 'slow' },
      update(ctx) {
        const land = word('L06', 4).start;
        const u = EASE.inQuad(clamp((ctx.t - land) / 0.25));
        ctx.set.S.groups.crown.position.y = 50; // crown out of this shot
        ctx.set.S.groups.boat.position.set(3.4, 18 - u * 17.4, -13); // pivot = hull centre (world): sky -> ground
      },
    },
  ],
});
