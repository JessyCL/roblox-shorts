// "Everyone Has ONE Hand" - shot list. Cuts land 1 frame before the first word of each clause (timing.json).
// Sets and cast live in sets.js (built from the shared library). Lenny's second hand stays hidden (sewn sleeve) until L19.
import { defineProduction, clamp, lerp, EASE } from '/engine/runtime/api.js';
import timing from './timing.json' with { type: 'json' };
import { CAST, SETS, TOGGLES, attachExtras, hillY, roadY, roadX } from './sets.js';

const FPS = 30;
const word = (line, w) => {
  const x = timing.words.find((q) => q.line === line && q.w === w);
  if (!x) throw new Error(`no word ${line}:${w}`);
  return x;
};
const cut = (line, w) => Math.max(0, Math.round((word(line, w).start - 1 / FPS) * FPS) / FPS);
const END = timing.duration;

// ---------- helpers ----------
const st = (pos, target, o = {}) => ({ move: 'static', pos, target, fov: 50, zoom: 0.08, ...o }); // locked-off camera, pans to follow
const fr = (target, frame, o = {}) => ({ move: 'static', target, frame, fov: 50, zoom: 0.1, ...o });
const snow = () => ({ type: 'particles', kind: 'snow', rate: 170 });
const fog = (pos, o = {}) => ({ type: 'particles', kind: 'dust_wall', pos, area: [110, 6, 40], rate: 9, color: ['#8a8098', '#9a90a8', '#7a7088'], opacity: 0.42, ...o });
const sil = (target, amount = 0.92, o = {}) => ({ type: 'silhouette', target, color: '#0e0a12', amount, ...o });
const POCKET = { lArm: [-5, 3, 0] };
// Lenny ('short' build) sitting at seat height 3.9: hips raised 3.9 + 0.48 - 1.44 (CLIPS.sit), legs out.
const SIT_LENNY = { off: [0, 2.94, 0], lLeg: [90, 0, 0], rLeg: [90, 0, 0], torso: [-2, 0, 0] }; // left arm kept still, hand "in the pocket"
const asList = (a) => (Array.isArray(a) ? a : a ? [a] : [{ clip: 'idle' }]).map((e) => (typeof e === 'string' ? { clip: e } : e));
// Lenny before L19: second hand hidden under the sewn sleeve and the arm kept still. After: both hands.
const pre = (o) => ({ ...o, hide: [...(o.hide ?? []), 'hand_l_mesh'], anim: asList(o.anim).map((e) => ({ ...e, pose: { ...POCKET, ...e.pose } })) });
const post = (o) => ({ ...o, hide: [...(o.hide ?? []), 'stitch_l'] });
const DEFAULT_HIDE = { v5: ['box'], v3: ['jar'], v4: ['jar'], mom: ['needle'], grabber: ['bellHeld'], grabberKind: ['bellHeld'], abernathy: ['bootHeld'] };
const vis = (ctx, actor, key, on) => { const a = ctx.actors[actor]?.accessories?.[key]; if (a) a.visible = on; };
const grp = (ctx, name) => ctx.set.S.groups[name];
const place = (g, x, y, z, yaw = 0) => { const p = g.userData.pivot; g.position.set(x ?? p[0], y ?? p[1], z ?? p[2]); g.rotation.set(0, (yaw * Math.PI) / 180, 0); };
const NIGHT = { preset: 'night', exposure: 1.2, hemi: { sky: '#5a72b8', ground: '#1a2238', intensity: 0.95 } }; // saturated navy, readable
const SKY = { day: ['#8fc8f0', '#4a8ad0', 0.55], night: ['#14224e', '#1e3a8a', 0.9], dawn: ['#f2b07a', '#e07a3a', 0.6] };

function applyProps(ctx, shot) {
  const S = ctx.set.S, defs = TOGGLES[shot.set] ?? {};
  for (const [name, def] of Object.entries(defs)) {
    const g = S.groups[name];
    if (!g) continue;
    g.visible = shot.props?.[name] ?? def;
    const p = g.userData.pivot; g.position.set(p[0], p[1], p[2]); g.rotation.set(0, 0, 0);
  }
  if (shot.set === 'village') for (const side of [-1, 1]) for (const s of [-1, 1]) { const g = S.groups[`shut_${side}_${s}`]; g.rotation.set(0, side * s * Math.PI, 0); }
  if (shot.set === 'house') {
    for (const n of ['pipShutL', 'pipShutR']) S.groups[n].rotation.set(0, 0, 0);
    const [c, e, k] = SKY[shot.sky ?? 'day'];
    for (const n of ['lennySky', 'pipSky', 'livingSky']) { const m = S.anchors[n].material; m.color.set(c); m.emissive.set(e); m.emissiveIntensity = k; }
  }
}

// Shot builder: each entry ends where the next begins; fn(L, dur) gets L(line, w) = shot-local word onset.
const shots = [];
function shot(end, id, set, fn) {
  const start = shots.length ? shots[shots.length - 1].end : 0;
  const L = (line, w) => word(line, w).start - start;
  const spec = fn(L, end - start);
  for (const [aid, a] of Object.entries(spec.actors ?? {})) {
    const def = (DEFAULT_HIDE[aid] ?? []).filter((k) => !a.show?.includes(k));
    if (def.length || a.hide) a.hide = [...def, ...(a.hide ?? [])];
  }
  const user = spec.update;
  shots.push({ ...spec, id: `${String(shots.length + 1).padStart(3, '0')}_${id}`, set, start, end, update(ctx, lt) { applyProps(ctx, this); user?.call(this, ctx, lt); } });
}

// ---------- the shot list ----------
// HOOK (village day -> the Grabber at the mill at dusk)
shot(cut('L01', 9), 'hook_aerial', 'village', () => ({
  actors: {
    walkers: { at: [0, 0, 0] },
    v1: { at: [-2.6, 0, 42], yaw: 12, anim: [{ clip: 'idle' }, { t: 1.0, clip: 'wave' }], face: 'grin' },
    v2: { at: [0, 0, 40.5], yaw: 0, anim: [{ clip: 'idle' }, { t: 1.2, clip: 'wave' }], face: 'happy' },
    v4: { at: [2.6, 0, 42], yaw: -12, anim: [{ clip: 'idle' }, { t: 1.35, clip: 'wave' }], face: 'smile' },
  },
  camera: { move: 'path', ease: 'outCubic', keys: [{ u: 0, pos: [10, 85, 130], target: [0, 4, -40] }, { u: 1, pos: [2, 6.2, 55], target: [0, 2.6, 41] }], fov: 50 },
  fx: [{ type: 'intro_zoom_blur', t: 0 }],
}));
shot(cut('L01', 13), 'hook_hands', 'mill', () => ({
  look: 'dusk',
  actors: { grabber: { at: [14, hillY(14, -24), -24], yaw: 0, anim: [{ clip: 'idle' }, { t: 0.05, clip: 'lift' }] } },
  camera: st([16.5, hillY(16, -9) + 1.2, -9], [14, hillY(14, -24) + 10, -24], { fov: 58, zoom: 'push' }),
  fx: [sil('grabber', 0.88), fog([0, 26, -20])],
}));
shot(cut('L02', 0), 'hook_grabber', 'mill', (L) => ({
  look: 'dusk',
  actors: { grabber: { at: [14, hillY(14, -24), -24], yaw: -10, anim: [{ clip: 'lift' }, { t: 0.5, clip: 'idle', fade: 0.4 }] } },
  camera: st([20, hillY(20, 4) + 1.5, 4], [12, hillY(14, -24) + 9, -24], { fov: 55, zoom: 0.12 }),
  fx: [sil('grabber', 0.9), fog([0, 24, -10]), { type: 'zoom_punch', t: L('L01', 15), amount: 0.1 }, { type: 'glow_pulse', at: 'grabber.face', color: '#ff2a1a', t: L('L01', 15), dur: 0.5, sparkles: 0, light: 30 }],
}));

