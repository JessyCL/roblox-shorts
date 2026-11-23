// Wooden hay cart on four wheels, handles toward +Z, wheels on local y = 0.
export const meta = {
  id: 'hay_cart', tags: ['cart', 'hay', 'wagon', 'farm', 'medieval', 'village', 'wheels'],
  description: 'Four-wheeled wooden farm cart heaped with hay (or empty), pull handles toward +Z. About 6 x 12 studs.',
  options: { hay: 'false = empty cart' },
};

export default function hayCart(S, o = {}) {
  const P = (p) => S.part(p);
  P({ size: [5, 0.6, 7.5], pos: [0, 2.2, 0], material: 'WoodPlanks', color: '#8a5a32' });
  for (const s of [-1, 1]) P({ size: [0.4, 1.4, 7.5], pos: [s * 2.4, 3.1, 0], material: 'WoodPlanks', color: '#7a4a28' });
  P({ size: [5, 1.4, 0.4], pos: [0, 3.1, -3.6], material: 'WoodPlanks', color: '#7a4a28' });
  for (const s of [-1, 1]) for (const zz of [-2.2, 2.2]) {
    P({ shape: 'cylinder', size: [0.5, 3, 3], pos: [s * 2.8, 1.5, zz], material: 'Wood', color: '#5a3a1e' });
    P({ shape: 'cylinder', size: [0.6, 0.9, 0.9], pos: [s * 2.85, 1.5, zz], material: 'Metal', color: '#3a3a3a' });
  }
  for (const s of [-1, 1]) P({ size: [0.35, 0.35, 5], pos: [s * 1.4, 2.3, 6], material: 'Wood', color: '#6a4422' });
  if (o.hay !== false) {
    P({ size: [4.4, 1.6, 6.8], pos: [0, 3.2, 0], material: 'Sand', color: '#e2c25a' });
    P({ shape: 'ball', size: [4, 4, 4], pos: [0, 3.6, 0.4], material: 'Sand', color: '#e8cc66' });
    P({ shape: 'ball', size: [3.2, 3.2, 3.2], pos: [0.3, 3.6, -2], material: 'Sand', color: '#dcbc52' });
  }
}
