// Giant's medieval cottage at tiny-people scale (from "The TINY War", Bo's house): 500 x 700 footprint west of its
// east (front) wall at x = pos[0], z centred on pos[1]; floor at y 20. Timber-framed plaster walls on a stone base,
// clay-tile roof (group, hide it for interior shots), chimney. Front: a hinged blue door (group) at z 0 with a
// 20-stud stone doorstep, the bedroom window (z -230, y 70..190) and a back kitchen door (z 235) with a 10-stud gap
// under it plus a step and ramp. Inside: bedroom (z -350..-40: bed, desk under the window, shelf on the back wall)
// and kitchen (z 140..350: tiled floor, counter, hearth). Giants are the 25x rigs (Bo ~90 tall).
export const meta = {
  id: 'giant_cottage', tags: ['giant', 'house', 'cottage', 'medieval', 'interior', 'bedroom', 'kitchen', 'doorstep', 'tiny war', 'huge'],
  description: "Giant's medieval cottage built at tiny-people scale (door 100 x 170, doorstep 20 high): timber-framed plaster on a stone base, tile roof (hideable group), bedroom with bed, desk under the window and a wall shelf, kitchen with tiled floor and hearth, back door with a gap underneath.",
  options: { pos: 'front wall position [x, z] ([-500, 0])', name: 'group prefix (cottage)' },
  anchors: { backWindow: 'bedroom back window (north wall)', step: 'doorstep top', doorway: 'front door centre', desk: 'desk top under the window', shelf: 'shelf top', kitchen: 'kitchen floor', kitchenDoor: 'gap under the back door' },
};
const B = (S, p) => S.part({ batch: true, ...p });

