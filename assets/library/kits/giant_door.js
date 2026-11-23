// THE DOOR ("The Door"): a 40-stud freestanding double door on a stone step in a square - no walls. Its oak leaves open a
// GAP; through the gap you see SOMEWHERE ELSE: a dark red-black cave with the creature's face pressed to the gap (red
// glowing eye, cracked grey stone skin, ear-to-ear ladder grin = the _giant.js head) and, far back, a huge mouth. That
// "other side" is a clipped portal: its materials are clipped every frame to the camera frustum through the door opening
// (no stencil needed), so it only ever shows through the gap; from behind the door you see whatever stands there (a fountain).
// Village side = +Z. Leaves open toward +Z (pressing on the oak bar, which sits in iron sockets on the jamb inner faces).
// Animate every frame from shot.update (full state; missing = default):
//   S.api.door.set({ t, gap: studs between the leaves (0 shut; small gaps slide the leaves apart, no V), swing: 0..1 (leaves
//     swing open toward +Z, 1 = 80 deg), bend: 0..1 (bar bows toward +Z, splinters at the middle), lift: 0..1 (bar lifted off
//     its sockets, up + forward), barOff: true (bar gone), boards: 0..12 (boards nailed, bottom up), pop: 0..1 (every nail
//     pushed out from the other side), claw: 0..1 (claws slide out of the gap along the stones), scratch: 0..1 (claw
//     scratching), portal: true|false (other side visible), face: { x, y, z, ...head pose (eyeL, eyeR, look, lookAt, grin,
//     jaw, click, head: [pitch, yaw]) } | null (face hidden), maw: 0..1 (the huge mouth far back opens; 0 = hidden),
//     breath: 0..1 (warm breath glow at the gap), glowIn: 0..1 (village light seen through the gap from the other side) })
//   S.api.door.followHead(actor, pose, t) - the creature's free head (option bodyHead) rides on a cast body (e.g. preset
//     door_monster): the body's own head is hidden, the stone head sits on its neck; pose = head pose as above.
export const meta = {
  id: 'giant_door', tags: ['door', 'giant', 'portal', 'gap', 'oak', 'bar', 'handprints', 'boards', 'nails', 'monster', 'eye', 'red eye', 'other side', 'claws', 'mouth', 'horror', 'medieval', 'square'],
  description: 'Freestanding 40-stud oak double door on a stone step (no walls): leaves that slide/swing open, an oak bar with two small carved handprints (bends, lifts, drops), 12 nailed boards whose nails pop out, claws through the gap, and a clipped "other side" portal (dark cave, the red-eyed stone creature face, a huge mouth far back) visible only through the gap.',
  options: { pos: 'base centre [x, y, z] ([0, 0, 0]); door plane at z, village side +Z', portal: 'false = no other side (film it from the other side: use glowIn)', bodyHead: 'true = also build the free creature head for a cast body (followHead)', thing: 'true = the colossal thing far behind (other-side sets: api.door.thing.set({ z, scale, maw, lift, show }))',
    faceScale: 'creature face scale in the gap (0.09: eye ~2.1 studs, head ~10 wide)', headScale: 'free head scale (0.08)', barY: 'bar centre height above the door base (2.0: a child holds it at the shoulders)', depth: 'other-side depth behind the door (18; keep anything behind the door farther than this)' },
  anchors: { door_gap: 'gap centre at eye height (front)', door_bar: 'bar centre (front face)', door_hands: 'the two handprints (front face of the bar)', door_eye: 'the creature eye (default face pose)', door_step: 'front edge of the step (where the hero stands)',
    door_back: 'behind the door at the step edge', cam_door_wide: 'wide front view of the door', cam_door_gap: 'close on the gap', cam_door_back: 'behind the door, toward the village' },
};

const D2R = Math.PI / 180;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = cl(x); return x * x * (3 - 2 * x); };

