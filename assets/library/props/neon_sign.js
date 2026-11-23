// Big neon board ("NOW SERVING 7") hanging on wires from a cluster of white sphere-clouds; origin = board centre.
export const meta = {
  id: 'neon_sign', tags: ['sign', 'neon', 'board', 'queue', 'now serving', 'text', 'glow', 'clouds', 'sky'],
  description: 'Navy neon-bordered board (26 x 10) with glowing gold text, hanging on wires from a puffy white cloud cluster - a sign in the sky.',
  options: { lines: "text lines (['NOW SERVING', '7'])", size: 'board [w, h] ([26, 10])', bg: 'board colour', textColor: 'text colour', border: 'neon border colour',
    glow: 'text glow (4)', clouds: 'false = no cloud cluster / rods', hang: 'wire length (true = 18)' },
};

export default function neonSign(S, o = {}) {
  S.sign({ pos: [0, 0, 0], size: o.size ?? [26, 10], lines: o.lines ?? ['NOW SERVING', '7'], bg: o.bg ?? '#1b2238', textColor: o.textColor ?? '#f5d46a', border: o.border ?? '#fff4d6', glow: o.glow ?? 4, hang: o.hang ?? true });
  if (o.clouds === false) return;
  for (const [x, y, z, r] of [[0, 18, 0, 7], [-7, 16, 2, 5.5], [7.5, 16.5, -1, 6], [-3, 21, -2, 5], [4, 20.5, 3, 4.5], [-11, 14, 0, 3.6], [11, 14.5, 1, 4]]) {
    const m = S.part({ shape: 'ball', size: [r * 2, r * 2, r * 2], pos: [x, y, z], material: 'SmoothPlastic', color: '#ffffff' });
    m.material = m.material.clone(); m.material.emissive.set('#d7e1ee'); m.material.emissiveIntensity = 0.85; // lift the sky-fill-only side to white
  }
  for (const x of [-8, 8]) S.part({ shape: 'cylinder', size: [0.4, 12, 0.4], pos: [x, 9, 0], rot: [0, 0, 90], material: 'Metal', color: '#2a2a2e' });
}
