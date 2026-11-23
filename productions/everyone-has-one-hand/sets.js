// Cast and sets for "Everyone Has ONE Hand", built from the shared library (assets/library): cast presets, environment
// kits (tudor_village, mill_exterior, mill_interior, bedroom, kids_room, living_room) and props. The custom clips this
// video introduced (stomp, clap, eat, sew, knit, hop, reach, palms_up, drag_walk, crouch_low, stand_up, ...) are engine clips.
// Units are studs; +Z faces the default camera.
import villagers from '/assets/library/cast/villager_crowd.json' with { type: 'json' };
import { attach } from '/assets/library/attachments.js';
export { hillY, roadY, roadX } from '/assets/library/kits/mill_exterior.js';

// ---------- cast (library presets) ----------
export const MEDIEVAL = villagers.spec.crowd.outfits;
const HAIRS = ['bob', 'messy', 'bun', 'balding', 'bald', 'ponytail'];
const P = (preset) => ({ preset });
export const CAST = {
  lenny: P('lenny'), pip: P('pip'), mom: P('mom'), grandma: P('grandma'), gordy: P('gordy'), kid1: P('kid_bob'), kid2: P('kid_fringe'), abernathy: P('mrs_abernathy'),
  v1: P('villager_mustache'), v2: P('villager_blue_dress'), v3: P('villager_beard'), v4: P('villager_ponytail'), v5: P('villager_bald_box'), v6: P('villager_curly'),
  bride: P('bride'), groom: P('groom'), grabber: P('grabber'), grabberKind: P('grabber_gentle'), boy: P('grabber_boy'), baby: P('baby'),
  walkers: { crowd: { count: 22, path: [[-6, 0, 70], [-6, 0, -95], [6, 0, -95], [6, 0, 70], [-6, 0, 70]], width: 4, clip: 'walk', speed: 5, seed: 11, outfits: MEDIEVAL, faces: ['smile', 'neutral', 'happy', 'content'], hairs: HAIRS } },
  stompers: { crowd: { count: 34, area: [-13, -6, 13, 6], clip: ['stomp', 'stomp', 'cheer'], seed: 21, yawJitter: 25, outfits: MEDIEVAL, faces: ['happy', 'grin', 'smile'], hairs: HAIRS } },
  idlers: { crowd: { count: 18, area: [-12, -5, 12, 5], clip: ['idle', 'look_around', 'idle'], seed: 31, yawJitter: 40, outfits: MEDIEVAL, faces: ['neutral', 'smile', 'worried'], hairs: HAIRS } },
};

// ---------- extra character props (library attachments, attached once at load, toggled with `hide`) ----------
export function attachExtras(THREE, a) {
  a.lenny.accessories.hand_l_mesh.name = 'hand_l_mesh'; // glow_pulse target on the reveal
  attach(THREE, a.lenny, { type: 'sewn_sleeve', key: 'stitch_l' });
  attach(THREE, a.pip, 'cookie');
  attach(THREE, a.abernathy, { type: 'boot_on_leg', key: 'boot_r' }); // her one remaining boot
  attach(THREE, a.mom, 'needle');
  attach(THREE, a.grandma, { type: 'knitting', key: 'needle' });
  attach(THREE, a.grabber, { type: 'glow_eyes', key: 'eyes' }); // night shots
  for (const id of ['grabber', 'grabberKind']) attach(THREE, a[id], { type: 'held_bell', key: 'bellHeld' });
  for (const id of ['v3', 'v4']) attach(THREE, a[id], 'jar'); // a jar nobody can open
  attach(THREE, a.abernathy, { type: 'held_boot', key: 'bootHeld' }); // payoff
}

// Toggleable set pieces per set: names -> default visibility (each shot's `props` overrides; see production.js).
export const TOGGLES = {
  village: { bootPile: false, legalSign: false, hayCart: true, bell: true, wedding: true, boxDown: false },
  mill: { footprints: true, carts: false, bellCarry: false },
  millIn: {},
  house: { pipHand: false },
};

// ---------- sets ----------
const B = (S, p) => S.part({ batch: true, ...p });
export const SETS = {
  village: async (S) => {
    await S.kit('tudor_village'); // Main Street: Lenny's house, glove shop, jar factory, church + bell, wedding arch, far mill
    await S.prop('hay_cart', { name: 'hayCart', pos: [7, 0, -30], yaw: 20 });
    await S.prop('boot', { pos: [18.0, 0.25, -16.5], yaw: -60 }); // Mrs. Abernathy's lost boot
    await S.prop('notice_board', { name: 'legalSign', pos: [-16, 0, -100], lines: [{ text: 'BY ORDER OF THE MAYOR', size: 0.4 }, { text: 'CLAPPING' }, { text: 'IS NOW LEGAL', size: 0.6 }] });
    S.anchor('legalSign', [-16, 6, -100]);
    await S.prop('boot_pile', { name: 'bootPile', pos: [8, 0.2, -6] });
    S.anchor('bootPile', [8, 2, -6]);
    S.group('boxDown', {}, () => B(S, { size: [1.6, 1.4, 1.6], pos: [-6.5, 0.9, 50.6], material: 'Cardboard', color: '#b58e5f' }));
    for (const [side, z] of [[-1, -86], [1, -86]]) { // shutter leaves on the ground-floor windows (flashback)
      const x0 = side * (27 - 7.12), wz = side < 0 ? z - 18 * 0.22 : z + 20 * 0.22;
      for (const s of [-1, 1]) {
        const hx = x0 - side * 0.4, hz = wz + s * 2.1;
        S.group(`shut_${side}_${s}`, { pivot: [hx, 5.4, hz] }, () => B(S, { size: [0.3, 3.8, 2.1], pos: [hx, 5.4, hz - s * 1.05], material: 'WoodPlanks', color: '#3a5a2a' }));
      }
    }
  },
  mill: async (S) => {
    await S.kit('mill_exterior'); // hill, mill + sails, snowy road with footprints, dead trees, crows, far village
    await S.prop('hay_cart', { name: 'carts', pos: [0, 0, 0] }); // stolen goods carried home at sunrise (toggled)
    await S.prop('church_bell', { name: 'bellCarry', pos: [0, -2.5, 0], size: 0.7 });
  },
  millIn: (S) => S.kit('mill_interior'),
  house: async (S) => { // three rooms side by side: Lenny's (x 0), Pip's (x 60), living room (x -60)
    S.look('interior');
    await S.kit('bedroom', { name: 'lenny', look: null });
    await S.kit('kids_room', { pos: [60, 0, 0], name: 'pip', look: null });
    await S.kit('living_room', { pos: [-60, 0, 0], name: 'living', look: null });
  },
};