export default async function giantDoor(S, o = {}) {
  const THREE = S.THREE;
  const { makeKit } = await import('./_matkit.js');
  const { buildHead } = await import('./_giant.js');
  const [ox, oy, oz] = o.pos ?? [0, 0, 0];
  const Xd = makeKit(S);                        // the door (normal materials)
  const W = 11, H = 38.2, B0 = 0.8, T = 0.7;    // half opening width, leaf height, step top, half leaf thickness
  const JW = 3.5, JD = 3, BY = B0 + (o.barY ?? 2.0), BZ = T + 0.85, DEPTH = o.depth ?? 18;
  const P = (x, y, z) => [ox + x, oy + y, oz + z];
  const box = (X, mat, x0, x1, y0, y1, z0, z1, color, ex = {}) => X.p({ mat, size: [x1 - x0, y1 - y0, z1 - z0], pos: P((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color, ...ex });
  const api = { groups: {} };
  // ------------------------------------------------------------ step + frame (stone, deep jambs)
  box(Xd, 'stone', -W - JW - 3, W + JW + 3, -0.5, B0 - 0.35, -6, 7, '#8a8478');                    // lower step (sunk into the cobbles)
  box(Xd, 'stone', -W - JW - 1, W + JW + 1, B0 - 0.36, B0, -4.5, 5.2, '#9a9488');                  // upper step
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -W - JW : W, x1 = s < 0 ? -W : W + JW;
    box(Xd, 'stone', x0, x1, B0, H + B0 + 0.2, -JD, JD, '#7e7a70');                                // jamb
    box(Xd, 'stone', x0 - 0.4, x1 + 0.4, B0, B0 + 2.2, -JD - 0.4, JD + 0.4, '#6e6a62');               // plinth block
    for (let k = 0; k < 6; k++) box(Xd, 'stone', x0 - 0.25, x1 + 0.25, B0 + 5 + k * 6.2, B0 + 5.7 + k * 6.2, -JD - 0.25, JD + 0.25, '#6a665e'); // carved bands
  }
  box(Xd, 'stone', -W - JW - 0.8, W + JW + 0.8, H + B0 + 0.2, H + B0 + 4.4, -JD - 0.5, JD + 0.5, '#7a766c'); // lintel
  box(Xd, 'stone', -W - JW - 1.6, W + JW + 1.6, H + B0 + 4.4, H + B0 + 5.6, -JD - 1.1, JD + 1.1, '#6a665e'); // cornice
  box(Xd, 'stone', -4, 4, H + B0 + 5.6, H + B0 + 8.4, -JD - 0.6, JD + 0.6, '#76726a');               // keystone block
  // ------------------------------------------------------------ leaves (pivot = outer hinge edge on the door plane)
  const planks = ['#5e3a20', '#683f24', '#58361d', '#623c22', '#54331b'];
  const leaf = (s) => Xd.group(`door_leaf${s < 0 ? 'L' : 'R'}`, { pivot: P(s * W, B0, 0) }, () => {
    for (let k = 0; k < 5; k++) { const xa = s * (W - k * 2.2), xb = s * (W - (k + 1) * 2.2); box(Xd, 'beam', Math.min(xa, xb) + 0.03, Math.max(xa, xb) - 0.03, B0 + 0.05, B0 + H, -T + (k % 2) * 0.06, T - (k % 2) * 0.06, planks[k]); }
    box(Xd, 'beam', s < 0 ? -W : 0.05, s < 0 ? -0.05 : W, B0 + 0.05, B0 + H, -T + 0.12, T - 0.12, '#3c2616'); // core (no gaps between planks)
    for (const y of [5.5, 14, 22.5, 31, 36.5]) { // iron straps + rivets (front and back)
      for (const z of [1, -1]) box(Xd, 'iron', s < 0 ? -W + 0.3 : 0.4, s < 0 ? -0.4 : W - 0.3, B0 + y, B0 + y + 1.1, z > 0 ? T : -T - 0.3, z > 0 ? T + 0.3 : -T, '#2c2c30');
      for (let k = 0; k < 4; k++) Xd.p({ shape: 'ball', mat: 'iron', size: [0.45, 0.45, 0.3], pos: P(s * (1.6 + k * 2.8), B0 + y + 0.55, T + 0.36), color: '#3a3a3e' });
    }
  });
  const leafL = leaf(-1), leafR = leaf(1);
  // ------------------------------------------------------------ the oak bar (two halves pivoting at the sockets, handprints in the middle)
  const bar = Xd.group('door_bar', { pivot: P(0, BY, BZ) }, () => {
    for (const s of [-1, 1]) Xd.group(`door_bar${s < 0 ? 'L' : 'R'}`, { pivot: P(s * (W + 0.6), BY, BZ) }, () => {
      box(Xd, 'wood', s < 0 ? -W - 1.2 : 0.02, s < 0 ? -0.02 : W + 1.2, BY - 0.65, BY + 0.65, BZ - 0.65, BZ + 0.65, '#c08a52');
      for (let k = 0; k < 4; k++) box(Xd, 'iron', s * (2.5 + k * 2.3), s * (2.5 + k * 2.3) + 0.12, BY - 0.69, BY + 0.69, BZ - 0.62, BZ + 0.69, '#2c2c30'); // iron bands
      // a small carved handprint, fingers up (darker, standing 0.05 proud of the front face: never coplanar)
      const hx = s * 0.85, f = BZ + 0.7;
      box(Xd, 'wood', hx - 0.24, hx + 0.24, BY - 0.42, BY + 0.06, f - 0.06, f, '#3e2614');
      for (let k = 0; k < 4; k++) { const fx = hx + (k - 1.5) * 0.13 * -s; box(Xd, 'wood', fx - 0.045, fx + 0.045, BY + 0.06, BY + 0.34 + (k === 1 || k === 2 ? 0.06 : 0), f - 0.06, f, '#3e2614'); }
      box(Xd, 'wood', hx + s * 0.24, hx + s * 0.4, BY - 0.3, BY - 0.08, f - 0.06, f, '#3e2614');
      // splinters at the broken middle (shown by bend)
      api[`spl${s}`] = Xd.group(`door_splinter${s < 0 ? 'L' : 'R'}`, { pivot: P(0, BY, BZ) }, () => { for (let k = 0; k < 5; k++) box(Xd, 'wood', s * 0.02, s * (0.5 + (k % 3) * 0.35), BY - 0.6 + k * 0.28, BY - 0.48 + k * 0.28, BZ - 0.5 + (k % 2) * 0.5, BZ - 0.3 + (k % 2) * 0.5, '#c8a070'); });
    });
  });
  for (const s of [-1, 1]) { // iron sockets on the jamb inner faces
    box(Xd, 'iron', s < 0 ? -W - 0.02 : W - 1.0, s < 0 ? -W + 1.0 : W + 0.02, BY - 0.9, BY - 0.65, BZ - 0.9, BZ + 0.9, '#2a2a2e');
    box(Xd, 'iron', s < 0 ? -W - 0.02 : W - 1.0, s < 0 ? -W + 1.0 : W + 0.02, BY - 0.9, BY + 0.9, BZ + 0.66, BZ + 0.9, '#2a2a2e');
  }
  // ------------------------------------------------------------ 12 boards nailed across, 3 nails each (nails pop out)
  const boards = [], nails = [];
  for (let k = 0; k < 12; k++) {
    const y = B0 + 5.2 + k * 1.75, tilt = ((k * 37) % 7 - 3) * 0.5;
    boards.push(Xd.group(`door_board${k}`, { pivot: P(0, y, T + 0.3) }, () => {
      box(Xd, 'planks', -W + 0.2, W - 0.2, y - 0.55, y + 0.55, T + 0.05, T + 0.5, ['#a0784c', '#8a6a44', '#9a7650'][k % 3], { rot: [0, 0, 0] });
      for (const nx of [-W + 1.2, -2, 2, W - 1.2]) nails.push(Xd.group(null, { pivot: P(nx, y, T + 0.5) }, () => {
        box(Xd, 'steel', nx - 0.16, nx + 0.16, y - 0.16, y + 0.16, T + 0.5, T + 0.62, '#9a9ea4');
        box(Xd, 'steel', nx - 0.05, nx + 0.05, y - 0.05, y + 0.05, T - 0.6, T + 0.5, '#8a8e94');
      }));
    }));
    boards[k].userData.tilt = tilt;
  }
  // ------------------------------------------------------------ claws (village side, slide out of the gap along the stones)
  const claw = Xd.group('door_claw', { pivot: P(0, B0 + 0.35, -1.2) }, () => {
    box(Xd, 'giantSkinDark', -0.75, 0.75, B0 + 0.05, B0 + 1.1, -4, -0.8, '#5f656e');                        // back of the hand (stays in the gap)
    for (let k = 0; k < 3; k++) Xd.group(`door_finger${k}`, { pivot: P((k - 1) * 0.5, B0 + 0.45, -0.8) }, () => {
      const x = (k - 1) * 0.5, L = k === 1 ? 2.6 : 2.2;
      box(Xd, 'giantSkin', x - 0.2, x + 0.2, B0 + 0.2, B0 + 0.7, -0.8, -0.8 + L, '#6e747c');
      Xd.p({ shape: 'ball', mat: 'knuckle', size: [0.5, 0.5, 0.5], pos: P(x, B0 + 0.5, -0.8 + L * 0.5), color: '#7a8088' });
      Xd.p({ mat: 'nail', size: [0.18, 0.24, 1.2], pos: P(x, B0 + 0.36, -0.8 + L + 0.5), rot: [10, 0, 0], color: '#4a443a' }); // long claw
      Xd.p({ mat: 'nail', size: [0.1, 0.14, 0.55], pos: P(x, B0 + 0.2, -0.8 + L + 1.2), rot: [34, 0, 0], color: '#2a261e' });
    });
  });
  // ------------------------------------------------------------ warm breath glow / village light (halo planes in the gap)
  const breath = Xd.group('door_breath', { pivot: P(0, B0 + 6, T + 1.2) }, () => { Xd.p({ mat: 'halo', size: [3.2, 6, 0.02], pos: P(0, B0 + 6, T + 1.2), color: '#ff9a4a', gain: 0.5, fog: true, shadow: false }); });
  const glowIn = Xd.group('door_glow_in', { pivot: P(0, B0 + H / 2, T + 3.5) }, () => { Xd.p({ mat: 'neon', size: [W * 2 - 0.4, H - 0.4, 0.2], pos: P(0, B0 + H / 2, T + 3.5), color: '#ffb060', gain: 1.6, shadow: false }); });
  // ------------------------------------------------------------ free creature head (for a cast body)
  let bodyHead = null;
  if (o.bodyHead) { const g = Xd.group('door_bodyhead', {}, () => { bodyHead = buildHead(Xd, S, { pos: [0, 0, 0], prefix: 'bodyhead', eyeStyle: 'red' }); }); bodyHead.outer = g; g.visible = false; }
  // ------------------------------------------------------------ THE THING behind (option thing: colossal silhouette far back on the other side)
  let thing = null;
  if (o.thing) {
    const tz = -150, k = 1;
    thing = {};
    thing.root = Xd.group('door_thing', { pivot: P(0, 0, tz) }, () => {
      const q = (x0, x1, y0, y1, z0, z1, c = '#1c1418', m = 'giantSkinDark') => box(Xd, m, x0, x1, y0, y1, tz + z0, tz + z1, c);
      for (const s of [-1, 1]) q(s * 10 - 9, s * 10 + 9, 0, 46, -10, 10, '#1a1216');                          // legs
      q(-34, 34, 44, 120, -16, 16, '#1e161a');                                                                 // torso
      for (const s of [-1, 1]) q(s * 34 - (s > 0 ? 0 : 18), s * 34 + (s > 0 ? 18 : 0), 50, 118, -12, 12, '#181014'); // arms
      q(-24, 24, 120, 160, -20, 18, '#221a1e');                                                                // head
      for (const s of [-1, 1]) Xd.p({ shape: 'hball', mat: 'neon', size: [7, 4.2, 1], pos: P(s * 10, 146, tz + 18.6), color: '#ff5a10', gain: 3.4, shadow: false });
      thing.jaw = Xd.group('door_thing_jaw', { pivot: P(0, 130, tz + 10) }, () => {
        q(-20, 20, 120, 128, -16, 18.4, '#2a2024');
        for (let i = 0; i < 9; i++) Xd.p({ mat: 'tooth', size: [2.2, 5, 1.4], pos: P(-16 + i * 4, 129.5, tz + 18.6), color: '#b8a880' });
      });
      Xd.p({ mat: 'neon', size: [36, 10, 1], pos: P(0, 131, tz + 15), color: '#6a0a06', gain: 1.6, shadow: false }); // red throat
      for (let i = 0; i < 9; i++) Xd.p({ mat: 'tooth', size: [2.2, 5, 1.4], pos: P(-16 + i * 4, 134.5, tz + 18.6), color: '#c4b48a' });
      thing.foot = Xd.group('door_thing_foot', { pivot: P(28, 0, tz + 40) }, () => { q(16, 40, 0, 14, 30, 58, '#1c1418'); for (let i = 0; i < 4; i++) box(Xd, 'nail', 17 + i * 6, 21 + i * 6, 0, 4, tz + 58, tz + 62, '#2a241c'); });
    });
    thing.set = (p = {}) => {
      thing.root.visible = p.show !== false; thing.root.position.set(...P(0, 0, p.z ?? tz)); thing.root.scale.setScalar(p.scale ?? 1);
      thing.jaw.rotation.set(sm(p.maw ?? 0) * 22 * D2R, 0, 0);
      thing.foot.position.y = thing.foot.userData.pivot[1] + 18 * cl(p.lift ?? 0); // foot raised 0..1 (animate up, then slam to 0)
    };
    api.thing = thing;
  }
  Xd.flush();
  // ------------------------------------------------------------ the other side (clipped portal)
  let face = null, faceG = null, maw = null, portalRoot = null;
  const planes = [0, 1, 2, 3, 4].map(() => new THREE.Plane());
  if (o.portal !== false) {
    const Xp = makeKit(S), FS = o.faceScale ?? 0.09;
    portalRoot = Xp.group('door_beyond', {}, () => {
      box(Xp, 'rockWet', -W - 8, W + 8, B0 - 0.3, B0 + 0.25, -DEPTH, -0.5, '#2a2226');                       // floor
      box(Xp, 'maw', -W - 8, W + 8, B0, H + B0 + 4, -DEPTH - 1, -DEPTH, '#0b0507');                          // far wall
      for (const s of [-1, 1]) box(Xp, 'rock', s < 0 ? -W - 9 : W + 8, s < 0 ? -W - 8 : W + 9, B0, H + B0 + 4, -DEPTH, -0.5, '#1a1416'); // side walls
      box(Xp, 'rock', -W - 8, W + 8, H + B0 + 4, H + B0 + 5, -DEPTH, -0.5, '#140e10');                       // ceiling
      for (let k = 0; k < 14; k++) { const x = ((k * 53) % 23) - 11.5, z = -3 - ((k * 31) % 14), h = 0.8 + ((k * 17) % 5) * 0.5; Xp.p({ shape: 'ball', mat: 'rockWet', size: [2.4, h, 2], pos: P(x, B0 + h * 0.3, z), color: '#2e2428' }); } // boulders
      Xp.p({ mat: 'neon', size: [W * 2 + 14, 6, 0.3], pos: P(0, B0 + 1.5, -DEPTH + 0.4), color: '#5a0a06', gain: 0.9, shadow: false }); // red glow low on the far wall
      faceG = Xp.group('door_face', { pivot: P(0, 0, 0) }, () => { face = buildHead(Xp, S, { pos: P(0, 0, 0), prefix: 'gapface', eyeStyle: 'red' }); });
      maw = Xp.group('door_maw', { pivot: P(0, B0 + 16, -DEPTH + 1.5) }, () => { // the huge mouth far back in the dark
        const cy = B0 + 16, z = -DEPTH + 1.6;
        api.mawUp = Xp.group('door_maw_up', { pivot: P(0, cy, z) }, () => {
          box(Xp, 'giantSkinDark', -20, 20, cy + 0.5, cy + 6, z - 0.8, z + 0.6, '#4a4c52');
          box(Xp, 'gum', -19, 19, cy - 0.2, cy + 0.9, z + 0.3, z + 1.1, '#5a1a1e');
          for (let k = 0; k < 9; k++) { const x = -16 + k * 4, L = 4 + ((k * 7) % 4) * 1.1; Xp.p({ mat: 'tooth', size: [2.4, L, 1], pos: P(x, cy + 0.4 - L / 2, z + 1.2), rot: [0, 0, ((k * 13) % 11) - 5], color: '#d2c49a' }); }
        });
        api.mawLo = Xp.group('door_maw_lo', { pivot: P(0, cy, z) }, () => {
          box(Xp, 'giantSkinDark', -20, 20, cy - 6, cy - 0.5, z - 0.8, z + 0.6, '#4a4c52');
          box(Xp, 'gum', -19, 19, cy - 0.9, cy + 0.2, z + 0.3, z + 1.1, '#5a1a1e');
          for (let k = 0; k < 8; k++) { const x = -14 + k * 4, L = 3 + ((k * 5) % 4) * 0.9; Xp.p({ mat: 'tooth', size: [2.2, L, 1], pos: P(x, cy - 0.4 + L / 2, z + 1.2), rot: [0, 0, ((k * 11) % 11) - 5], color: '#c8b890' }); }
        });
        Xp.p({ shape: 'hball', mat: 'neon', size: [38, 12, 0.4], pos: P(0, cy, z + 0.2), color: '#a01008', gain: 1.6, shadow: false }); // red throat
        for (const s of [-1, 1]) Xp.p({ shape: 'hball', mat: 'neon', size: [4.4, 2.2, 0.4], pos: P(s * 10, cy + 12, z + 0.3), color: '#ff3a10', gain: 3.4, shadow: false }); // two eyes above it
      });
    });
    Xp.flush();
    faceG.scale.setScalar(FS);
    // clip every other-side material to the frustum through the opening (rebuilt per camera in onBeforeRender)
    S.renderer.localClippingEnabled = true;
    const R = [ox - W + 0.05, oy + B0 + 0.05, ox + W - 0.05, oy + B0 + H + 0.15, oz]; // x0, y0, x1, y1, z
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Vector3();
    let lastKey = '';
    const update = (cam) => {
      const C = cam.getWorldPosition(_c), key = `${C.x},${C.y},${C.z},${api.portalOn}`;
      if (key === lastKey) return; lastKey = key;
      if (!api.portalOn || C.z <= R[4] + 0.4) { for (const p of planes) p.set(new THREE.Vector3(0, 1, 0), -1e9); return; }
      const cs = [[R[0], R[1]], [R[2], R[1]], [R[2], R[3]], [R[0], R[3]]];
      _q.set((R[0] + R[2]) / 2, (R[1] + R[3]) / 2, R[4]); _q.add(_a.copy(_q).sub(C).normalize().multiplyScalar(0.5)); // a point surely inside the frustum
      for (let i = 0; i < 4; i++) {
        _a.set(cs[i][0], cs[i][1], R[4]); _b.set(cs[(i + 1) % 4][0], cs[(i + 1) % 4][1], R[4]);
        planes[i].setFromCoplanarPoints(C, _a, _b);
        if (planes[i].distanceToPoint(_q) < 0) planes[i].negate();
      }
      planes[4].set(new THREE.Vector3(0, 0, -1), R[4] + 0.2); // keep z <= door plane + 0.2
    };
    portalRoot.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = false;
      for (const mt of Array.isArray(m.material) ? m.material : [m.material]) { mt.clippingPlanes = planes; mt.clipShadows = false; }
      m.onBeforeRender = (r, sc, cam) => update(cam);
    });
  }
  // ------------------------------------------------------------ anchors
  const A = (n, p) => S.anchor(n, P(...p));
  A('door_gap', [0, B0 + 6.5, T + 0.5]); A('door_bar', [0, BY, BZ + 0.7]); A('door_hands', [0, BY, BZ + 0.75]); A('door_eye', [0, B0 + 6.5, -1.2]);
  A('door_step', [0, B0, 4.2]); A('door_back', [0, B0, -4.4]);
  A('cam_door_wide', [6, 7, 62]); A('cam_door_wide_at', [0, 16, 0]); A('cam_door_gap', [2.5, 6, 12]); A('cam_door_gap_at', [0, B0 + 5.5, 0]); A('cam_door_back', [-8, 6, -34]); A('cam_door_back_at', [0, 10, 0]);
  // ------------------------------------------------------------ per-frame state
  const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _qq = new THREE.Quaternion();
  const apply = (p = {}) => {
    const t = p.t ?? 0, g = cl(p.gap ?? 0, 0, 8), sw = sm(p.swing ?? 0), slide = Math.min(g, 3.2) / 2;
    const ang = (g > 3.2 ? Math.acos(cl(1 - (g - 3.2) / (2 * W), -1, 1)) / D2R : 0) + 80 * sw + 0.6 * g;
    leafL.position.set(...P(-W - slide, B0, 0)); leafL.rotation.set(0, -ang * D2R, 0);
    leafR.position.set(...P(W + slide, B0, 0)); leafR.rotation.set(0, ang * D2R, 0);
    const bend = cl(p.bend ?? 0), lift = sm(p.lift ?? 0);
    bar.visible = !p.barOff; bar.position.set(...P(0, BY + 3.2 * lift, BZ + 1.4 * lift)); bar.rotation.set(0, 0, 0);
    S.groups.door_barL.rotation.set(0, -bend * 4.5 * D2R, 0); S.groups.door_barR.rotation.set(0, bend * 4.5 * D2R, 0); // bows ~0.9 studs at the middle
    for (const s of [-1, 1]) { const sp = api[`spl${s}`]; sp.visible = bend > 0.25; sp.scale.setScalar(Math.max(0.01, sm((bend - 0.25) / 0.4))); }
    const nb = Math.round(cl(p.boards ?? 0, 0, 12)), pop = cl(p.pop ?? 0);
    boards.forEach((b, k) => { b.visible = k < nb; b.rotation.set(0, 0, b.userData.tilt * pop * D2R); });
    for (const n of nails) { const q = n.userData.pivot; n.position.set(q[0], q[1], q[2] + 0.9 * sm(pop)); }
    const c = cl(p.claw ?? 0), scr = cl(p.scratch ?? 0);
    claw.visible = c > 0.01; claw.position.set(...P(0, B0 + 0.35, -1.2 + 2.8 * sm(c))); claw.scale.setScalar(1.35);
    for (let k = 0; k < 3; k++) S.groups[`door_finger${k}`].rotation.set((-3 + 7 * scr * (0.5 + 0.5 * Math.sin(t * 9 + k * 1.3))) * D2R, (k - 1) * 9 * D2R, 0);
    breath.visible = (p.breath ?? 0) > 0.01; breath.scale.set(0.6 + 0.6 * (p.breath ?? 0), 0.6 + 0.5 * (p.breath ?? 0), 1);
    glowIn.visible = (p.glowIn ?? 0) > 0; glowIn.scale.set(Math.max(0.01, Math.min(1, (g + 0.4) / (2 * W))) * 1, 1, 1);
    api.portalOn = p.portal !== false && !!portalRoot;
    if (portalRoot) portalRoot.visible = api.portalOn;
    if (faceG) {
      const f = p.face === undefined ? {} : p.face;
      faceG.visible = !!f;
      if (f) { faceG.position.set(...P(f.x ?? 0, f.y ?? 0.3, f.z ?? -6.9)); face.setPose({ eyeL: 1, eyeR: 1, breath: 1, ...f }, t); }
    }
    if (maw) { const m = cl(p.maw ?? 0); maw.visible = m > 0; api.mawUp.rotation.set(0, 0, 0); api.mawLo.rotation.set(0, 0, 0); api.mawUp.position.y = api.mawUp.userData.pivot[1] + 5 * sm(m); api.mawLo.position.y = api.mawLo.userData.pivot[1] - 5 * sm(m); }
    if (bodyHead) bodyHead.outer.visible = false; // shown again by followHead in the same frame
  };
  Xd.onFrame((t) => apply({ t }));
  api.set = apply;
  api.face = face; api.faceGroup = faceG; api.planes = planes; api.leaves = [leafL, leafR]; api.bar = bar; api.claw = claw;
  api.dims = { W, H, B0, BY, BZ, T, DEPTH };
  api.eyeWorld = (i = 0) => face ? face.pupil(i) : null;
  // the creature's head on a cast body: hide the body's own head, put the stone head on its neck
  api.followHead = (actor, pose = {}, t = 0, s = o.headScale ?? 0.08) => {
    if (!bodyHead || !actor?.parts?.head) return;
    const nk = actor.parts.head; nk.traverse((m) => { if (m.isMesh) m.visible = false; });
    actor.root.updateMatrixWorld(true);
    nk.matrixWorld.decompose(_p, _qq, _s);
    const g = bodyHead.outer; g.visible = true; g.matrixAutoUpdate = false;
    _m.compose(_p, _qq, _s.set(s, s, s)); g.matrix.copy(g.parent.matrixWorld).invert().multiply(_m); g.matrixWorldNeedsUpdate = true;
    bodyHead.setPose({ eyeL: 1, eyeR: 1, ...pose }, t);
    g.updateMatrixWorld(true);
  };
  S.api ??= {};
  S.api.door = api;
  return { anchors: S.anchors };
}