// WORLD RULES (village day)
shot(cut('L02', 5), 'gloves_ws', 'village', () => ({
  actors: {
    walkers: { at: [0, 0, 0] },
    v1: { at: [-16, 0, 31], yaw: 90, anim: [{ clip: 'talk' }], face: 'smile' },
    v2: { at: [-4, 0, 38], yaw: -125, anim: [{ clip: 'walk', to: [-12.4, 0, 31.6], speed: 9 }], face: 'happy' },
  },
  camera: st([12, 9, 54], [-15, 5, 31], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L02', 9), 'gloves_one', 'village', (L) => ({
  actors: {
    v1: { at: [-16, 0, 31], yaw: 90, anim: [{ clip: 'point', target: 'set.shopStall' }, { t: 0.4, clip: 'nod' }], face: 'grin' },
    v2: { at: [-12.4, 0, 29.6], yaw: -70, anim: [{ clip: 'idle' }, { t: 0.15, clip: 'hold' }], face: 'happy' },
  },
  camera: st([-7, 5.2, 36], [-14.5, 3.9, 30.6], { fov: 46, zoom: 0.12 }),
}));
shot(cut('L03', 0), 'never_clapped', 'village', (L) => ({
  actors: {
    walkers: { at: [0, 0, 0] },
    v3: { at: [9, 0, 20], yaw: -35, anim: [{ clip: 'idle' }, { t: L('L02', 11) - 0.1, clip: 'hold_up' }, { t: L('L02', 12), clip: 'shrug' }], face: [{ t: 0, expr: 'neutral' }, { t: L('L02', 12), expr: 'confused' }] },
    v4: { at: [12, 0, 22.5], yaw: -55, anim: [{ clip: 'look_around' }, { t: L('L02', 12) + 0.15, clip: 'shrug' }], face: [{ t: 0, expr: 'smile' }, { t: L('L02', 12), expr: 'skeptical' }] },
    v6: { at: [2, 0, 12], yaw: 30, anim: [{ clip: 'dance' }], face: 'grin' },
  },
  camera: st([-1, 5.5, 37], [9.5, 3.4, 21], { fov: 46, zoom: 0.1 }),
}));
shot(cut('L03', 3), 'stomping', 'village', () => ({
  actors: {
    stompers: { at: [0, 0, 14], yaw: 180 },
    v6: { at: [0, 0, 2], yaw: 0, anim: [{ clip: 'nod' }, { t: 0.4, clip: 'wave' }], face: 'happy' },
  },
  camera: st([12, 4, 0], [0, 2.6, 14], { fov: 55, zoom: 0.1, shake: 'rumble' }),
  fx: [{ type: 'particles', kind: 'footdust', pos: [0, 0.2, 14], area: [24, 0, 10], rate: 30 }],
}));
shot(cut('L04', 0), 'wedding_stampede', 'village', () => ({
  actors: {
    stompers: { at: [0, 0, -94], yaw: 180 },
    bride: { at: [-1.4, 0, -110], yaw: 0, anim: [{ clip: 'cheer' }], face: 'happy' },
    groom: { at: [1.4, 0, -110], yaw: 0, anim: [{ clip: 'wave' }], face: 'grin' },
  },
  camera: st([2, 12, -64], [0, 4, -104], { fov: 52, zoom: 0.1, shake: 'rumble' }),
  fx: [{ type: 'particles', kind: 'dust_wall', pos: [0, 0, -101], area: [30, 1, 4], rate: 5, size: [5, 9], opacity: 0.35 }],
}));
shot(cut('L04', 5), 'jar_factory', 'village', () => ({
  actors: { walkers: { at: [0, 0, 0] }, v5: { at: [-11, 0, -50], yaw: 180, anim: [{ clip: 'walk', to: [-11, 0, -62], speed: 8 }, { t: 0.7, clip: 'headshake' }], face: 'sad' } },
  camera: st([8, 6, -42], [-18, 9, -62], { fov: 55, zoom: 0.1 }),
}));
shot(cut('L04', 6), 'closed_1931', 'village', () => ({
  camera: st([-9, 6.6, -60.2], 'set.factorySign', { fov: 42, zoom: { to: 1.4, dur: 1.0, ease: 'linear' } }),
  post: { dof: { focus: 'set.factorySign', bokeh: 2 } },
}));
shot(cut('L04', 10), 'jar_struggle', 'village', () => ({
  actors: {
    walkers: { at: [10, 0, 0] },
    v3: { at: [-9, 0, -44], yaw: 40, show: ['jar'], anim: [{ clip: 'shake_fist' }], face: 'angry' },
    v4: { at: [-5.5, 0, -47], yaw: 20, show: ['jar'], anim: [{ clip: 'hold_up' }], face: 'worried' },
  },
  camera: st([-3, 5, -37], [-8, 3.8, -45], { fov: 50, zoom: 0.1 }),
}));
shot(cut('L05', 0), 'jar_bite', 'village', () => ({
  actors: { v4: { at: [-5.5, 0, -47], yaw: 20, show: ['jar'], anim: [{ clip: 'eat' }], face: 'angry' } },
  camera: fr('v4.head', 'mcu', { yaw: 15, screen: [0, 0.14], zoom: 0.14 }),
  post: { dof: { focus: 'v4.head', bokeh: 3 } },
}));
shot(cut('L05', 5), 'goodbye_ws', 'village', () => ({
  actors: {
    v5: { at: [-6.5, 0, 52], yaw: 60, show: ['box'], anim: [{ clip: 'hold' }], face: 'smile' },
    v2: { at: [-3.5, 0, 52.5], yaw: 55, anim: [{ clip: 'walk', to: [3, 0, 57], speed: 7 }, { t: 0.75, clip: 'wave', yaw: -110 }], face: 'happy' },
  },
  camera: st([9, 6, 69], [-2.5, 3.2, 53], { fov: 50, zoom: 0.1 }),
}));
shot(cut('L06', 0), 'put_down_wave', 'village', (L) => {
  const tDown = 0.55;
  return {
    props: { boxDown: false },
    actors: {
      v5: { at: [-6.5, 0, 52], yaw: 60, show: ['box'], anim: [{ clip: 'hold' }, { t: 0.15, clip: 'crouch' }, { t: tDown + 0.25, clip: 'wave' }], face: [{ t: 0, expr: 'worried' }, { t: tDown + 0.3, expr: 'happy' }] },
      v2: { at: [3, 0, 57], yaw: -110, anim: [{ clip: 'wave' }, { t: 0.9, clip: 'walk', to: [9, 0, 64], speed: 7 }], face: 'happy' },
    },
    camera: fr('v5', 'ms', { yaw: 25, zoom: 0.1 }),
    update(ctx, lt) {
      vis(ctx, 'v5', 'box', lt < tDown);
      const b = grp(ctx, 'boxDown'); b.visible = lt >= tDown; b.position.set(0, 0, 3.1); // box set down on the ground at his hand
    },
  };
});

// MYSTERY (dusk at the mill)
shot(cut('L06', 4), 'nobody_goes', 'mill', (L) => ({
  look: 'dusk',
  actors: { v3: { at: [1, roadY(170), 170], yaw: 180, anim: [{ clip: 'walk', to: [1, roadY(164), 164], speed: 9 }, { t: 0.6, clip: 'scared', yaw: 20 }], face: [{ t: 0, expr: 'neutral' }, { t: 0.6, expr: 'shock' }] } },
  camera: st([12, 5, 186], [0, 9, 140], { fov: 50, zoom: 0.08 }),
  fx: [fog([0, 2, 120])],
}));
shot(cut('L06', 8), 'mill_ews', 'mill', () => ({
  look: 'dusk',
  camera: st([22, 26, 100], [0, 36, -40], { fov: 46, zoom: 0.06 }),
  fx: [fog([0, 8, 40], { area: [160, 8, 80] })],
}));
shot(cut('L07', 0), 'grabber_lives', 'mill', (L) => ({
  look: 'dusk',
  actors: { grabber: { at: [0, hillY(0, -27.5), -27.5], yaw: 0, anim: [{ clip: 'idle' }], face: 'angry' } },
  camera: st([3, hillY(0, 2) + 5, 2], [0, hillY(0, -27) + 7, -28], { fov: 48, zoom: 'push' }),
  fx: [sil('grabber', 0.97), fog([0, 24, -5]), { type: 'glow_pulse', at: 'grabber.face', color: '#ff2a1a', t: L('L06', 12), dur: 0.6, sparkles: 0, light: 40 }],
  update(ctx, lt) { vis(ctx, 'grabber', 'eyes', lt >= L('L06', 12)); },
}));
shot(cut('L07', 3), 'eleven_feet', 'mill', () => ({
  look: 'dusk',
  actors: { grabber: { at: [0, hillY(0, -25), -25], yaw: 0, anim: [{ clip: 'drag_walk', to: [0, hillY(0, -22), -22], speed: 4 }] } },
  camera: { move: 'tilt', pos: [3, hillY(0, -12) + 0.8, -12], target: [0, hillY(0, -24) + 1, -24], aimTo: 'grabber.head', t: 0.05, dur: 0.6, ease: 'spring', fov: 58 },
  fx: [sil('grabber', 0.8), fog([0, 24, -10])],
}));
shot(cut('L07', 6), 'enormous_hands', 'mill', (L) => ({
  look: 'dusk',
  actors: { grabber: { at: [0, hillY(0, -22), -22], yaw: 0, anim: [{ clip: 'reach' }], face: 'angry' } },
  camera: st([4, hillY(0, -11) + 2.5, -11], [0, hillY(0, -22) + 8, -21], { fov: 55, zoom: 0.1 }),
  fx: [sil('grabber', 0.3), { type: 'glow_pulse', at: 'grabber.hand_r', color: '#ffb070', t: 0.1, dur: 1.2, sparkles: 0, flare: false, light: 35, range: 14 }, { type: 'zoom_punch', t: L('L07', 4), amount: 0.12 }],
}));
shot(cut('L07', 8), 'winter_ews', 'village', () => ({
  look: NIGHT,
  camera: st([45, 62, 95], [0, 6, -40], { fov: 50, zoom: 0.06 }),
  fx: [snow()],
}));
shot(cut('L08', 0), 'takes_one_thing', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [-2, 0, 10], yaw: 180, anim: [{ clip: 'drag_walk', to: [-2, 0, 2], speed: 5 }] } },
  camera: st([7, 5, 34], [-2, 6.5, 2], { fov: 50, zoom: 0.08 }),
  fx: [snow(), sil('grabber', 0.5)],
}));
shot(cut('L08', 3), 'church_bell', 'village', () => ({
  look: NIGHT, props: { bell: false },
  actors: { grabber: { at: [-4, 0, -78], yaw: 0, show: ['bellHeld'], anim: [{ clip: 'drag_walk', to: [-4, 0, -74], speed: 6, layer: { clip: 'hold_l', parts: ['lArm'] } }] } },
  camera: st([10, 6, -54], [-4, 8.5, -77], { fov: 56, zoom: 0.14 }),
  fx: [snow(), sil('grabber', 0.55)],
}));
shot(cut('L08', 6), 'hay_cart', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [7, 0, -22], yaw: 180, anim: [{ clip: 'drag', to: [7, 0, -27], speed: 6 }] } },
  camera: st([16, 4, -4], [6, 4, -26], { fov: 52, zoom: 0.12 }),
  fx: [snow(), sil('grabber', 0.75)],
  update(ctx) { const g = ctx.actors.grabber.root.position; place(grp(ctx, 'hayCart'), g.x - 0.6, 0, g.z + 9.5, -20); },
}));
shot(cut('L08', 10), 'abernathy_boot', 'village', (L) => ({
  look: NIGHT,
  actors: { abernathy: { at: [15.5, 0, -18], yaw: -80, anim: [{ clip: 'hop' }, { t: L('L08', 8) - 0.1, clip: 'shake_fist' }], face: [{ t: 0, expr: 'angry' }, { t: L('L08', 8), expr: 'shout' }] } },
  camera: fr('abernathy', 'ms', { yaw: 15, angle: 'low', zoom: 0.12 }),
  fx: [snow()],
}));
shot(cut('L09', 0), 'only_left', 'village', (L) => ({
  look: NIGHT,
  actors: {
    abernathy: { at: [15.2, 0, -17.5], yaw: -100, anim: [{ clip: 'idle' }, { t: 0.3, clip: 'shrug' }], face: 'confused' },
    v1: { at: [11.5, 0, -14], yaw: -150, anim: [{ clip: 'look_around' }, { t: L('L08', 15), clip: 'shrug' }], face: 'confused' },
    v4: { at: [11, 0, -20.5], yaw: -40, anim: [{ clip: 'idle' }, { t: L('L08', 17) - 0.1, clip: 'shrug' }], face: 'skeptical' },
  },
  camera: st([3.5, 5, -17.5], [14, 3.2, -17.5], { fov: 52, zoom: 0.08 }),
  fx: [snow()],
}));

