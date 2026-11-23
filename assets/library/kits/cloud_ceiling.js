// The flat gray cloud ceiling of "The Ropes", seen from below: a thick, lumpy (mammatus) underside ~100 studs up that
// covers the sky to the horizon, soft mist sheets hanging under it, a faint night glow. Inside it, above the village, the
// GIANT's face looks down (the same head as giant_on_cloud): an almond EYE can open in the cloud ("the cloud opened its
// eye"), a big hole can reveal the whole face (cold-open scare from below), and a round dark GAP opens where people are
// pulled up. Animate every frame from shot.update (full state; missing = closed):
//   S.api.cloud.set({ eye: 0..1, face: 0..1, gap: 0..1, glow | look: 'dusk'|'midnight'|'dawn' (glow preset), eyes: [x, y] | lookAt: [x,y,z], grin, jaw, click, t })
// Used by rope_village and bell_tower_room (ground: false); standalone it adds a plain meadow + the 'midnight' look.

export const meta = {
  id: 'cloud_ceiling', tags: ['cloud', 'ceiling', 'sky', 'overcast', 'eye', 'giant', 'face', 'gap', 'hole', 'horror', 'night', 'ropes'],
  description: "Flat gray cloud ceiling seen from below (thick lumpy underside, mist, faint night glow) with the giant's face hidden inside: an almond eye that opens in the cloud, a big hole that reveals the whole grinning face, and a dark round gap where people are pulled up.",
  options: { y: 'underside height (100)', amp: 'lump depth (15)', center: 'cloud centre [x, z] ([0, 0], detail is densest here)', eye: 'eye-hole centre [x, z] ([30, -50]; the head spans x eye-93..eye+39, z eye-94..eye+48)',
    gap: 'gap centre [x, z] ([0, 16]; keep it outside the head footprint)', face: 'false = no giant head inside', glow: 'night glow 0..0.4 (0.18)', ground: 'false = no ground/look (inside another kit)', look: "standalone look ('midnight')" },
  anchors: { cloud_eye: 'centre of the eye opening (underside)', cloud_face: 'centre of the face opening', cloud_gap: 'centre of the gap (underside)', cam_wide: 'from the ground looking up at the eye and the gap',
    cam_eye_up: 'straight up at the eye opening', cam_face_up: 'low angle up at the face hole', cam_gap_up: 'up into the gap' },
};

