// Brick plaza with a hanging NOW SERVING neon sign above an endless serpentine queue (from proto_ticket).
// Square ~92 wide between brick/concrete blocks; the queue snakes across z 30 .. -42.
export const meta = {
  id: 'brick_plaza', tags: ['plaza', 'square', 'city', 'queue', 'line', 'crowd', 'sign', 'neon', 'brick', 'day', 'waiting'],
  description: 'Big brick town square framed by brick/concrete blocks, a giant NOW SERVING neon sign hanging from sky-clouds, and a 360-person serpentine queue (instanced crowd).',
  options: { look: "lighting look ('day')", sign: "sign lines (['NOW SERVING', '7']); false = no sign", queue: 'false = no queue', count: 'queue size (360)', rows: 'queue rows (9)',
    clip: "queue clip ('idle')" },
  anchors: { sign: 'sign centre', spot_front: 'front of the queue', spot_back: 'end of the queue', cam_aerial: 'high aerial over the queue', cam_sign: 'low angle up at the sign',
    cam_queue: 'eye level at the queue front' },
};

export default async function brickPlaza(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.look !== null) S.look(o.look ?? 'day');
  S.ground({ material: 'Brick', color: '#e3937c', size: 600 });
  // Buildings framing the square (brick + concrete blocks with window grids).
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      const h = 28 + ((i * 7 + (side > 0 ? 3 : 0)) % 4) * 6;
      S.building({ pos: [side * 46, -70 + i * 26], yaw: side > 0 ? -90 : 90, size: [24, h, 22], material: i % 2 ? 'Brick' : 'Concrete',
        color: i % 2 ? '#a5432f' : '#cdbfa8', roof: 'flat' });
    }
  }
  for (let i = 0; i < 5; i++) S.building({ pos: [-52 + i * 26, -95], size: [24, 34 + (i % 3) * 8, 20], material: i % 2 ? 'Concrete' : 'Brick', color: i % 2 ? '#d8cbb3' : '#b24a35', roof: 'flat' });
  if (o.sign !== false) { // hangs from a cluster of white sphere-clouds above the square
    await S.prop('neon_sign', { pos: [0, 40, -40], lines: o.sign ?? ['NOW SERVING', '7'] });
    A('sign', [0, 40, -40]);
  }
  S.clouds({ style: 'soft', count: 6, height: [140, 220] });
  const rows = o.rows ?? 9, path = []; // serpentine queue: rows back and forth
  for (let r = 0; r < rows; r++) {
    const z = 30 - r * 9, xs = r % 2 ? [28, -28] : [-28, 28];
    path.push([xs[0], 0, z], [xs[1], 0, z]);
  }
  if (o.queue !== false) {
    const { crowd } = await import('/engine/runtime/characters/index.js');
    const q = crowd({ count: o.count ?? 360, path, width: 0.9, clip: o.clip ?? 'idle', seed: 7, yawJitter: 20 });
    S.root.add(q.root);
    q.update(0);
  }
  A('spot_front', path[0]); A('spot_back', path[path.length - 1]);
  A('cam_aerial', [27, 56, 39]); A('cam_aerial_at', [-6, 0, -14]);
  A('cam_sign', [22, 9, 78]); A('cam_sign_at', [0, 24, -40]);
  A('cam_queue', [0, 4.6, 53]); A('cam_queue_at', [0, 3, 35]);
  return { anchors: out };
}