// HERO (day)
shot(cut('L09', 5), 'lenny_house', 'village', () => ({
  actors: {
    walkers: { at: [0, 0, 0] },
    lenny: pre({ at: [17.2, 0, 8.5], yaw: -90, anim: [{ clip: 'walk', to: [12.5, 0, 9.5], speed: 7 }, { t: 0.7, clip: 'wave' }], face: 'smile' }),
  },
  camera: st([-3, 6, 22], [15, 7, 9], { fov: 55, zoom: 0.08 }),
}));
shot(cut('L09', 13), 'lenny_intro', 'village', (L) => ({
  actors: {
    walkers: { at: [-9, 0, 0] },
    lenny: pre({ at: [10, 0, 12], yaw: 0, anim: [{ clip: 'walk', to: [10, 0, 25], speed: 8 }], face: [{ t: 0, expr: 'smile' }, { t: L('L09', 10), expr: 'worried' }],
      lookAt: [{ t: 0, at: null }, { t: L('L09', 8), at: [4, 4, 30] }, { t: L('L09', 11), at: [16, 4, 30] }] }),
  },
  camera: { move: 'lead', target: 'lenny', frame: 'ms', angle: 'low', fov: 50, zoom: 0.08 },
}));
shot(cut('L09', 17), 'born_with', 'village', () => ({
  actors: { lenny: pre({ at: [10, 0, 25], yaw: 0, anim: [{ clip: 'look_around' }], face: 'worried' }) },
  camera: fr('lenny.head', 'mcu', { yaw: -15, screen: [0, 0.14], zoom: 0.14 }),
  post: { dof: { focus: 'lenny.head', bokeh: 3 } },
}));
shot(cut('L10', 0), 'baby_two_hands', 'house', (L) => ({
  actors: {
    mom: { at: [-60, 0, 0], yaw: 0, anim: [{ clip: 'carry' }], face: [{ t: 0, expr: 'smile' }, { t: L('L09', 17), expr: 'shock' }] },
    baby: { at: [-60, 0, 0], attach: { to: 'mom', offset: [0.9, 1.8, 1.2] }, anim: [{ clip: 'cheer' }], face: 'happy' },
  },
  camera: fr('mom', 'ms', { yaw: 12, zoom: 0.12 }),
  fx: [{ type: 'sepia' }, { type: 'zoom_punch', t: L('L09', 18), amount: 0.12 }, { type: 'sparkles', at: 'baby.head', t: L('L09', 18), count: 6 }],
}));
shot(cut('L10', 7), 'mom_sews', 'house', () => ({
  actors: {
    lenny: pre({ at: [-55, 0, 2], yaw: 10, anim: [{ clip: 'idle', pose: { lArm: [8, 78, 0] } }], face: 'deadpan' }),
    mom: { at: [-49.8, 0, 2.6], yaw: -95, show: ['needle'], anim: [{ clip: 'sew' }], face: 'content' },
    grandma: { at: [-68, 0, -4], yaw: 30, anim: [{ clip: 'sit', seat: 2.65, layer: 'knit' }], face: 'content' },
    pip: { at: [-62, 0, 3], yaw: 30, anim: [{ clip: 'eat' }], face: 'happy' },
  },
  camera: st([-51.5, 7, 19], [-53, 4, 1], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L10', 9), 'every_morning', 'house', () => ({
  actors: {
    lenny: pre({ at: [-55, 0, 2], yaw: 10, anim: [{ clip: 'idle', pose: { lArm: [8, 78, 0] } }], face: 'deadpan' }),
    mom: { at: [-49.8, 0, 2.6], yaw: -95, show: ['needle'], anim: [{ clip: 'sew' }], face: 'content' },
  },
  camera: st([-53.6, 5.2, 11], [-53.6, 4.3, 2.2], { fov: 50, zoom: 0.12 }),
  post: { dof: { focus: 'lenny.hand_l', bokeh: 2 } },
}));
shot(cut('L10', 17), 'pocket_walk', 'village', () => ({
  actors: {
    walkers: { at: [-2, 0, 0] },
    lenny: pre({ at: [9.5, 0, -12], yaw: 0, anim: [{ clip: 'walk', to: [9.5, 0, 0], speed: 8.5 }], face: 'neutral' }),
    v2: { at: [13, 0, 4], yaw: 180, anim: [{ clip: 'walk', to: [13, 0, -14], speed: 7 }], face: 'smile' },
  },
  camera: { move: 'lead', target: 'lenny', frame: 'mws', yaw: 35, fov: 50, zoom: 0.06 },
}));
shot(cut('L11', 0), 'nobody_screams', 'village', (L) => ({
  actors: {
    lenny: pre({ at: [2, 0, 24], yaw: -40, anim: [{ clip: 'idle' }, { t: 0.5, clip: 'shrug' }], face: [{ t: 0, expr: 'smile' }, { t: 0.5, expr: 'embarrassed' }] }),
    v4: { at: [-2, 0, 29], yaw: 140, anim: [{ clip: 'idle' }, { t: L('L10', 19) - 0.05, clip: 'scared' }], face: [{ t: 0, expr: 'neutral' }, { t: L('L10', 19) - 0.05, expr: 'terrified' }] },
  },
  camera: st([-6.5, 4.4, 21.5], [-2, 3.9, 29], { fov: 46, zoom: 0.1 }),
  fx: [{ type: 'particles', kind: 'sound_rings', follow: 'v4.head', start: L('L10', 19), rate: 4 }, { type: 'zoom_punch', t: L('L10', 19), amount: 0.1 }],
}));

// RIVAL
shot(cut('L11', 4), 'kids_spare', 'village', () => ({
  actors: {
    lenny: pre({ at: [8, 0, -10], yaw: 0, anim: [{ clip: 'walk', to: [8, 0, -2], speed: 7 }], face: 'sad' }),
    gordy: { at: [-1, 0, -2], yaw: 95, anim: [{ clip: 'point', target: 'lenny.head' }], face: 'smug' },
    kid1: { at: [-3.5, 0, -4.5], yaw: 80, anim: [{ clip: 'laugh' }], face: 'laugh' },
    kid2: { at: [-2.5, 0, 1], yaw: 110, anim: [{ clip: 'point', target: 'lenny.head' }], face: 'grin' },
  },
  camera: st([-9, 5.5, 17], [3, 2.6, -3], { fov: 52, zoom: 0.08 }),
}));
shot(cut('L11', 9), 'gordy_walks', 'village', () => ({
  actors: {
    gordy: { at: [-3, 0, -3.5], yaw: 75, anim: [{ clip: 'walk', to: [3.5, 0, -2], speed: 5.5 }, { t: 1.15, clip: 'point', target: [9, 3, -2] }], face: 'smug' },
    kid1: { at: [-5, 0, -5.5], yaw: 70, anim: [{ clip: 'laugh' }], face: 'laugh' },
  },
  camera: fr('gordy', 'ms', { yaw: 30, angle: 'low', zoom: 0.08 }),
}));
shot(cut('L12', 0), 'give_us_a_hand', 'village', (L) => ({
  actors: { gordy: { at: [3.5, 0, -2], yaw: 75, anim: [{ clip: 'talk' }, { t: L('L11', 11) - 0.05, clip: 'hold' }], face: [{ t: 0, expr: 'shout', talk: true }] } },
  camera: fr('gordy.head', 'mcu', { yaw: 10, screen: [0, 0.12], zoom: 0.12 }),
  post: { dof: { focus: 'gordy.head', bokeh: 3 } },
  fx: [{ type: 'zoom_punch', t: L('L11', 14), amount: 0.1 }],
}));
shot(cut('L12', 4), 'hilarious', 'village', () => ({
  actors: {
    gordy: { at: [3.5, 0, -2], yaw: 75, anim: [{ clip: 'laugh' }], face: 'laugh' },
    kid1: { at: [0.5, 0, -4.5], yaw: 70, anim: [{ clip: 'laugh' }], face: 'laugh' },
    kid2: { at: [0.8, 0, 0.5], yaw: 100, anim: [{ clip: 'laugh' }], face: 'grin' },
  },
  camera: st([10, 4.5, 4], [2, 2.8, -2], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L12', 8), 'pretty_good', 'village', () => ({
  actors: { lenny: pre({ at: [9, 0, -2], yaw: -100, anim: [{ clip: 'idle' }, { t: 0.15, clip: 'shrug' }], face: 'smug' }) },
  camera: fr('lenny.head', 'mcu', { yaw: 15, screen: [0, 0.14], zoom: 0.12 }),
  post: { dof: { focus: 'lenny.head', bokeh: 3 } },
}));
shot(cut('L13', 0), 'never_clapped_public', 'village', (L) => ({
  actors: {
    stompers: { at: [1, 0, -88], yaw: 180 },
    v6: { at: [0, 0, -106], yaw: 0, anim: [{ clip: 'dance' }], face: 'grin' },
    lenny: pre({ at: [2.5, 0, -97], yaw: 180, anim: [{ clip: 'stomp' }, { t: L('L12', 11), clip: 'idle' }], face: [{ t: 0, expr: 'smile' }, { t: L('L12', 11), expr: 'sad' }] }),
  },
  camera: st([3, 5, -104], [1.5, 3.6, -92], { fov: 56, zoom: 0.08 }),
}));

// GRANDMA (living room)
shot(cut('L13', 3), 'grandma_ws', 'house', () => ({
  actors: {
    grandma: { at: [-68, 0, -4], yaw: 30, anim: [{ clip: 'sit', seat: 2.65, layer: 'knit' }], face: 'content' },
    lenny: pre({ at: [-61, 0, 0], yaw: -130, anim: [{ clip: 'walk', to: [-62.5, 0, -1], speed: 4 }], face: 'neutral' }),
    pip: { at: [-58, 0, 3], yaw: -60, anim: [{ clip: 'eat' }], face: 'happy' },
  },
  camera: st([-58, 7, 16], [-65, 3.6, -3], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L13', 12), 'hand_you_hide', 'house', () => ({
  actors: { grandma: { at: [-68, 0, -4], yaw: 30, anim: [{ clip: 'sit', seat: 2.65, layer: { clip: 'point', parts: ['rArm'] } }], face: [{ t: 0, expr: 'smile', talk: true }] } },
  camera: fr('grandma.head', 'mcu', { yaw: 0, angle: 'low', screen: [0, 0.1], zoom: 0.1 }),
  post: { dof: { focus: 'grandma.head', bokeh: 3 } },
}));
shot(cut('L13', 14), 'cake_94', 'house', () => ({
  actors: { grandma: { at: [-68, 0, -4], yaw: 30, anim: [{ clip: 'sit', seat: 2.65, layer: 'knit' }], face: 'happy' } },
  camera: st([-71.6, 6.4, 0], [-70.5, 6, -7.5], { fov: 46, zoom: { to: 1.35, dur: 0.75, ease: 'linear' } }),
  post: { dof: { focus: 'set.livingCake', bokeh: 2 } },
}));
shot(cut('L14', 0), 'says_a_lot', 'house', () => ({
  actors: {
    lenny: pre({ at: [-61.5, 0, -0.5], yaw: 25, anim: [{ clip: 'idle' }, { t: 0.4, clip: 'shrug' }], face: 'skeptical' }),
    grandma: { at: [-68, 0, -4], yaw: 30, anim: [{ clip: 'sit', seat: 2.65, layer: { clip: 'talk', parts: ['rArm', 'lArm'] } }], face: [{ t: 0, expr: 'smile', talk: true }] },
  },
  camera: fr('lenny', 'ms', { yaw: 20, zoom: 0.1 }),
}));

// INCITING (night, music turns)
shot(cut('L14', 5), 'january_night', 'village', () => ({
  look: NIGHT,
  camera: st([-30, 46, 85], [0, 14, -60], { fov: 50, zoom: 0.07 }),
  fx: [snow()],
}));
shot(cut('L14', 9), 'new_bell', 'village', () => ({
  look: NIGHT,
  camera: st([10, 6, -98], 'set.bell', { fov: 50, zoom: 0.12 }),
  fx: [snow()],
  update(ctx, lt) { grp(ctx, 'bell').rotation.z = 0.35 * Math.sin(lt * 5); },
}));
shot(cut('L15', 0), 'rang_13', 'village', (L, D) => ({
  look: NIGHT,
  camera: st([7, 41.5, -120], [0, 40, -140], { fov: 48, zoom: 0.1 }),
  fx: [snow(), { type: 'recipe', name: 'bell_tolls', t: L('L14', 9), count: 5, interval: 0.25 }],
  update(ctx, lt) { grp(ctx, 'bell').rotation.z = 0.6 * Math.sin(lt * 12.6); },
}));
shot(cut('L15', 4), 'something_walking', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [-1, 0, -34], yaw: 0, anim: [{ clip: 'drag_walk', to: [-1, 0, -28], speed: 5 }] } },
  camera: st([3, 2.2, 22], [-1, 7, -30], { fov: 46, zoom: 0.1 }),
  fx: [snow(), sil('grabber', 0.92)],
}));
shot(cut('L15', 6), 'main_street_ews', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [-1, 0, -26], yaw: 0, anim: [{ clip: 'drag_walk', to: [-1, 0, -22], speed: 5 }] } },
  camera: st([6, 40, 36], [0, 3, -22], { fov: 50, zoom: 0.07 }),
  fx: [snow()],
}));
shot(cut('L15', 10), 'taller_than_lamps', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [-9.5, 0, -10], yaw: 0, anim: [{ clip: 'drag_walk', to: [-9.5, 0, -4.5], speed: 5 }] } },
  camera: st([-4, 1, 8], [-11, 8.5, -3], { fov: 60, zoom: 0.08 }),
  fx: [snow()],
}));
shot(cut('L16', 0), 'knuckles', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [-3, 0, -8], yaw: 0, anim: [{ clip: 'drag_walk', to: [-3, 0, 0], speed: 4.5 }] } },
  camera: st([-13, 1.6, 4], 'grabber.hand_r', { fov: 46, zoom: 0.1 }),
  fx: [snow(), { type: 'particles', kind: 'footdust', follow: 'grabber.hand_r', rate: 14, color: ['#e8eef4', '#cfd8e6'] }],
  post: { dof: { focus: 'grabber.hand_r', bokeh: 3 } },
}));

