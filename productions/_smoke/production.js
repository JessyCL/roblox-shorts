// Engine smoke test: two shots, two sets, two characters. Used by `node engine/cli/still.mjs productions/_smoke`.
import { defineProduction } from '/engine/runtime/api.js';

export default defineProduction({
  cast: {
    noob: { skinColor: '#f5cd30', shirt: { color: '#0d69ac' }, pants: { color: '#a4bd47' } },
    pal: { skinColor: '#cc8e69', shirt: { color: '#c4281c' }, pants: { color: '#1b2a35' } },
  },
  sets: {
    street: (S) => {
      S.ground({ color: '#4b974b' });
      S.part({ size: [12, 0.2, 140], pos: [0, 0.1, 0], color: '#635f62' });
      for (let i = 0; i < 10; i++) S.part({ size: [6, 8 + (i % 4) * 4, 6], pos: [(i % 2 ? 1 : -1) * 14, 4 + (i % 4) * 2, -40 + i * 8], color: ['#c4281c', '#0d69ac', '#f5cd30', '#a3a2a5'][i % 4] });
    },
    plaza: (S) => {
      S.ground({ color: '#c4705a' });
      S.part({ shape: 'cylinder', size: [1, 6, 6], pos: [0, 0.5, -8], color: '#a3a2a5' });
      S.anchor('fountain', [0, 2, -8]);
    },
  },
  shots: [
    {
      id: 'walk', set: 'street', start: 0, end: 2,
      actors: { noob: { at: [-1.5, 0, 0], anim: [{ clip: 'walk' }] }, pal: { at: [1.5, 0, 0], anim: [{ clip: 'walk' }] } },
      camera: { target: [0, 3, 0], from: { dist: 16, height: 4, yaw: -30 }, to: { dist: 10, height: 1.5, yaw: 25 }, fov: 50 },
      post: { dof: { focus: 'noob.head', bokeh: 2 }, motionBlur: { samples: 4 } },
    },
    {
      id: 'closeup', set: 'plaza', start: 2, end: 4,
      actors: { noob: { at: [0, 0, 0], yaw: 0 } },
      camera: { target: 'noob.head', from: { dist: 6, height: 0.2, yaw: 10 }, to: { dist: 4.5, yaw: -10 }, fov: 40 },
      post: { dof: { focus: 'noob.head', bokeh: 4 } },
    },
  ],
});
