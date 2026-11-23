// Above the cloud at night ("The Ropes"): a moonlit cloudscape (rolling silver cloud top to the horizon, cumulus towers,
// low mist, a huge moon) and THE GIANT sitting on a cloud mound like on a chair. Its right hand hangs palm-down over a
// cloud valley: every village rope rises through the cloud and ends in a knot on its fingers, and under the hand ~96 people
// it pulled up hang asleep by the ankle, swinging like lanterns. Mom hangs from the index finger with Toby's rope wrapped
// ten times round her wrist; that rope goes down through a round hole in the cloud (where Toby arrives).
// The giant faces +Z, seat at the origin, cloud surface ~ y 0. Animate it every frame from shot.update:
//   S.api.giant.set({ eyeL, eyeR, look | lookAt, grin, jaw, click, curl, stir, breath, swing, untie, momStays, momKnot (0 tied .. 1 untied), mayor,
//                     village, head: [pitch, yaw], tobyRope, t })      (full state: anything missing = default)
// See productions/the-ropes/sets_doc.json for the meaning and ranges of every parameter.

export const meta = {
  id: 'giant_on_cloud', tags: ['giant', 'monster', 'cloud', 'night', 'moon', 'ropes', 'hand', 'puppet', 'horror', 'sky', 'face', 'teeth', 'scary'],
  description: 'Moonlit cloudscape with a huge scary stone giant sitting on the cloud like a chair: deep-set eyes with tiny glowing pupils, a too-wide grin of long ladder teeth, boulder-knuckled hand palm-down with every rope knotted on its fingers and ~96 sleeping people hanging below like lanterns; hole in the cloud where a rope comes up. Animatable eyes, grin, teeth click, fingers, breathing, knots untying one by one (each rope wraps its finger with a knot on top, so the back of the hand reads as covered in knots; S.api.giant.rig.knotTop(which) gives the world point of a knot, for staging people at it).',
  options: { look: "'above' (default) or any look", sleepers: 'hanging people (96)', villageRopes: 'ropes from the village into the fingers (110)', mom: "'kit' (default, built-in sleeper) | 'empty' (slot kept for a cast actor; rope + wrist coil stay)",
    moon: 'false = no moon disc', mist: 'false = no low mist sheets', towers: 'number of far cumulus towers (70)' },
  anchors: {
    cam_wide: 'wide of the giant sitting on the cloud (moon behind)', cam_face_below: 'cold-open face reveal from low on the cloud, looking up', cam_face: 'the face, eye level, medium',
    cam_grin: 'close on the grin and teeth', cam_eye: 'close on the right eye (eye roll)', cam_hand: 'hand close-up: knots on the fingers', cam_hand_top: 'over the back of the hand toward the face (Toby on the hand)',
    cam_sleepers: 'under the hand looking up at the hanging sleepers', cam_mom: 'Mom on her rope (wrist coil)', cam_arrive: 'low by the hole: Toby climbs out of the cloud', cam_fall: 'from the fingers down: people fall into the cloud',
    cam_hole_up: 'from the hole looking straight up the rope to Mom', spot_hole: 'where the rope comes out of the cloud (actor feet)', spot_hand_top: 'standing on the back of the hand', spot_knuckle: 'kneeling at the index knuckle (untying)',
    spot_mom_ankle: "Mom's ankle (rope end)", spot_mom_wrist: "Mom's wrist (Toby's rope)", giant_head: 'head centre', giant_mouth: 'mouth centre', giant_eye_l: 'left eye (screen right)', giant_eye_r: 'right eye', giant_hand: 'palm centre',
  },
};