// THE RULE (bedroom at night)
shot(cut('L16', 4), 'rule_bedroom', 'house', () => ({
  look: NIGHT, sky: 'night',
  actors: { lenny: pre({ at: [4, 0, -4.2], yaw: 0, anim: [{ clip: 'sit', seat: 3.9, layer: { clip: 'scared', parts: ['rArm'] } }], face: 'scared', lookAt: [{ t: 0, at: [-5, 10, -11] }, { t: 0.7, at: [8, 6, 10] }] }) },
  camera: st([0, 8, 20], [1.5, 4.5, -5], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L16', 8), 'grabber_comes', 'village', () => ({
  look: NIGHT,
  actors: { grabber: { at: [8, 0, -8], yaw: 0, anim: [{ clip: 'drag_walk', to: [8, 0, -1], speed: 5 }] } },
  camera: st([-8, 4.5, 30], [13, 8, 4], { fov: 52, zoom: 0.08 }),
  fx: [snow(), sil('grabber', 0.6)],
}));
shot(cut('L16', 13), 'under_bed', 'house', () => ({
  look: NIGHT, sky: 'night',
  actors: { lenny: pre({ at: [{ t: 0, v: [3, 0, -0.5] }, { t: 0.55, v: [3, 0, -6.4] }], yaw: 0, anim: [{ clip: 'lie', front: true, pose: { head: [-70, 0, 0] } }], face: 'scared' }) },
  camera: st([3.5, 2.6, 9], [3, 1.2, -3.5], { fov: 50, zoom: 0.1 }),
}));
shot(cut('L17', 0), 'hand_over_mouth', 'house', (L) => ({
  look: NIGHT, sky: 'night',
  actors: { lenny: pre({ at: [3, 0, -6.4], yaw: 0, anim: [{ clip: 'lie', front: true, pose: { rArm: [175, 0, 0], head: [-70, 0, 0] } }, { t: L('L16', 14) - 0.1, clip: 'lie', front: true, fade: 0.25, pose: { rArm: [170, -52, 0], head: [-70, 0, 0] } }], face: 'scared' }) },
  camera: st([3.4, 0.9, 2.6], [3, 0.9, -3.2], { fov: 44, zoom: 0.12 }),
  post: { dof: { focus: 'lenny.head', bokeh: 3 } },
}));
shot(cut('L17', 3), 'so_i_did', 'house', () => ({
  look: NIGHT, sky: 'night',
  actors: { lenny: pre({ at: [3, 0, -6.4], yaw: 0, anim: [{ clip: 'lie', front: true, pose: { rArm: [170, -52, 0], head: [-70, 0, 0] } }], face: 'scared' }) },
  camera: st([-9, 10, 16], [3, 2, -6], { fov: 50, zoom: 0.1 }),
}));
shot(cut('L17', 10), 'heard_sister', 'house', (L) => ({
  look: NIGHT, sky: 'night',
  actors: { lenny: pre({ at: [3, 0, -6.4], yaw: 0, anim: [{ clip: 'lie', front: true, pose: { rArm: [170, -52, 0], head: [-70, 0, 0] } }], face: [{ t: 0, expr: 'scared' }, { t: L('L17', 6), expr: 'shock' }] }) },
  camera: st([6.5, 1.1, 1.2], 'lenny.head', { fov: 44, zoom: 0.12 }),
  fx: [{ type: 'particles', kind: 'sound_rings', follow: 'lenny.head', start: L('L17', 6), rate: 3 }],
  post: { dof: { focus: 'lenny.head', bokeh: 3 } },
}));
shot(cut('L18', 0), 'pip_window', 'house', (L) => {
  const tOpen = L('L17', 11) - 0.1;
  return {
    look: NIGHT, sky: 'night',
    actors: { pip: { at: [59, 0, -5], yaw: 0, hide: ['cookie'], anim: [{ clip: 'sit', seat: 3.9 }], face: [{ t: 0, expr: 'sleepy' }, { t: tOpen + 0.15, expr: 'shock' }], lookAt: [{ t: 0, at: null }, { t: tOpen + 0.1, at: [60, 11, -12] }] } },
    camera: st([60, 8, 19], [60, 6.5, -6], { fov: 52, zoom: 0.1 }),
    fx: [{ type: 'particles', kind: 'snow', pos: [60, 10.5, -10.5], area: [5, 5, 1], velocity: [0, -1, 3], rate: 30, follow: null, start: tOpen }],
    update(ctx, lt) { const u = EASE.outBack(clamp((lt - tOpen) / 0.35)); grp(ctx, 'pipShutL').rotation.y = -1.8 * u; grp(ctx, 'pipShutR').rotation.y = 1.8 * u; },
  };
});
const bigHandAt = (ctx, dz, dy) => { const h = grp(ctx, 'pipHand'), p = h.userData.pivot; h.visible = true; h.position.set(p[0], p[1] + dy, p[2] + dz); return [60, 10.3 + dy, -12.7 + dz]; };
const shutOpen = (ctx) => { grp(ctx, 'pipShutL').rotation.y = -1.8; grp(ctx, 'pipShutR').rotation.y = 1.8; };
shot(cut('L18', 4), 'gray_fingers', 'house', (L, D) => ({
  look: NIGHT, sky: 'night',
  actors: { pip: { at: [59, 0, -5], yaw: 0, hide: ['cookie'], anim: [{ clip: 'sit', seat: 3.9, layer: { clip: 'scared', parts: ['lArm', 'rArm'] } }], face: 'terrified', lookAt: [60, 9, -10] } },
  camera: st([62.5, 8, 1], [60, 9.2, -9], { fov: 52, zoom: 0.1 }),
  update(ctx, lt) { shutOpen(ctx); const u = EASE.outQuad(clamp(lt / D)); bigHandAt(ctx, lerp(-4, 3.5, u), lerp(0, -1.5, u)); },
}));
shot(cut('L18', 6), 'reached_in', 'house', (L, D) => ({
  look: NIGHT, sky: 'night',
  actors: { pip: { at: [59, 0, -5], yaw: 0, hide: ['cookie'], anim: [{ clip: 'sit', seat: 3.9, layer: { clip: 'scared', parts: ['lArm', 'rArm'] } }], face: 'terrified' } },
  camera: st([61.5, 6.2, 1.5], [59.6, 6.6, -5.5], { fov: 46, zoom: 0.14 }),
  post: { dof: { focus: 'pip.head', bokeh: 3 } },
  update(ctx, lt) { shutOpen(ctx); const u = clamp(lt / D); bigHandAt(ctx, lerp(3.5, 7.4, u), lerp(-1.5, -3.6, u)); },
}));
shot(cut('L18', 12), 'like_a_sandwich', 'house', (L, D) => {
  const tPick = 0.12;
  return {
    look: NIGHT, sky: 'night',
    actors: { pip: { at: [59, 0, -5], yaw: 0, hide: ['cookie'], anim: [{ clip: 'sit', seat: 3.9 }, { t: tPick, clip: 'held' }], face: 'terrified' } },
    camera: st([64, 6.5, 9], [60, 8, -7], { fov: 54, zoom: 0.08 }),
    update(ctx, lt) {
      shutOpen(ctx);
      const u = EASE.inOutSine(clamp((lt - 0.6) / (D - 0.62)));
      const tip = bigHandAt(ctx, lerp(7.4, -6, u), lerp(-3.6, 0.5, EASE.outQuad(clamp((lt - tPick) / 0.5))));
      if (lt >= tPick) ctx.actors.pip.root.position.set(tip[0], tip[1] - 3.7, tip[2] - 0.3);
    },
  };
});
shot(cut('L19', 0), 'she_was_gone', 'village', () => ({
  look: NIGHT,
  actors: {
    grabber: { at: [3, 0, 14], yaw: 180, anim: [{ clip: 'drag_walk', to: [3, 0, 7], speed: 5, layer: { clip: 'hold', parts: ['rArm'] } }] },
    pip: { at: [0, 0, 0], attach: { to: 'grabber', offset: [-1.6, 2.0, 3.5] }, hide: ['cookie'], anim: [{ clip: 'held' }], face: 'terrified' },
  },
  camera: st([-17, 6.5, 14], [1, 6.5, 8], { fov: 52, zoom: 0.08 }),
  fx: [snow()],
}));

// HERO ACTS
shot(cut('L19', 5), 'sat_on_bed', 'house', () => ({
  look: NIGHT, sky: 'night',
  actors: { lenny: pre({ at: [4, 0, -4.2], yaw: 0, anim: [{ clip: 'sit', seat: 3.9 }], face: 'determined' }) },
  camera: st([6, 5, 6], 'lenny.head', { fov: 50, zoom: 0.1 }),
}));
shot(cut('L20', 0), 'rip_sleeve', 'house', (L) => {
  const tRip = L('L19', 7) + 0.05;
  const grab = { rArm: [72, -58, 0], lArm: [46, 8, 0], head: [12, 0, 0] }, rip = { rArm: [40, 72, 0], lArm: [150, 18, 0], head: [-10, 0, 0] };
  return {
    look: NIGHT, sky: 'night',
    actors: { lenny: { at: [4, 0, -4.2], yaw: 0, anim: [{ clip: 'keys', keys: [{ t: 0, pose: { ...SIT_LENNY, ...grab } }, { t: tRip, pose: { ...SIT_LENNY, ...grab } }, { t: tRip + 0.18, pose: { ...SIT_LENNY, ...rip } }] }],
      face: [{ t: 0, expr: 'determined' }, { t: tRip + 0.1, expr: 'yell_wink' }, { t: tRip + 0.5, expr: 'grin' }] } },
    camera: st([6.5, 7, 7.5], [4, 7, -4.2], { fov: 52, zoom: [0.06, { to: 1.2, t: tRip, dur: 0.25, ease: 'outCubic' }] }),
    fx: [{ type: 'glow_pulse', at: 'lenny.hand_l', object: 'lenny.hand_l_mesh', color: '#ffd84a', t: tRip + 0.05, dur: 0.8, sparkles: 8, light: 50, flare: 0.5, emissive: 3 }, { type: 'flash_white', t: tRip, alpha: 0.5, dur: 0.12 }],
    update(ctx, lt) { vis(ctx, 'lenny', 'stitch_l', lt < tRip); vis(ctx, 'lenny', 'hand_l_mesh', lt >= tRip); },
  };
});
shot(cut('L20', 5), 'drainpipe', 'village', () => ({
  look: NIGHT,
  actors: { lenny: post({ at: [18.2, 10.5, -0.2], yaw: 90, anim: [{ clip: 'climb', path: [[18.2, 3, -0.2]], speed: 7.5, then: 'climb' }], face: 'determined' }) },
  camera: st([8, 6, -12], [18, 7, 0.5], { fov: 52, zoom: 0.08 }),
  fx: [snow()],
}));
shot(cut('L20', 8), 'two_hands_pipe', 'village', () => ({
  look: NIGHT,
  actors: { lenny: post({ at: [18.2, 4.6, -0.2], yaw: 90, anim: [{ clip: 'climb', path: [[18.2, 1.5, -0.2]], speed: 4.5, then: 'climb' }], face: 'grin' }) },
  camera: st([11, 3, 3], [18.6, 7.5, -0.2], { fov: 44, zoom: 0.12 }),
  fx: [snow()],
}));
shot(cut('L21', 0), 'really_easy', 'village', (L) => ({
  look: NIGHT,
  actors: { lenny: post({ at: [17.6, 0, -0.2], yaw: -90, anim: [{ clip: 'jump', height: 1.2 }, { t: 0.5, clip: 'shrug' }, { t: L('L20', 14) + 0.1, clip: 'run', to: [11, 0, -14], speed: 14 }], face: [{ t: 0, expr: 'determined' }, { t: 0.5, expr: 'smug' }] }) },
  camera: st([8, 3.6, 7], 'lenny.chest', { fov: 50, zoom: 0.08 }),
  fx: [snow()],
}));

// LOW POINT (mill at night)
shot(cut('L21', 5), 'footprints', 'mill', () => ({
  look: NIGHT,
  actors: { lenny: post({ at: [roadX(116) - 2, roadY(116), 116], yaw: 180, anim: [{ clip: 'run', to: [roadX(104) - 2, roadY(104), 104], speed: 13 }], face: 'determined' }) },
  camera: st([9, roadY(136) + 13, 136], [0, roadY(80) + 2, 80], { fov: 52, zoom: 0.07 }),
  fx: [snow()],
}));
shot(cut('L21', 8), 'to_the_mill', 'mill', () => ({
  look: NIGHT,
  actors: { lenny: post({ at: [1, roadY(-16), -16], yaw: 180, anim: [{ clip: 'run', to: [0.5, roadY(-27), -27], speed: 12 }] }) },
  camera: st([26, 32, 62], [0, 38, -40], { fov: 48, zoom: 0.06 }),
  fx: [snow(), { type: 'flash', color: '#d8e4ff', alpha: 0.6, t: 0.05, dur: 0.2 }, fog([0, 24, -10])],
}));
shot(cut('L21', 13), 'piles_ws', 'millIn', () => ({
  actors: { lenny: post({ at: [2, 0, 24], yaw: 180, anim: [{ clip: 'walk', to: [1, 0, 15], speed: 8 }, { t: 0.9, clip: 'look_around' }], face: 'shock' }) },
  camera: st([6, 10, 36], [-2, 4, -12], { fov: 56, zoom: 0.08 }),
}));
shot(cut('L21', 14), 'bells', 'millIn', () => ({ camera: st([-11, 4.5, -5], 'set.bells', { fov: 46, zoom: 0.18 }), post: { dof: { focus: 'set.bells', bokeh: 2 } } }));
shot(cut('L21', 15), 'carts', 'millIn', () => ({ camera: st([18, 6, 3], [26, 2.5, -8], { fov: 50, zoom: 0.16 }) }));
shot(cut('L21', 17), 'tools', 'millIn', () => ({ camera: st([-23, 7, 13], 'set.tools', { fov: 50, zoom: 0.16 }), post: { dof: { focus: 'set.tools', bokeh: 2 } } }));
shot(cut('L22', 0), 'boots_61', 'millIn', () => ({
  actors: { lenny: post({ at: [-12, 0, -2.5], yaw: 20, anim: [{ clip: 'idle' }, { t: 0.3, clip: 'facepalm' }], face: 'shock' }) },
  camera: st([2, 6, 18], [-11, 3, 2], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L22', 5), 'top_shelf', 'millIn', () => ({
  actors: { lenny: post({ at: [-22, 0, -5], yaw: -130, anim: [{ clip: 'idle' }, { t: 0.3, clip: 'point', target: 'set.shelf' }], face: 'confused', lookAt: 'set.shelf' }) },
  camera: st([-15, 3, 1], [-27, 9, -11], { fov: 58, zoom: 0.1 }),
}));
shot(cut('L22', 9), 'lantern', 'millIn', () => ({ camera: st([-27, 15.5, -5.5], 'set.lantern', { fov: 44, zoom: 0.16 }), post: { dof: { focus: 'set.lantern', bokeh: 2 } } }));
shot(cut('L23', 0), 'pip_cookie', 'millIn', () => ({
  actors: { pip: { at: 'set.shelfSeat', yaw: 90, anim: [{ clip: 'sit', seat: 0, layer: 'eat' }], face: 'happy' } },
  camera: st([-25.5, 15.8, -11], 'pip.head', { fov: 48, zoom: 0.12 }),
}));

// FALSE CLIMAX
shot(cut('L23', 9), 'dark_back', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -6], yaw: 180, anim: [{ clip: 'idle' }], face: 'worried' }),
    grabber: { at: [0, 0, -30], yaw: 0, anim: [{ clip: 'crouch_low' }], face: 'angry' },
  },
  camera: st([2.6, 5.2, 4], [0, 3.8, -28], { fov: 50, zoom: 0.1 }),
  fx: [sil('grabber', 1)],
}));
shot(cut('L23', 11), 'stood_up', 'millIn', () => ({
  actors: { grabber: { at: [0, 0, -30], yaw: 0, anim: [{ clip: 'stand_up' }], face: 'angry' } },
  camera: st([3, 1.4, -13], [0, 8, -30], { fov: 56, zoom: 0.1 }),
  fx: [sil('grabber', 1, { from: 1, to: 0.45, t: 0.1, dur: 0.5 })],
}));
shot(cut('L23', 14), 'eleven_feet_in', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -13], yaw: 180, anim: [{ clip: 'scared' }], face: 'terrified' }),
    grabber: { at: [0, 0, -24], yaw: 0, anim: [{ clip: 'idle' }], face: 'angry' },
  },
  camera: st([-2.4, 0.9, -6.5], [0, 8.5, -24], { fov: 62, zoom: 0.08 }),
  fx: [sil('grabber', 0.35)],
}));
shot(cut('L24', 0), 'reached_for_me', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -13], yaw: 180, anim: [{ clip: 'scared' }], face: 'terrified' }),
    grabber: { at: [0, 0, -24], yaw: 0, anim: [{ clip: 'walk', to: [0, 0, -21], speed: 2.5, layer: { clip: 'reach' }, then: 'reach' }], face: 'angry' },
  },
  camera: st([3, 4, -4], [0, 7.5, -21], { fov: 56, zoom: 0.1, shake: { type: 'rumble', amp: 0.4 } }),
  fx: [sil('grabber', 0.25)],
}));

