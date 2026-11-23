// Small wooden sailboat (bow toward +Z); origin = centre of the hull (keel 0.6 below).
export const meta = {
  id: 'boat', tags: ['boat', 'sailboat', 'ship', 'wood', 'water', 'sea', 'reward'],
  description: 'Little wooden sailboat (3.2 x 9.4 studs, mast 6) with a cream sail, bow toward +Z.',
  options: { hull: 'hull colour (#8a5a32)', sail: 'sail colour (#f4f1e8)' },
};

export default function boat(S, o = {}) {
  const hull = o.hull ?? '#8a5a32';
  S.part({ size: [3.2, 1.2, 7], pos: [0, 0, 0], material: 'WoodPlanks', color: hull });
  S.part({ shape: 'wedge', size: [3.2, 1.2, 2.4], pos: [0, 0, 4.7], material: 'WoodPlanks', color: hull });
  S.part({ shape: 'cylinder', size: [0.3, 6, 0.3], pos: [0, 3.5, -0.5], rot: [0, 0, 90], material: 'Wood', color: '#6b4a2e' });
  S.part({ shape: 'wedge', size: [0.1, 4, 3], pos: [0, 3.5, 0.9], material: 'Fabric', color: o.sail ?? '#f4f1e8' });
}
