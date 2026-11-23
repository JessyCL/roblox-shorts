// Character attachments: small props parented to a character's anchors (hands, head, legs), toggled per shot with
// the actor's `hide: [key]` / `show`. From "Everyone Has ONE Hand".
//   Cast spec:  { preset: 'pip', attach: ['cookie'] }   or   attach: [{ type: 'held_bell', key: 'bell' }]
//   Or in a shot's prepare hook:  attach(THREE, await getActor('pip'), 'cookie')
// Each builder: (THREE, character, opts) -> Object3D (already added to the anchor). Registered as accessories[key ?? type].
export const meta = {
  cookie: { tags: ['cookie', 'food', 'held', 'snack'], description: 'Chocolate-chip cookie held in the right hand (pair with the eat clip).' },
  jar: { tags: ['jar', 'jam', 'held', 'glass'], description: 'Glass jam jar with a gold lid held in the right hand (the jar nobody can open).' },
  needle: { tags: ['needle', 'sewing', 'held', 'craft'], description: 'Sewing needle in the right hand (pair with the sew clip).' },
  knitting: { tags: ['knitting', 'yarn', 'needle', 'held', 'grandma'], description: 'Knitting needle + pink yarn ball in the right hand (pair with the knit clip).' },
  held_bell: { tags: ['bell', 'held', 'carry', 'stolen'], description: 'Bronze bell carried mouth-down in the left hand (layer hold_l).' },
  held_boot: { tags: ['boot', 'held', 'shoe'], description: 'A boot held up in the right hand (hold_up clip).' },
  boot_on_leg: { tags: ['boot', 'shoe', 'leg', 'one boot'], description: 'One leather boot on the right leg (a character who lost the other one).' },
  sewn_sleeve: { tags: ['sleeve', 'stitches', 'hidden hand', 'sewn'], description: 'Sewn-shut sleeve cap with black cross stitches over the left hand (hide the hand: hide: [hand_l_mesh]).' },
  glow_eyes: { tags: ['eyes', 'glow', 'red', 'monster', 'night', 'scary'], description: 'Two glowing red HDR eyes on the face (bloom at night; name fx:eye).' },
};

const mat = (THREE, c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const box = (THREE, s, c, p = [0, 0, 0]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), mat(THREE, c)); m.position.set(...p); m.castShadow = true; return m; };
const bellMesh = (THREE, k) => {
  const g = new THREE.Group(), m = mat(THREE, '#c9952e', { metalness: 0.6, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * k, 1.5 * k, 2.4 * k, 20), m); body.position.y = -1.2 * k; g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.1 * k, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); g.add(top);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.75 * k, 1.75 * k, 0.3 * k, 20), m); lip.position.y = -2.4 * k; g.add(lip);
  for (const o of g.children) o.castShadow = true;
  return g;
};
const stick = (THREE) => { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), mat(THREE, '#d8d8e0', { metalness: 0.8, roughness: 0.3 })); n.rotation.x = Math.PI / 2.4; n.position.set(0, -0.5, 0.5); return n; };

export const ATTACHMENTS = {
  sewn_sleeve: (THREE, c) => { // red cap with black cross stitches at the end of the left sleeve
    const g = new THREE.Group(), w = c.d.arm[0] * 1.0;
    g.add(box(THREE, [w, 0.16, w], '#b81e20', [0, -0.08, 0]));
    for (const a of [0.7, -0.7]) { const s = box(THREE, [w * 1.15, 0.05, 0.07], '#111111', [0, -0.17, 0]); s.rotation.y = a; g.add(s); }
    for (const z of [-0.25, 0, 0.25]) g.add(box(THREE, [w * 1.02, 0.06, 0.05], '#111111', [0, -0.05, z]));
    c.anchors.hand_l.add(g); return g;
  },
  cookie: (THREE, c) => {
    const g = new THREE.Group(), ck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 20), mat(THREE, '#c9873e'));
    ck.rotation.x = Math.PI / 2; g.add(ck);
    for (const [x, y] of [[0.15, 0.1], [-0.18, 0.05], [0.02, -0.2], [-0.05, 0.22]]) g.add(box(THREE, [0.1, 0.1, 0.18], '#4a2a14', [x, y, 0]));
    g.position.set(0, -0.55, 0.35); c.anchors.hand_r.add(g); return g;
  },
  boot_on_leg: (THREE, c) => {
    const g = new THREE.Group(), d = c.d;
    g.add(box(THREE, [d.leg[0] * 1.08, 0.9, d.leg[2] * 1.08], '#5a3418', [0, -d.leg[1] + 0.45, 0]));
    g.add(box(THREE, [d.leg[0] * 1.08, 0.4, d.leg[2] * 1.5], '#4a2a12', [0, -d.leg[1] + 0.2, 0.25]));
    c.parts.rLeg.add(g); return g;
  },
  needle: (THREE, c) => { const g = new THREE.Group(); g.add(stick(THREE)); c.anchors.hand_r.add(g); return g; },
  knitting: (THREE, c) => {
    const g = new THREE.Group(); g.add(stick(THREE));
    const y = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(THREE, '#e04a6a', { roughness: 0.9 })); y.position.set(0.3, -0.7, 0.6); g.add(y);
    c.anchors.hand_r.add(g); return g;
  },
  glow_eyes: (THREE, c, o = {}) => { // unlit HDR boxes so they bloom
    const g = new THREE.Group(), r = c.d.head.r, m = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.color ?? '#ff2a1a').multiplyScalar(4), toneMapped: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.06), m); e.name = 'fx:eye'; e.position.set(s * r * 0.36, 0.08, r + 0.01); g.add(e); }
    c.anchors.head.add(g); return g;
  },
  held_bell: (THREE, c, o = {}) => { const b = bellMesh(THREE, o.size ?? 0.55); b.position.set(0, -0.4, -0.2); b.rotation.x = Math.PI / 2; /* mouth-down while the arm holds it forward */ c.anchors.hand_l.add(b); return b; },
  jar: (THREE, c) => {
    const g = new THREE.Group(), j = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 16), mat(THREE, '#a8d8e8', { roughness: 0.15, transparent: true, opacity: 0.75 }));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 16), mat(THREE, '#c9a03a', { metalness: 0.6 })); lid.position.y = 0.58;
    const jam = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.7, 16), mat(THREE, '#b8202a')); jam.position.y = -0.1;
    g.add(j, lid, jam); g.position.set(0, -0.75, 0.25); c.anchors.hand_r.add(g); return g;
  },
  held_boot: (THREE, c) => {
    const g = new THREE.Group();
    g.add(box(THREE, [0.7, 1.2, 0.7], '#6a4020', [0, -0.9, 0])); g.add(box(THREE, [0.7, 0.45, 1.3], '#6a4020', [0, -1.35, 0.3]));
    c.anchors.hand_r.add(g); return g;
  },
};

// attach(THREE, character, 'cookie' | { type: 'cookie', key: 'snack', ...opts }) -> Object3D; character.accessories[key] = it
export function attach(THREE, c, item) {
  const it = typeof item === 'string' ? { type: item } : item, fn = ATTACHMENTS[it.type];
  if (!fn) throw new Error(`attachments: unknown attachment "${it.type}" (known: ${Object.keys(ATTACHMENTS).join(', ')})`);
  const o = fn(THREE, c, it);
  c.accessories[it.key ?? it.type] = o;
  return o;
}
