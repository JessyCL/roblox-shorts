// Paper queue ticket ("No. 48,213"); lies flat by default (readable from above).
export const meta = {
  id: 'ticket', tags: ['ticket', 'number', 'queue', 'paper', 'card', 'text'],
  description: 'Cream paper ticket card (2 x 1.25) with a red "No." label and a big black number; flat on the ground or upright.',
  options: { number: "the number text ('48,213')", label: "small label ('No.')", flat: 'false = stand upright facing +Z', twist: 'in-plane rotation in degrees when flat', size: 'card size [w, h]' },
};

export default function ticket(S, o = {}) {
  S.text({ lines: [{ text: o.label ?? 'No.', color: '#c4281c', font: 'serif' }, { text: o.number ?? '48,213', size: 1.6, color: '#111' }],
    pos: [0, 0, 0], rot: o.flat === false ? [0, 0, 0] : [-90, 0, o.twist ?? 0], size: o.size ?? [2.0, 1.25], bg: '#fbf6e8', stroke: null,
    border: { color: '#c4281c', width: 0.06 } });
}