// TWIST
shot(cut('L24', 3), 'it_stopped', 'millIn', (L) => ({
  actors: { grabber: { at: [0, 0, -21], yaw: 0, anim: [{ clip: 'reach', hold: 0.6 }], face: [{ t: 0, expr: 'angry' }, { t: L('L24', 2), expr: 'confused' }] } },
  camera: fr('grabber.head', 'mcu', { yaw: 28, screen: [0, 0.12], zoom: 0.1 }),
}));
shot(cut('L24', 8), 'stared_at_hands', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -13], yaw: 180, anim: [{ clip: 'hold_both' }], face: 'scared' }),
    grabber: { at: [0, 0, -21], yaw: 0, anim: [{ clip: 'reach', hold: 0.6 }], face: 'confused', lookAt: 'lenny.chest' },
  },
  camera: st([3, 4.2, -18.5], [0, 3, -13.6], { fov: 46, zoom: 0.12 }),
  post: { dof: { focus: 'lenny.chest', bokeh: 3 } },
}));
shot(cut('L24', 16), 'holds_out_two', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -13], yaw: 180, anim: [{ clip: 'hold_both' }, { t: 0.8, clip: 'idle', fade: 0.4 }], face: 'confused' }),
    grabberKind: { at: [0, 0, -22.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' } }], face: 'sad' },
  },
  camera: st([19, 6.5, -14], [0, 5, -17], { fov: 56, zoom: 0.08 }),
}));
shot(cut('L25', 0), 'asking_something', 'millIn', () => ({
  actors: { grabberKind: { at: [0, 0, -22.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' }, add: { head: [0, 0, 10] } }], face: 'worried' } },
  camera: fr('grabberKind.head', 'cu', { yaw: 30, screen: [0, 0.1], zoom: 0.1 }),
  post: { dof: { focus: 'grabberKind.head', bokeh: 3 } },
}));
shot(cut('L25', 4), 'realized', 'millIn', (L) => ({
  actors: { lenny: post({ at: [0, 0, -13], yaw: 180, anim: [{ clip: 'idle' }], face: [{ t: 0, expr: 'confused' }, { t: L('L25', 3), expr: 'shock' }] }) },
  camera: fr('lenny.head', 'cu', { yaw: -30, screen: [0, 0.1], zoom: [0.08, { preset: 'punch_small', t: L('L25', 3) }] }),
  post: { dof: { focus: 'lenny.head', bokeh: 3 } },
}));
shot(cut('L25', 9), 'not_a_monster', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -13], yaw: 180, anim: [{ clip: 'walk', to: [0, 0, -14.5], speed: 3 }], face: 'sad' }),
    grabberKind: { at: [0, 0, -22.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' } }], face: 'sad' },
    pip: { at: 'set.shelfSeat', yaw: 90, anim: [{ clip: 'sit', seat: 0, layer: 'eat' }], face: 'happy' },
  },
  camera: st([21, 2.6, -6], [0, 6.5, -19], { fov: 52, zoom: 0.07 }),
}));