export default async function cloudCeiling(S, o = {}) {
  const THREE = S.THREE;
  const { makeKit } = await import('./_matkit.js');
  const { cloudLayer, cloudWisps, cloudUnderY } = await import('./_cloud.js');
  const { buildHead } = await import('./_giant.js');
  const Y0 = o.y ?? 100, amp = o.amp ?? 15, [cx, cz] = o.center ?? [0, 0];
  const under = (x, z) => cloudUnderY(x, z, { y: Y0, amp });
  if (o.ground !== false) {
    const { RV_LOOKS } = await import('./rope_village.js');
    S.look(RV_LOOKS[o.look ?? 'midnight'] ?? o.look);
    S.ground({ material: 'Grass', color: '#4f7a3a', size: 1200 });
  }
  const C = cloudLayer(S, { side: 'under', y: Y0, amp, R: o.R ?? 1500, segs: 300, center: [cx, cz], color: o.color ?? '#aeb2ba', shade: o.shade ?? '#3c414c', glow: 0, seed: 7, fogK: o.fogK ?? 0.22, name: 'cloud_under' });
  const mistA = cloudWisps(S, { y: Y0 - amp - 1.5, size: 2600, center: [cx, cz], alpha: 0.12, color: '#8e939c', seed: 2, scale: 0.009, name: 'cloud_mist_a' });
  const mistB = cloudWisps(S, { y: Y0 - amp * 0.45, size: 2600, center: [cx, cz], alpha: 0.16, color: '#9da2ab', seed: 5, scale: 0.016, name: 'cloud_mist_b' });
  // ---- the head inside the cloud, face down; top of the head toward +Z (reads upright from the ground south of it, looking up/north)
  const eyeXZ = o.eye ?? [30, -50], gapXZ = o.gap ?? [0, 16];
  const X = makeKit(S);
  let head = null, faceXZ = null, faceLight = null;
  if (o.face !== false) {
    // head-local -> world: (x, y, z) -> Pv + (x, -(z + 12), y). Left eye (local +27, 78, 43) sits above eyeXZ.
    // Footprint: x in [eye.x - 93, eye.x + 39], z in [eye.z - 94, eye.z + 48] - keep the gap outside it.
    const Pv = [eyeXZ[0] - 27, Y0 + 82, eyeXZ[1] - 78];
    const wrap = X.group('ceiling_face', { pivot: Pv }, () => { head = buildHead(X, S, { pos: [Pv[0], Pv[1], Pv[2] + 12], prefix: 'ceil', brow: 'flat' }); });
    wrap.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)));
    faceXZ = [Pv[0], Pv[2] + 55];
    // dark inside of the cloud round the head (seen through the holes)
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(420, 420).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#141824', fog: true }));
    inner.position.set(faceXZ[0], Y0 + 46, faceXZ[1]); inner.name = 'cloud_inside'; inner.userData.noShadowFit = true; S.root.add(inner);
    // always-on light INSIDE the cloud, between the underside and the face: it lights the face/eye through the holes but not the
    // visible underside (that faces away from it). Pooled lights are copied before shot.update, so never toggle it per shot.
    faceLight = S.light({ type: 'point', pos: [faceXZ[0] + 4, Y0 + 5, faceXZ[1] - 6], color: '#ffc890', range: 80, brightness: 6 });
    S.light({ type: 'point', pos: [eyeXZ[0], Y0 + 6, eyeXZ[1] + 4], color: '#ffd0a0', range: 34, brightness: 2.2 });
  }
  X.flush();
  // gap: a dark well above the round hole
  const well = new THREE.Mesh(new THREE.CylinderGeometry(7, 13, 60, 28, 1, true), new THREE.MeshBasicMaterial({ color: '#05070d', side: THREE.BackSide, fog: false }));
  well.position.set(gapXZ[0], Y0 + 22, gapXZ[1]); well.name = 'gap_well'; well.userData.noShadowFit = true; S.root.add(well);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(8, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#020306', fog: false }));
  cap.position.set(gapXZ[0], Y0 + 50, gapXZ[1]); S.root.add(cap);
  // ---- anchors
  const A = (n, p) => S.anchor(n, p);
  A('cloud_eye', [eyeXZ[0], under(...eyeXZ), eyeXZ[1]]); A('cloud_gap', [gapXZ[0], under(...gapXZ), gapXZ[1]]);
  if (faceXZ) A('cloud_face', [faceXZ[0], under(...faceXZ), faceXZ[1]]);
  A('cam_wide', [gapXZ[0] + 18, 4, gapXZ[1] + 60]); A('cam_wide_at', [eyeXZ[0], Y0 - 10, (eyeXZ[1] + gapXZ[1]) / 2]);
  A('cam_eye_up', [eyeXZ[0] + 4, Y0 - 62, eyeXZ[1] + 30]); A('cam_eye_up_at', [eyeXZ[0], Y0, eyeXZ[1] - 2]);
  if (faceXZ) { A('cam_face_up', [faceXZ[0] + 10, 3, faceXZ[1] + 95]); A('cam_face_up_at', [faceXZ[0], Y0 + 10, faceXZ[1] - 10]); }
  A('cam_gap_up', [gapXZ[0] + 3, 6, gapXZ[1] + 14]); A('cam_gap_up_at', [gapXZ[0], Y0, gapXZ[1] - 2]);
  // ---- per-frame state (defaults every frame, the shot's set() overrides)
  const glow0 = o.glow ?? 0.18;
  const apply = (p = {}) => {
    const eye = Math.max(0, Math.min(1, p.eye ?? 0)), face = Math.max(0, Math.min(1, p.face ?? 0)), gap = Math.max(0, Math.min(1, p.gap ?? 0));
    C.setHole(0, { kind: 'eye', pos: eyeXZ, size: [17, 10.5], open: face > 0 ? 0 : eye, rim: 7 });
    C.setHole(1, faceXZ ? { kind: 'round', pos: faceXZ, size: [62, 80], open: face, rim: 14 } : {});
    C.setHole(2, { kind: 'round', pos: gapXZ, size: [9, 9], open: gap, rim: 8 });
    C.setGlow(p.glow ?? { dusk: 0.03, midnight: 0.2, dawn: 0.05 }[p.look] ?? glow0);
    well.visible = cap.visible = gap > 0.01;
    if (head) {
      head.setPose({ eyeL: face > 0 ? p.eyeL ?? 1 : eye, eyeR: face > 0 ? p.eyeR ?? 1 : 0, look: p.eyes, lookAt: p.lookAt, grin: p.grin ?? (face > 0 ? 0.5 : 0), jaw: p.jaw, click: p.click, breath: 0, head: [0, 0] }, p.t ?? 0);
      head.group.parent.parent.visible = eye > 0 || face > 0; // the wrap group
      mistA.visible = mistB.visible = face < 0.5; // the face reads clean once it is out
    }
  };
  X.onFrame((t) => apply({ t }));
  apply({});
  S.api = S.api ?? {};
  S.api.cloud = { set: (p) => apply(p), under, layer: C, y: Y0, eye: eyeXZ, gap: gapXZ, face: faceXZ, head };
  return { anchors: S.anchors };
}
