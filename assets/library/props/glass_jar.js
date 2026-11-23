// Empty clear glass jar on y = 0 (a giant's bug jar): glass body, thicker rim, glass base; lid: true adds a gold screw
// lid. Default 40 tall x 30 wide (a giant kid's jar holding tiny people). From "The TINY War".
export const meta = {
  id: 'glass_jar', tags: ['jar', 'glass', 'empty', 'bug jar', 'container', 'giant', 'trap', 'tiny war'],
  description: 'Empty clear glass jar (40 tall, 30 wide by default) with a rim and base; lid: true puts a gold lid on. Animate it as a group (name).',
  options: { h: 'height (40)', d: 'diameter (30)', lid: 'true = gold lid on top' },
};
export default function glassJar(S, o = {}) {
  const h = o.h ?? 40, d = o.d ?? 30;
  S.part({ shape: 'cylinder', size: [h, d, d], pos: [0, h / 2, 0], rot: [0, 0, 90], material: 'Glass', color: '#cfeaf6', transparency: 0.62, reflectance: 0.15, castShadow: false });
  S.part({ shape: 'cylinder', size: [h * 0.075, d * 1.05, d * 1.05], pos: [0, h - h * 0.04, 0], rot: [0, 0, 90], material: 'Glass', color: '#e8f6fc', transparency: 0.35, castShadow: false });
  S.part({ shape: 'cylinder', size: [h * 0.025, d, d], pos: [0, h * 0.0125, 0], rot: [0, 0, 90], material: 'Glass', color: '#c8e4f0', transparency: 0.5 });
  if (o.lid) S.part({ shape: 'cylinder', size: [h * 0.125, d * 1.07, d * 1.07], pos: [0, h + h * 0.06, 0], rot: [0, 0, 90], material: 'Metal', color: '#c9a03a' });
}
