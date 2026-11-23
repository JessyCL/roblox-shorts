// Nursery close-up stage: magenta fabric floor, cream blanket, optional queue ticket lying next to the baby.
// From proto_ticket (shot 1: top-down push onto the newborn's ticket number).
export const meta = {
  id: 'nursery', tags: ['nursery', 'baby', 'newborn', 'blanket', 'interior', 'birth', 'ticket', 'closeup'],
  description: 'Tight top-down stage for a newborn: magenta fabric floor, cream blanket (9 x 7) and a numbered paper ticket. Lay the newborn preset at spot_baby with the lie clip.',
  options: { look: "lighting look ('interior'; null = keep the set's)", floor: 'floor colour', blanket: 'blanket colour', ticket: 'false = no ticket', number: "ticket number ('48,213')" },
  anchors: { ticket: 'ticket centre', spot_baby: 'where the baby lies (y 0.6, yaw 180)', cam_top: 'top-down camera', cam_side: 'low side camera' },
};

export default async function nursery(S, o = {}) {
  const out = {}, A = (n, p) => (out[n] = S.anchor(n, p));
  if (o.look !== null) S.look(o.look ?? 'interior');
  S.ground({ material: 'Fabric', color: o.floor ?? '#c2307a' });
  S.part({ size: [9, 0.4, 7], pos: [0, 0.2, 0], material: 'Fabric', color: o.blanket ?? '#f4ead7' }); // cream blanket
  if (o.ticket !== false) {
    await S.prop('ticket', { pos: [0.0, 1.45, 1.7], twist: 12, number: o.number });
    A('ticket', [0.0, 1.45, 1.7]);
  }
  A('spot_baby', [0, 0.6, 0]);
  A('cam_top', [0, 9.5, 3.5]); A('cam_top_at', [0, 1, 0.6]);
  A('cam_side', [6, 2.4, 6]); A('cam_side_at', [0, 1.2, 0.3]);
  return { anchors: out };
}
