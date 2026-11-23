// "The Ropes": the little brass bell Mom tied to Toby's slack rope. Lathe bell, mouth down, ring loop on top; the origin is
// the top of the loop (hang it from a rope point). Ring it by rotating the prop group about the rope with
// ringAngle(secondsSinceRing) from props/rope.js (mild swing that decays in ~2.5 s). Also used by heroRope({ bell }).
// Default placement: mouth on the ground; hang: true puts the origin at the loop top.
import { makeBell } from './rope.js';
export { ringAngle } from './rope.js';

export const meta = {
  id: 'brass_bell', tags: ['bell', 'brass', 'small', 'ring', 'charm', 'rope', 'ropes', 'jingle'],
  description: 'Small polished brass bell (lathe body, rib, clapper, hanging loop), mouth down, origin at the loop top; default 0.55 studs tall. Swing it with ringAngle(dt).',
  options: { size: 'bell height in studs (0.55)', hang: 'true = origin at the loop top (hang it from a point); default false = mouth resting on the ground' },
};

export default function brassBell(S, o = {}) {
  const g = S.group(null, { pivot: [0, 0, 0] });
  const b = makeBell(S.THREE, o.size ?? 0.55);
  if (!o.hang) b.position.y = (o.size ?? 0.55) * 1.0 + 0.02;
  g.add(b);
}