// FLASHBACK (sepia village, 60 years ago)
shot(cut('L25', 13), 'it_was_a_kid', 'village', () => ({
  actors: { boy: { at: [4, 0, 20], yaw: 10, anim: [{ clip: 'hold_both' }], face: 'sad', lookAt: [4, 1, 22] } },
  camera: fr('boy.chest', 'mcu', { yaw: 12, screen: [0, 0.08], zoom: 0.1 }),
  fx: [{ type: 'sepia' }],
}));
shot(cut('L25', 18), 'sixty_years_ago', 'village', () => ({
  actors: {
    boy: { at: [2, 0, 18], yaw: 0, anim: [{ clip: 'walk', to: [2, 0, 26], speed: 5 }], face: 'sad' },
    v2: { at: [-6, 0, 28], yaw: 150, anim: [{ clip: 'walk', to: [-10, 0, 33], speed: 5, backward: true }], face: 'scared' },
    v5: { at: [8, 0, 30], yaw: -160, anim: [{ clip: 'scared' }], face: 'terrified' },
    idlers: { at: [0, 0, -10], yaw: 0 },
  },
  camera: st([10, 10, 52], [1, 3.5, 20], { fov: 52, zoom: 0.06 }),
  fx: [{ type: 'sepia' }],
}));
shot(cut('L26', 0), 'with_two_hands', 'village', (L) => ({
  actors: { boy: { at: [2, 0, 26], yaw: 0, anim: [{ clip: 'idle' }, { t: 0.1, clip: 'lift' }], face: 'cry' } },
  camera: fr('boy.chest', 'mcu', { yaw: -10, angle: 'high', screen: [0, 0.06], zoom: [0.06, { preset: 'punch_small', t: L('L25', 19) }] }),
  fx: [{ type: 'sepia' }],
}));
shot(cut('L26', 6), 'locked_doors', 'village', (L, D) => {
  const t1 = L('L26', 1), t2 = L('L26', 3);
  return {
    actors: { boy: { at: [-15.6, 0, -81.8], yaw: -90, anim: [{ clip: 'knock' }, { t: t2 + 0.1, clip: 'idle' }], face: [{ t: 0, expr: 'worried' }, { t: t2 + 0.1, expr: 'sad' }] } },
    camera: st([-5, 4.5, -73], [-17, 4.4, -85], { fov: 52, zoom: 0.08 }),
    fx: [{ type: 'sepia' }, { type: 'camera_shake_impact', t: t1 + 0.15, amp: 0.014, dur: 0.3 }, { type: 'camera_shake_impact', t: t2 + 0.12, amp: 0.014, dur: 0.3 }],
    update(ctx, lt) {
      for (const s of [-1, 1]) { const g = grp(ctx, `shut_-1_${s}`), u = EASE.inQuad(clamp((lt - (s < 0 ? t1 : t2)) / 0.15)); g.rotation.y = -1 * s * Math.PI * (1 - u); }
    },
  };
});
shot(cut('L26', 13), 'took_one_thing', 'village', () => ({
  look: 'overcast', props: { bell: false },
  actors: { grabberKind: { at: [-4, 0, -78], yaw: 0, show: ['bellHeld'], anim: [{ clip: 'drag_walk', to: [-4, 0, -72], speed: 5, layer: { clip: 'hold_l', parts: ['lArm'] } }], face: 'sad' } },
  camera: st([6, 4, -50], [-4, 8, -76], { fov: 58, zoom: 0.1 }),
  fx: [{ type: 'sepia' }, snow()],
}));
shot(cut('L27', 0), 'hoping', 'mill', () => ({
  look: 'overcast',
  actors: { grabberKind: { at: [2.5, hillY(2.5, -25), -25], yaw: 10, anim: [{ clip: 'sit', ground: true, layer: 'palms_up' }], face: 'worried', lookAt: [0, 2, 200] } },
  camera: st([10, hillY(10, -8) + 4, -8], [1.5, hillY(0, -25) + 4.5, -25], { fov: 50, zoom: 0.08 }),
  fx: [{ type: 'sepia' }, snow()],
}));
shot(cut('L28', 0), 'nobody_came', 'mill', () => ({
  look: 'overcast',
  actors: { grabberKind: { at: [2.5, hillY(2.5, -25), -25], yaw: 10, anim: [{ clip: 'sit', ground: true, add: { head: [22, 0, 0] } }], face: 'sad' } },
  camera: st([34, 62, 44], [1, 32, -24], { fov: 46, zoom: 'pull_gentle' }),
  fx: [{ type: 'sepia' }, snow(), { type: 'particles', kind: 'snow_spheres', pos: [0, 40, -20], area: [80, 30, 80], rate: 40 }],
}));

