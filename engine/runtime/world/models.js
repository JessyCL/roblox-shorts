// glTF props from assets/library (manifest.jsonl, written by tools/import-assets.mjs). Assets are already in studs,
// bottom-centre pivot, facing +Z, lit PBR materials (unlit/metallic=1 Kenney materials fixed on import).
//   S.model('kenney.furniture.chair', { pos, rot, scale, color }) -> Group (filled once loaded; S.ready() awaits)
//   listModels() -> Promise<manifest records> (ids, tags, bounds) for tooling.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toColor } from './palette.js';

const ROOT = '/assets/library/';
let manifestP = null;
export function listModels() {
  manifestP ??= fetch(ROOT + 'manifest.jsonl').then((r) => (r.ok ? r.text() : '')).then((t) => t.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)));
  return manifestP;
}
const loader = new GLTFLoader();
const cache = new Map();
async function source(id) {
  if (!cache.has(id)) cache.set(id, (async () => {
    let url = id;
    if (!/\.(glb|gltf)$/i.test(id)) {
      const rec = (await listModels()).find((r) => r.id === id);
      if (!rec) throw new Error(`world: unknown model "${id}" (see assets/library/manifest.jsonl)`);
      url = ROOT + rec.file;
    }
    const gltf = await loader.loadAsync(url);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const fix = (m) => { // runtime guard for un-imported files
        if (m.isMeshBasicMaterial) m = new THREE.MeshStandardMaterial({ color: m.color, map: m.map, roughness: 0.6 });
        if (m.metalness === 1 && !m.metalnessMap) m.metalness = 0;
        return m;
      };
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
    });
    return gltf.scene;
  })());
  return cache.get(id);
}
// Clone per use (geometries/materials shared). `color` tints every material; `colors: { materialName: c }` per slot.
export async function loadModel(id, o = {}) {
  const obj = (await source(id)).clone(true);
  if (o.color || o.colors) obj.traverse((m) => {
    if (!m.isMesh) return;
    m.material = m.material.clone();
    const c = o.colors?.[m.material.name] ?? o.color;
    if (c) m.material.color = toColor(c);
  });
  return obj;
}