export default function giantCottage(S, o = {}) {
  const [WX, Z] = o.pos ?? [-500, 0], n = o.name ?? 'cottage', T = 10;
  const P = (x, y, z) => [x, y, z + Z], PLASTER = '#e8dcc0', BEAM = '#4a3020', IN = '#e2d6bc';
  const wallZ = (z0, z1, y0, y1) => { B(S, { size: [T, y1 - y0, z1 - z0], pos: P(WX - T / 2, (y0 + y1) / 2, (z0 + z1) / 2), material: y1 <= 30 ? 'Cobblestone' : 'Concrete', color: y1 <= 30 ? '#8a847a' : PLASTER }); };
  // front wall with openings
  wallZ(-350, -290, 0, 320); wallZ(-170, -50, 0, 320); wallZ(50, 190, 0, 320); wallZ(280, 350, 0, 320);
  wallZ(-290, -170, 0, 70); wallZ(-290, -170, 190, 320); wallZ(-50, 50, 0, 20); wallZ(-50, 50, 190, 320); wallZ(190, 280, 0, 20); wallZ(190, 280, 182, 320);
  // stone base band + timber frame on the front
  const solid = [[-350, -50], [50, 190], [280, 350]]; // front-wall spans without door openings
  for (const [z0, z1] of solid) { B(S, { size: [T + 2, 30, z1 - z0], pos: P(WX - T / 2, 15, (z0 + z1) / 2), material: 'Cobblestone', color: '#8a847a' }); B(S, { size: [3, 10, z1 - z0], pos: P(WX + 1.5, 30, (z0 + z1) / 2), material: 'Wood', color: BEAM }); }
  for (const z of [-350, -290, -170, -56, 56, 184, 286, 350]) B(S, { size: [3, 290, 12], pos: P(WX + 1.5, 175, z), material: 'Wood', color: BEAM });
  for (const y of [200, 316]) B(S, { size: [3, 10, 700], pos: P(WX + 1.5, y, 0), material: 'Wood', color: BEAM });
  for (const [z0, z1] of [[-350, -290], [50, 190]]) { const zm = (z0 + z1) / 2, L = Math.hypot(z1 - z0, 170); B(S, { size: [3, L, 8], pos: P(WX + 1.6, 115, zm), rot: [Math.atan2(z1 - z0, 170) * 180 / Math.PI, 0, 0], material: 'Wood', color: BEAM }); }
  // other walls, floor, interior partition walls (plaster + beams)
  // back (north) wall with the second bedroom window (x WX-120..WX-40, y 90..190, looking north toward the volcano)
  const northX = (x0, x1, y0, y1, z, t, mat, col) => B(S, { size: [x1 - x0, y1 - y0, t], pos: P(WX + (x0 + x1) / 2, (y0 + y1) / 2, z), material: mat, color: col });
  northX(-500, -120, 0, 320, -355, T, 'Concrete', PLASTER); northX(-40, 0, 0, 320, -355, T, 'Concrete', PLASTER); northX(-120, -40, 0, 90, -355, T, 'Concrete', PLASTER); northX(-120, -40, 190, 320, -355, T, 'Concrete', PLASTER);
  B(S, { size: [500, 320, T], pos: P(-250 + WX, 160, 355), material: 'Concrete', color: PLASTER });
  for (const [x, w] of [[-120, 7], [-40, 7]]) B(S, { size: [w, 108, 16], pos: P(WX + x, 140, -352), material: 'Wood', color: '#6a4428' });
  for (const y of [90, 190]) B(S, { size: [88, 7, 16], pos: P(WX - 80, y, -352), material: 'Wood', color: '#6a4428' });
  B(S, { size: [80, 100, 2], pos: P(WX - 80, 140, -357), material: 'Glass', color: '#cfe8f8', transparency: 0.88, castShadow: false });
  S.anchor('backWindow', P(WX - 80, 140, -352));
  B(S, { size: [T, 320, 720], pos: P(WX - 505, 160, 0), material: 'Concrete', color: PLASTER });
  for (const s of [-1, 1]) for (const x of [-480, -320, -160]) B(S, { size: [12, 290, 3], pos: P(WX + x + 230, 175, s * 361.5), material: 'Wood', color: BEAM });
  B(S, { size: [500, 20, 700], pos: P(-250 + WX, 10, 0), material: 'WoodPlanks', color: '#a8784a' });
  for (const z of [-40, 140]) B(S, { size: [500, 300, 8], pos: P(-250 + WX, 170, z), material: 'Concrete', color: IN });
  B(S, { size: [4, 300, 300], pos: P(WX - 498, 170, -195), material: 'Concrete', color: IN }); northX(-500, -120, 20, 320, -348, 4, 'Concrete', IN); northX(-40, 0, 20, 320, -348, 4, 'Concrete', IN); northX(-120, -40, 20, 90, -348, 4, 'Concrete', IN); northX(-120, -40, 190, 320, -348, 4, 'Concrete', IN);
  B(S, { size: [4, 300, 205], pos: P(WX - 498, 170, 245), material: 'Concrete', color: IN }); B(S, { size: [500, 300, 4], pos: P(-250 + WX, 170, 348), material: 'Concrete', color: IN });
  for (const x of [-450, -300, -170]) B(S, { size: [10, 300, 3], pos: P(WX + x, 170, -345.5), material: 'Wood', color: BEAM });
  // bedroom window frame + glass
  for (const [y, h] of [[70, 8], [190, 8]]) B(S, { size: [16, h, 130], pos: P(WX + 2, y, -230), material: 'Wood', color: '#6a4428' });
  for (const z of [-290, -170, -230]) B(S, { size: [14, 122, 7], pos: P(WX + 2, 130, z), material: 'Wood', color: '#6a4428' });
  B(S, { size: [14, 6, 120], pos: P(WX + 2, 130, -230), material: 'Wood', color: '#6a4428' });
  const window = S.part({ size: [2, 120, 120], pos: P(WX - 3, 130, -230), material: 'Glass', color: '#cfe8f8', transparency: 0.85, castShadow: false });
  // front door (hinged at z -50), doorstep, iron studs
  const door = S.group(`${n}_door`, { pivot: P(WX + 2, 20, -50) }, () => {
    S.part({ size: [8, 170, 100], pos: P(WX + 2, 105, 0), material: 'WoodPlanks', color: '#3a6aa8' });
    for (const y of [50, 160]) S.part({ size: [9, 8, 96], pos: P(WX + 2.5, y, 0), material: 'Metal', color: '#2a2a2e' });
    S.part({ shape: 'ball', size: [9, 9, 9], pos: P(WX + 8, 100, 38), material: 'Metal', color: '#c9a03a' });
  });
  B(S, { size: [70, 20, 160], pos: P(WX + 35, 10, 0), material: 'Cobblestone', color: '#9a948a' });
  S.anchor('step', P(WX + 40, 20, 0)); S.anchor('doorway', P(WX, 110, 0));
  // back (kitchen) door with a gap under it, step + ramp
  B(S, { size: [8, 158, 90], pos: P(WX + 2, 110, 235), material: 'WoodPlanks', color: '#6a4428' });
  B(S, { size: [70, 20, 100], pos: P(WX + 35, 10, 235), material: 'Cobblestone', color: '#9a948a' });
  B(S, { shape: 'wedge', size: [100, 20, 60], pos: P(WX + 100, 10, 235), rot: [0, -90, 0], material: 'Cobblestone', color: '#9a948a' });
  S.anchor('kitchenDoor', P(WX + 6, 6, 235));
  // roof + chimney (group)
  const roof = S.group(`${n}_roof`, { pivot: P(WX - 250, 320, 0) }, () => {
    S.part({ size: [520, 10, 720], pos: P(WX - 250, 325, 0), material: 'WoodPlanks', color: '#5a3a22' });
    for (const s of [-1, 1]) S.part({ shape: 'wedge', size: [540, 170, 370], pos: P(WX - 250, 415, s * 185), rot: [0, s > 0 ? 180 : 0, 0], material: 'ClayRoofTiles', color: '#9a4a32' });
    S.part({ size: [50, 260, 50], pos: P(WX - 380, 420, 220), material: 'Cobblestone', color: '#7a746a' });
  });
  // bedroom furniture
  B(S, { size: [70, 4, 150], pos: P(WX - 40, 62, -230), material: 'WoodPlanks', color: '#9a6a3a' });
  for (const z of [-300, -160]) for (const x of [WX - 70, WX - 10]) B(S, { size: [5, 40, 5], pos: P(x, 40, z), material: 'Wood', color: '#7a5030' });
  S.anchor('desk', P(WX - 35, 64, -230));
  B(S, { size: [230, 30, 110], pos: P(WX - 370, 35, -290), material: 'Wood', color: '#7a5030' }); B(S, { size: [220, 12, 104], pos: P(WX - 370, 56, -290), material: 'Fabric', color: '#a8402c' }); B(S, { size: [40, 10, 70], pos: P(WX - 470, 66, -290), material: 'Fabric', color: '#f4efe2' });
  B(S, { size: [120, 5, 30], pos: P(WX - 220, 140, -333), material: 'WoodPlanks', color: '#8a5a32' });
  for (const x of [-270, -170]) B(S, { size: [4, 20, 26], pos: P(WX + x, 128, -333), rot: [0, 0, 30], material: 'Wood', color: '#5a3a22' });
  S.anchor('shelf', P(WX - 220, 143, -333));
  B(S, { size: [60, 80, 2], pos: P(WX - 380, 180, -345), material: 'Fabric', color: '#c8902a' });
  S.light({ type: 'point', pos: P(WX - 250, 250, -190), color: '#ffe2b8', range: 520, brightness: 0.9 });
  // kitchen: tiles, counter, hearth
  for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) B(S, { size: [40, 1, 40], pos: P(WX - 480 + i * 40 + 20, 20.5, 150 + j * 40 + 20), material: 'Cobblestone', color: (i + j) % 2 ? '#c8bca8' : '#a89c88' });
  B(S, { size: [400, 90, 60], pos: P(WX - 260, 65, 315), material: 'WoodPlanks', color: '#8a5a32' }); B(S, { size: [404, 6, 64], pos: P(WX - 260, 113, 315), material: 'Slate', color: '#6a665e' });
  B(S, { size: [120, 140, 40], pos: P(WX - 490, 90, 245), material: 'Cobblestone', color: '#7a746a' }); B(S, { size: [80, 70, 42], pos: P(WX - 490, 55, 245), material: 'SmoothPlastic', color: '#1a1410' });
  S.light({ type: 'point', pos: P(WX - 250, 250, 245), color: '#fff2dc', range: 520, brightness: 0.9 });
  S.anchor('kitchen', P(WX - 200, 21, 240));
  return { anchors: {}, door, roof, window };
}