// CLIMAX (back in the mill)
shot(cut('L28', 5), 'did_the_thing', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -11], yaw: 180, anim: [{ clip: 'walk', to: [0, 0, -15.3], speed: 6 }], face: 'determined' }),
    grabberKind: { at: [0, 0, -23.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' } }], face: 'sad' },
    pip: { at: 'set.shelfSeat', yaw: 90, anim: [{ clip: 'sit', seat: 0, layer: 'eat' }], face: 'happy' },
  },
  camera: st([19, 7, 2], [0, 4.5, -18], { fov: 54, zoom: 0.08 }),
}));
shot(cut('L28', 12), 'nobody_has_done', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -15.3], yaw: 180, anim: [{ clip: 'idle' }, { t: 0.6, clip: 'hold_both' }], face: 'determined' }),
    grabberKind: { at: [0, 0, -23.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' } }], face: [{ t: 0, expr: 'sad' }, { t: 1.0, expr: 'surprised' }], lookAt: 'lenny.head' },
  },
  camera: st([10, 5.5, -12], [0, 4.5, -16.5], { fov: 50, zoom: 0.1 }),
}));
shot(cut('L29', 0), 'held_his_hands', 'millIn', (L) => ({
  actors: {
    lenny: post({ at: [0, 0, -15.3], yaw: 180, anim: [{ clip: 'pose', pose: { lArm: [86, -8, 0], rArm: [86, -8, 0] } }], face: 'smile' }),
    grabberKind: { at: [0, 0, -23.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' } }], face: 'happy' },
  },
  camera: st([6, 9.5, -10.5], [0, 3.2, -17.6], { fov: 46, zoom: 0.12 }),
  fx: [{ type: 'sparkles', at: [0, 3, -17.6], t: L('L28', 13), count: 10, area: [2.5, 1.5, 1.5] }, { type: 'glow_pulse', at: [0, 3, -17.6], color: '#ffc86a', t: L('L28', 14), dur: 0.8, sparkles: 0, light: 40 }],
  post: { dof: { focus: [0, 2.9, -17.6], bokeh: 3 } },
}));
shot(cut('L29', 5), 'let_go', 'millIn', () => ({
  actors: {
    lenny: post({ at: [0, 0, -15.3], yaw: 180, anim: [{ clip: 'pose', pose: { lArm: [86, -8, 0], rArm: [86, -8, 0] } }, { t: 0.15, clip: 'idle', fade: 0.3 }], face: 'smile' }),
    grabberKind: { at: [0, 0, -23.5], yaw: 0, anim: [{ clip: 'kneel', layer: { clip: 'palms_up' } }, { t: 0.25, clip: 'stand_up' }], face: 'confused' },
  },
  camera: st([18, 5, -17], [0, 5, -19], { fov: 50, zoom: 0.08 }),
}));
shot(cut('L29', 7), 'i_clapped', 'millIn', () => ({
  actors: { lenny: post({ at: [0, 0, -15.3], yaw: 180, anim: [{ clip: 'clap' }], face: 'grin' }) },
  camera: fr('lenny.head', 'mcu', { yaw: -30, screen: [0, 0.1], zoom: 0.12 }),
  fx: [{ type: 'sparkles', at: 'lenny.chest', t: 0.15, count: 6 }],
  post: { dof: { focus: 'lenny.head', bokeh: 3 } },
}));
shot(cut('L29', 10), 'clapped_back', 'millIn', (L) => {
  const tc = L('L29', 8) + 0.05;
  return {
    actors: {
      lenny: post({ at: [0, 0, -15.3], yaw: 180, anim: [{ clip: 'clap' }, { t: tc + 0.05, clip: 'scared' }], face: [{ t: 0, expr: 'grin' }, { t: tc + 0.05, expr: 'shock' }] }),
      grabberKind: { at: [0, 0, -23.5], yaw: 0, anim: [{ clip: 'idle' }, { t: tc - 0.2, clip: 'clap' }], face: 'happy' },
    },
    camera: st([13, 2, -6], [0, 7, -22], { fov: 56, zoom: 0.08 }),
    fx: [{ type: 'flash_white', t: tc, alpha: 0.7, dur: 0.18 }, { type: 'camera_shake_impact', t: tc, amp: 0.035, rot: 2, dur: 0.6 },
      { type: 'particles', kind: 'puff_ring', pos: [0, 6.5, -20.5], bursts: [tc], count: 14, radial: 6, size: [0.9, 1.2], life: 0.5 },
      { type: 'particles', kind: 'dust_wall', pos: [0, 0, -24], area: [30, 1, 8], bursts: [tc], count: 6, size: [6, 10], life: 2, rate: 0, opacity: 0.35 }],
  };
});
shot(cut('L30', 0), 'thunder', 'mill', () => ({
  look: NIGHT,
  camera: st([30, 36, 72], [0, 40, -40], { fov: 50, zoom: 0.06 }),
  fx: [{ type: 'flash', color: '#e8eeff', alpha: 0.85, t: 0, dur: 0.25 }, { type: 'flash', color: '#e8eeff', alpha: 0.5, t: 0.45, dur: 0.15 },
    { type: 'camera_shake_impact', t: 0, amp: 0.03, rot: 1.6, dur: 0.8 },
    { type: 'particles', kind: 'dust_wall', pos: [0, 30, -30], area: [50, 4, 40], bursts: [0], count: 18, life: 3, rate: 0, opacity: 0.55, color: ['#9a96a8', '#8a86a0'] },
    { type: 'particles', kind: 'puff_ring', pos: [0, 34, -40], bursts: [0.02], count: 20, radial: 26, size: [5, 7], life: 0.9 }, snow()],
}));

// SUNRISE WALK HOME (mill road, golden)
const walkHome = (z0, z1, sp = 5) => ({
  lenny: post({ at: [roadX(z0) + 2.6, roadY(z0), z0], yaw: 0, anim: [{ clip: 'walk', to: [roadX(z1) + 2.6, roadY(z1), z1], speed: sp, pose: { rArm: [-30, 6, 0] } }], face: 'happy' }),
  grabberKind: { at: [roadX(z0) - 3, roadY(z0), z0], yaw: 0, show: ['bellHeld'], anim: [{ clip: 'walk', to: [roadX(z1) - 3, roadY(z1), z1], speed: sp, layer: { clip: 'hold_l', parts: ['lArm'] } }], face: 'smile' },
  pip: { at: [0, 0, 0], attach: { to: 'grabberKind', offset: [-1.25, 4.72, -0.1] }, anim: [{ clip: 'sit', seat: 0, layer: 'eat' }], face: 'happy' },
});
const cartFollow = (ctx) => { const r = ctx.actors.lenny.root.position; place(grp(ctx, 'carts'), r.x + 0.4, r.y, r.z - 9.5, 0); };
shot(cut('L30', 7), 'sunrise_ews', 'mill', () => ({
  look: 'golden', props: { carts: true },
  actors: walkHome(100, 108),
  camera: st([30, 20, 190], [0, 10, 95], { fov: 46, zoom: 0.06 }),
  update(ctx) { cartFollow(ctx); },
}));
shot(cut('L30', 12), 'carrying', 'mill', () => ({
  look: 'golden', props: { carts: true },
  actors: walkHome(112, 118),
  camera: st([4, roadY(146) + 5, 146], [0, roadY(116) + 5.5, 116], { fov: 50, zoom: 0.08 }),
  update(ctx) { cartFollow(ctx); },
}));
shot(cut('L31', 0), 'still_eating', 'mill', () => ({
  look: 'golden', props: { carts: true },
  actors: walkHome(118, 124.5),
  camera: st([-2.5, roadY(128) + 9.5, 133], 'pip.head', { fov: 44, zoom: 0.1 }),
  update(ctx) { cartFollow(ctx); },
}));

// PAYOFF (village day)
shot(cut('L31', 6), 'boots_back', 'village', () => ({
  props: { bootPile: true },
  actors: {
    idlers: { at: [-15, 0, -6], yaw: 90 },
    abernathy: { at: [4, 0, -1], yaw: 150, anim: [{ clip: 'cheer' }], face: 'happy' },
    grabberKind: { at: [12, 0, -14], yaw: -40, anim: [{ clip: 'wave' }], face: 'smile' },
    lenny: post({ at: [6.5, 0, -12.5], yaw: -20, anim: [{ clip: 'cheer' }], face: 'grin' }),
  },
  camera: st([-8, 9, 24], [6, 3.5, -7], { fov: 52, zoom: 0.08 }),
}));
shot(cut('L31', 10), 'all_61', 'village', (L) => ({
  props: { bootPile: true },
  actors: { abernathy: { at: [4, 0, -1], yaw: 20, show: ['bootHeld'], anim: [{ clip: 'hold_up' }, { t: L('L31', 8), clip: 'shrug' }], face: [{ t: 0, expr: 'happy' }, { t: L('L31', 8), expr: 'confused' }] } },
  camera: st([2, 5, 10], [5, 3.2, -2], { fov: 50, zoom: 0.1 }),
}));
shot(cut('L32', 0), 'gordy_fainted', 'village', (L) => {
  const tf = L('L31', 12) - 0.1;
  return {
    actors: { gordy: { at: [-4, 0, 2], yaw: 150, anim: [{ clip: 'scared' }, { t: tf, clip: 'lie', fade: 0.35 }], face: [{ t: 0, expr: 'terrified' }, { t: tf, expr: 'dead' }], lookAt: [{ t: 0, at: [6, 11, -12] }, { t: tf, at: null }] } },
    camera: st([-8.5, 3.2, -6], [-4, 2.2, 2.6], { fov: 52, zoom: 0.1 }),
    fx: [{ type: 'particles', kind: 'puff', pos: [-4.5, 0.3, 4], bursts: [tf + 0.35], count: 8 }],
  };
});
shot(cut('L32', 3), 'grandma_nodded', 'village', () => ({
  actors: { grandma: { at: [-7, 0, -4], yaw: 120, anim: [{ clip: 'knit' }, { t: 0.15, clip: 'nod' }], face: 'content' }, idlers: { at: [-6, 0, 8], yaw: 170 } },
  camera: fr('grandma', 'ms', { yaw: 15, zoom: 0.1 }),
}));
shot(cut('L33', 0), 'told_you', 'village', () => ({
  actors: { grandma: { at: [-7, 0, -4], yaw: 120, anim: [{ clip: 'knit' }], face: [{ t: 0, expr: 'smug', talk: 0.5 }, { t: 0.55, expr: 'wink' }] } },
  camera: fr('grandma.head', 'mcu', { yaw: 10, screen: [0, 0.12], zoom: 0.12 }),
  post: { dof: { focus: 'grandma.head', bokeh: 3 } },
}));

// ENDING
shot(cut('L33', 4), 'clapping_legal', 'village', () => ({
  props: { legalSign: true },
  actors: {
    v1: { at: [-12, 0, -95], yaw: 160, anim: [{ clip: 'cheer' }], face: 'grin' },
    v2: { at: [-19.5, 0, -95.5], yaw: -160, anim: [{ clip: 'wave' }], face: 'happy' },
    v3: { at: [-16, 0, -93.5], yaw: 180, anim: [{ clip: 'stomp' }], face: 'happy' },
  },
  camera: st([-6, 6, -80], 'set.legalSign', { fov: 50, zoom: 0.1 }),
}));
shot(cut('L33', 8), 'two_people', 'village', () => ({
  actors: {
    lenny: post({ at: [-1.5, 0, -88], yaw: 10, anim: [{ clip: 'cheer' }], face: 'grin' }),
    grabberKind: { at: [3, 0, -90], yaw: -10, anim: [{ clip: 'cheer' }], face: 'happy' },
    stompers: { at: [0, 0, -102], yaw: 0 },
  },
  camera: st([1, 5, -66], [1, 6.5, -89], { fov: 52, zoom: 0.1 }),
}));
shot(cut('L33', 15), 'who_can_do_it', 'village', () => ({
  actors: {
    lenny: post({ at: [-1.5, 0, -88], yaw: 10, anim: [{ clip: 'clap' }], face: 'grin' }),
    grabberKind: { at: [3, 0, -90], yaw: -10, anim: [{ clip: 'clap' }], face: 'happy' },
    stompers: { at: [0, 0, -102], yaw: 0 },
  },
  camera: st([-6, 3.5, -70], [0.5, 6, -89], { fov: 52, zoom: 0.1 }),
  fx: [{ type: 'sparkles', at: 'lenny.chest', t: 0.2, count: 5 }, { type: 'sparkles', at: 'grabberKind.chest', t: 0.5, count: 6 }],
}));
shot(cut('L34', 0), 'every_wedding', 'village', () => ({
  actors: {
    stompers: { at: [0, 0, -94], yaw: 180 },
    bride: { at: [-1.4, 0, -110], yaw: 0, anim: [{ clip: 'cheer' }], face: 'happy' },
    groom: { at: [1.4, 0, -110], yaw: 0, anim: [{ clip: 'wave' }], face: 'grin' },
    lenny: post({ at: [-8, 0, -104], yaw: 60, anim: [{ clip: 'clap' }], face: 'grin' }),
    grabberKind: { at: [9, 0, -104], yaw: -60, anim: [{ clip: 'clap' }], face: 'happy' },
  },
  camera: st([2, 12, -64], [0, 4.5, -105], { fov: 52, zoom: 0.08, shake: 'rumble' }),
  fx: [{ type: 'particles', kind: 'confetti', pos: [0, 10, -106], bursts: [0.1, 0.7], count: 140 }],
}));
shot(cut('L35', 0), 'still_spare', 'village', () => ({
  actors: {
    gordy: { at: [-2.5, 0, 6], yaw: 60, anim: [{ clip: 'point', target: 'lenny.head' }], face: 'laugh' },
    kid1: { at: [-4.5, 0, 4], yaw: 50, anim: [{ clip: 'laugh' }], face: 'laugh' },
    lenny: post({ at: [3, 0, 8.5], yaw: -60, anim: [{ clip: 'shrug' }, { t: 0.7, clip: 'wave' }], face: 'grin' }),
  },
  camera: st([1.5, 4.2, 20], [0.5, 3.2, 6.5], { fov: 50, zoom: 0.1 }),
}));
shot(END, 'needs_one', 'village', () => ({
  actors: {
    lenny: post({ at: [0, 0, 10], yaw: 0, anim: [{ clip: 'cheer' }], face: 'grin' }),
    grabberKind: { at: [3.6, 0, 3], yaw: -15, anim: [{ clip: 'kneel', layer: 'wave' }], face: 'happy' },
    walkers: { at: [0, 0, -30] },
  },
  camera: st([0.2, 4.2, 22], [1.0, 3.4, 8], { fov: 50, zoom: 0.07 }),
}));

export default defineProduction({
  look: 'day',
  // widen 1.3: user asked to zoom out across the whole video so every character in a shot is fully visible;
  // gentler default push-in (0.06/s) so shots don't end tight.
  camera: { fov: 50, zoom: 0.06, shake: null, widen: 1.4 },
  cast: CAST,
  sets: SETS,
  shots: shots.map((s, i) => (i === 0 ? { ...s, prepare: async ({ THREE, getActor }) => { const a = {}; for (const k of ['lenny', 'pip', 'abernathy', 'mom', 'grandma', 'grabber', 'grabberKind', 'v3', 'v4']) a[k] = await getActor(k); attachExtras(THREE, a); } } : s)),
});