export const LOOK_ABOVE = { // cold moonlight above the cloud: navy sky, silver cloud, under-light bounced off the cloud
  preset: 'night',
  sun: { color: '#dce4ff', intensity: 2.6, elevation: 26, azimuth: 32 },
  hemi: { sky: '#40528a', ground: '#9aa8cc', intensity: 0.8 }, ambient: { color: '#a8b4d8', intensity: 0.1 }, env: 0.7, lights: 1,
  sky: { zenith: '#050b26', horizon: '#26407e', ground: '#1a2850', haze: 0.9, hazeColor: '#3a5294', clouds: 0, stars: 1, moon: 0, sunSize: 0.01, sunGlow: 0 },
  fog: { color: '#2c4380', density: 0.00042 }, exposure: 1.2, shadow: { softness: 0.4, intensity: 0.85 },
  post: { bloom: { intensity: 0.9, threshold: 0.85 }, ao: { intensity: 1.0 }, grade: { saturation: 1.12, contrast: 1.12, temperature: -0.04 } },
};

export default async function giantOnCloud(S, o = {}) {
  const THREE = S.THREE;
  const { makeKit } = await import('./_matkit.js');
  const { cloudLayer, cloudWisps, puffs, cloudTopY } = await import('./_cloud.js');
  const { buildGiant } = await import('./_giant.js');
  const { rng } = await import('../../../engine/runtime/core/math.js');
  S.look(o.look === undefined || o.look === 'above' ? LOOK_ABOVE : o.look);
  const X = makeKit(S), r = rng('goc');
  const CY = 0, top = (x, z) => cloudTopY(x, z, { y: CY });
  // ---- the giant (hand + sleepers + ropes)
  const G = buildGiant(X, S, { pos: [0, 0, 0], cloudY: CY, sleepers: o.sleepers ?? 96, villageRopes: o.villageRopes ?? 110, mom: o.mom ?? 'kit', cloudHeight: top });
  X.flush();
  G.apply({}); // default pose -> real positions for the hole and the anchors
  const hole = [G.mom.wrist.x, G.mom.wrist.z];
  G.anchors.hole = hole;
  // ---- cloud top: rolling silver surface + the hole + seat mound + towers + mist
  const C = cloudLayer(S, { side: 'top', y: CY, amp: 26, R: 2600, segs: 320, center: [0, 150], color: '#cbd4e6', shade: '#4a5672', glow: 0.1, glowColor: '#6a7cb4', seed: 11, name: 'cloud_top' });
  C.setHole(0, { kind: 'round', pos: hole, size: [8.5, 8.5], open: 1, rim: 5 });
  const hy = top(...hole);
  { // dark well under the hole (inside of the cloud)
    const well = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 6, 40, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#070a16', side: THREE.BackSide }));
    well.position.set(hole[0], hy - 22, hole[1]); well.name = 'hole_well'; well.userData.noShadowFit = true; S.root.add(well);
  }
  const seat = [];
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = 70 + r() * 60; seat.push([Math.cos(a) * d * 1.1, 18 + r() * 26, -20 + Math.sin(a) * d * 0.8, 40 + r() * 30, 30 + r() * 22, 40 + r() * 28]); }
  for (let i = 0; i < 8; i++) seat.push([(r() - 0.5) * 120, 40 + r() * 10, -30 + (r() - 0.5) * 60, 50, 40, 50]);
  const towers = [];
  for (let i = 0; i < (o.towers ?? 70); i++) {
    const a = r() * Math.PI * 2, d = 700 + r() * 1900, x = Math.sin(a) * d, z = Math.cos(a) * d - 400, s = 60 + r() * 140;
    if (z > 300 && Math.abs(x) < 500) continue; // keep the camera side open
    for (let k = 0; k < 5; k++) towers.push([x + (r() - 0.5) * s * 1.6, top(x, z) + s * (0.2 + k * 0.32) + r() * s * 0.3, z + (r() - 0.5) * s, s * (0.8 - k * 0.1 + r() * 0.3), s * (0.6 + r() * 0.3), s * (0.8 + r() * 0.3)]);
  }
  const near = []; // cumulus clusters on the cloud floor (framing; never under the hand or in front of the face)
  for (let i = 0; i < 34; i++) {
    const x = (r() - 0.5) * 1100, z = -150 + r() * 650;
    if (Math.abs(x + 40) < 170 && z < 520) continue;
    if (z > 300 && x > 0) continue; // keep the camera side (front-right) open
    const s = 18 + r() * 34, n = 4 + Math.floor(r() * 4), y0 = top(x, z);
    for (let k = 0; k < n; k++) { const a = r() * 6.28, d = s * (0.3 + r() * 0.8), rr = s * (0.45 + r() * 0.5); near.push([x + Math.cos(a) * d, y0 + rr * (0.1 + r() * 0.5) + (k === 0 ? s * 0.35 : 0), z + Math.sin(a) * d * 0.7, rr * 1.15, rr * 0.85, rr]); }
  }
  const P1 = puffs(S, { list: [...seat, ...near], color: '#cdd6e8', shade: '#4c5874', glow: 0.1, glowColor: '#6a7cb4', baseY: 10, amp: 40, name: 'cloud_puffs', receiveShadow: true });
  const P2 = puffs(S, { list: towers, color: '#b9c4dc', shade: '#3e4a66', glow: 0.12, glowColor: '#6a7cb4', baseY: 120, amp: 220, name: 'cloud_towers' });
  if (o.mist !== false) {
    cloudWisps(S, { y: 9, size: 2400, center: [0, 200], alpha: 0.38, color: '#9fb0d6', seed: 3, scale: 0.012, name: 'mist_low' });
    cloudWisps(S, { y: 21, size: 2400, center: [0, 200], alpha: 0.22, color: '#b4c2e2', seed: 7, scale: 0.008, name: 'mist_high' });
  }
  if (o.moon !== false) { // big moon disc + soft halo, far behind the giant's right shoulder
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'), mr = rng('moon');
    const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256); grd.addColorStop(0, '#fffaf0'); grd.addColorStop(0.92, '#e8e4d8'); grd.addColorStop(1, '#d8d4c8');
    g.fillStyle = grd; g.beginPath(); g.arc(256, 256, 255, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) { const x = 70 + mr() * 372, y = 70 + mr() * 372, rr = 8 + mr() * 46; g.fillStyle = `rgba(150,150,160,${0.12 + mr() * 0.2})`; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const moon = new THREE.Mesh(new THREE.CircleGeometry(190, 64), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.6, 1.6, 1.7), fog: false, transparent: true }));
    moon.position.set(-520, 760, -2300); moon.lookAt(0, 200, 600); moon.name = 'moon'; moon.userData.noShadowFit = true; S.root.add(moon);
    const hc = document.createElement('canvas'); hc.width = hc.height = 256;
    const hg = hc.getContext('2d'), hr = hg.createRadialGradient(128, 128, 0, 128, 128, 128); hr.addColorStop(0, 'rgba(255,255,255,0.55)'); hr.addColorStop(0.35, 'rgba(200,215,255,0.22)'); hr.addColorStop(1, 'rgba(200,215,255,0)');
    hg.fillStyle = hr; hg.fillRect(0, 0, 256, 256);
    const ht = new THREE.CanvasTexture(hc); ht.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1300), new THREE.MeshBasicMaterial({ map: ht, color: '#a8bcff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.position.copy(moon.position).add(new THREE.Vector3(0, 0, 10)); halo.lookAt(0, 200, 600); halo.name = 'moon_halo'; halo.userData.noShadowFit = true; S.root.add(halo);
  }
  // ---- lights (<= 6 points): cold face key from below-front, amber eye glow, cold hand fill, hole glow, sleepers fill
  const L = {
    face: S.light({ type: 'spot', pos: [14, 196, 214], dir: [-0.12, 0.6, -0.8], angle: 70, color: '#cdd8ff', range: 120, brightness: 3.2 }), // horror under-light
    faceFill: S.light({ type: 'point', pos: [-40, 250, 220], color: '#8aa0e0', range: 110, brightness: 1.0 }),
    eyes: S.light({ type: 'point', pos: [0, 262, 150], color: '#ffb060', range: 46, brightness: 1.2 }),
    hand: S.light({ type: 'point', pos: [-30, 140, 330], color: '#c8d4ff', range: 110, brightness: 1.6 }),
    under: S.light({ type: 'point', pos: [-55, 40, 300], color: '#9fb4f0', range: 90, brightness: 1.3 }),
    hole: S.light({ type: 'point', pos: [hole[0] + 6, hy + 6, hole[1] + 6], color: '#c8d4ff', range: 40, brightness: 1.0 }),
  };
  S.shadowArea([-40, 120, 200], 200);
  // ---- anchors (computed from the default pose)
  const A = (n, p) => S.anchor(n, Array.isArray(p) ? p : p.toArray());
  const head = G.head, hv = (x, y, z) => head.group.userData.inner.localToWorld(new THREE.Vector3(x, y, z));
  const hp = head.group.userData.pivot; // neck pivot (world)
  const H = (x, y, z) => hv(hp[0] + x, hp[1] + y, hp[2] + 12 + z); // head local -> world (pivot is 12 behind the neck point)
  const headC = H(0, 60, 0), mouth = H(0, 22, 50), eyeL = H(27, 78, 43), eyeR = H(-27, 78, 43);
  A('giant_head', headC); A('giant_mouth', mouth); A('giant_eye_l', eyeL); A('giant_eye_r', eyeR); A('giant_hand', G.anchors.giant_hand);
  const mom = G.mom;
  A('spot_mom_ankle', mom.ankle); A('spot_mom_wrist', mom.wrist);
  A('spot_hole', [hole[0] + 2.5, hy + 1, hole[1] + 2]);
  A('spot_hand_top', G.anchors.giant_hand_top); A('spot_knuckle', G.anchors.giant_knuckles);
  A('cam_wide', [110, 34, 780]); A('cam_wide_at', [-36, 158, 110]);
  A('cam_face_below', [32, 26, 300]); A('cam_face_below_at', headC.clone().add(new THREE.Vector3(0, -6, 0)));
  A('cam_face', mouth.clone().add(new THREE.Vector3(18, 8, 165))); A('cam_face_at', headC.clone().add(new THREE.Vector3(0, -12, 20)));
  A('cam_grin', mouth.clone().add(new THREE.Vector3(10, -14, 92))); A('cam_grin_at', mouth.clone().add(new THREE.Vector3(0, 2, 0)));
  A('cam_eye', eyeR.clone().add(new THREE.Vector3(-14, -12, 62))); A('cam_eye_at', eyeR);
  const hc = new THREE.Vector3(...G.anchors.giant_hand);
  A('cam_hand', hc.clone().add(new THREE.Vector3(105, -6, 52))); A('cam_hand_at', hc.clone().add(new THREE.Vector3(0, -14, 28)));
  A('cam_hand_top', hc.clone().add(new THREE.Vector3(10, 22, 78))); A('cam_hand_top_at', hc.clone().add(new THREE.Vector3(10, 30, -60)));
  A('cam_sleepers', hc.clone().add(new THREE.Vector3(40, -70, 120))); A('cam_sleepers_at', hc.clone().add(new THREE.Vector3(0, -26, 20)));
  A('cam_mom', mom.wrist.clone().add(new THREE.Vector3(10, 3, 17))); A('cam_mom_at', mom.wrist.clone().add(new THREE.Vector3(0, 3.5, 0)));
  A('cam_arrive', [hole[0] + 16, hy + 7, hole[1] + 24]); A('cam_arrive_at', [hole[0], hy + 26, hole[1] - 4]);
  A('cam_fall', hc.clone().add(new THREE.Vector3(70, -20, 90))); A('cam_fall_at', [hc.x + 10, top(hc.x, hc.z + 30) + 10, hc.z + 30]);
  A('cam_hole_up', [hole[0] + 3.2, hy + 1.2, hole[1] + 3.2]); A('cam_hole_up_at', mom.wrist.clone().add(new THREE.Vector3(0, 6, 0)));
  // ---- per-frame: defaults every frame (no state leaks between shots), the shot's set() overrides
  X.onFrame((t) => G.apply({ t }));
  S.api = S.api ?? {};
  S.api.giant = {
    set(p = {}) { G.apply(p); return G; },
    get mom() { return G.mom; }, hole, cloudTop: top, lights: L, cloud: C, puffs: [P1, P2], rig: G,
  };
  return { anchors: S.anchors };
}
