// Roblox material library for the world module.
//   getMaterial('Brick', 'Dark red', { transparency, reflectance, instanced }) -> cached THREE material
// Every Roblox material maps to MeshStandardMaterial with roughness/metalness measured from Roblox's 2022 maps
// (research/roblox-look.md §4.1) plus a procedural tiling texture (textures.js) applied in STUD space: the vertex
// shader derives UVs from the part's local position x its scale, projected on the dominant face axis, so a brick
// course is 0.45 studs tall on any part size and parts can share unit geometries / be instanced.
// Neon = unlit MeshBasicMaterial at ~4x its colour (HDR, feeds bloom). Glass = glossy + Transparency.
// Also patches three's fog chunks globally with a world-HEIGHT fog term (the "bottomless void" look); its uniforms
// (WORLD_UNIFORMS) are attached to world materials here and to foreign materials via adoptMaterial().
import * as THREE from 'three';
import { toColor, colorKey } from './palette.js';
import { proceduralTexture } from './textures.js';

// name: [roughness, metalness, texture generator | null, default colour, kind?]
export const MATERIALS = {
  SmoothPlastic: [0.32, 0, null, '#a3a2a5'],
  Plastic: [0.5, 0, 'plastic', '#a3a2a5'],
  Neon: [1, 0, null, '#a3a2a5', 'neon'],
  Glass: [0.08, 0, null, '#8aa7a8', 'glass'],
  ForceField: [1, 0, 'forcefield', '#a3a2a5', 'forcefield'],
  Wood: [0.63, 0, 'wood', '#ac946c'],
  WoodPlanks: [0.55, 0, 'woodplanks', '#ac946c'],
  Brick: [0.59, 0, 'brick', '#8a6149'],
  Concrete: [0.71, 0, 'concrete', '#989898'],
  Cobblestone: [0.87, 0, 'cobblestone', '#868676'],
  Grass: [0.9, 0, 'grass', '#6f7e3e'],
  LeafyGrass: [0.91, 0, 'grass', '#5e8a3a'],
  Sand: [0.75, 0, 'sand', '#cfcba7'],
  Slate: [0.58, 0, 'slate', '#585956'],
  Marble: [0.43, 0, 'marble', '#7a7a7a'],
  Granite: [0.16, 0, 'granite', '#95928b'],
  Ice: [0.39, 0, 'ice', '#ccd2df'],
  Glacier: [0.39, 0, 'ice', '#aed4e8'],
  Fabric: [0.89, 0, 'fabric', '#c2c1a8'],
  // metals keep ~30% diffuse body colour: with metalness 1 a small gold prop shows only the (sky) reflection and reads as glass
  Metal: [0.24, 0.7, 'metal', '#a8afb0'],
  DiamondPlate: [0.34, 0.7, 'diamondplate', '#a8afb0'],
  Foil: [0.3, 0.65, 'foil', '#a8afb0'],
  CorrodedMetal: [0.6, 0.16, 'corroded', '#688cad'],
  Pebble: [0.83, 0, 'pebble', '#8c8a80'],
  Ground: [0.91, 0, 'ground', '#6b5b45'],
  Rock: [0.7, 0, 'rock', '#666c6f'],
  Basalt: [0.81, 0, 'rock', '#3e3e44'],
  Snow: [0.49, 0, 'snow', '#f0f3f7'],
  Mud: [0.54, 0, 'mud', '#4f3d2e'],
  Asphalt: [0.87, 0, 'asphalt', '#5a5a5c'],
  Pavement: [0.76, 0, 'pavement', '#9b9a95'],
  Limestone: [0.67, 0, 'concrete', '#cec7b2'],
  Sandstone: [0.76, 0, 'sandstone', '#c08a5c'],
  Salt: [0.64, 0, 'granite', '#e6e6ea'],
  CrackedLava: [0.74, 0, 'slate', '#5a2f22'],
  Cardboard: [0.67, 0, 'cardboard', '#b58e5f'],
  Carpet: [0.8, 0, 'carpet', '#9b4a4a'],
  CeramicTiles: [0.29, 0, 'ceramictiles', '#e8e6e0'],
  ClayRoofTiles: [0.57, 0, 'clayrooftiles', '#b5553a'],
  RoofShingles: [0.8, 0, 'roofshingles', '#5a4a44'],
  Leather: [0.46, 0, 'leather', '#6b4a32'],
  Plaster: [0.95, 0, 'plaster', '#e8e2d6'],
  Rubber: [0.58, 0.18, 'carpet', '#2a2a2a'],
};
const CANON = new Map(Object.keys(MATERIALS).map((k) => [k.toLowerCase(), k]));
export const materialName = (n = 'Plastic') => {
  const k = CANON.get(String(n).toLowerCase().replace(/[\s_-]/g, ''));
  if (!k) throw new Error(`world: unknown material "${n}" (known: ${Object.keys(MATERIALS).join(', ')})`);
  return k;
};
export const NEON_GAIN = 5; // Roblox Neon ~ 4-6x its colour, unlit
// Bloom keys on luminance, which under-blooms saturated red/blue neon: lift dark-luminance neon colours further
// (they also wash toward white at the core after tone mapping, like Roblox Neon).
export const neonGain = (c) => Math.min(32, Math.max(NEON_GAIN, 2.8 / Math.max(0.02, 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b)));

// ---------- shared uniforms (updated by looks.js / updateSet) ----------
export const WORLD_UNIFORMS = {
  hfParams: { value: new THREE.Vector4(0, 0, 0, 1) }, // height fog: y, density, enabled, max amount
  hfColor: { value: new THREE.Color(0x211e2d) },
  worldTime: { value: 0 },
};

// Global fog-chunk patch: adds world-height fog after distance fog. Uniforms default to 0 (= off) in programs whose
// material did not get WORLD_UNIFORMS, so foreign shaders stay correct.
{
  const C = THREE.ShaderChunk;
  if (!C.fog_vertex.includes('vFogWorldY')) {
    C.fog_pars_vertex += '\n#ifdef USE_FOG\n\tvarying float vFogWorldY;\n#endif\n';
    C.fog_vertex += '\n#ifdef USE_FOG\n\tvFogWorldY = ( transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz ) ).y;\n#endif\n';
    C.fog_pars_fragment += '\n#ifdef USE_FOG\n\tvarying float vFogWorldY;\n\tuniform vec4 hfParams;\n\tuniform vec3 hfColor;\n#endif\n';
    C.fog_fragment += `
#ifdef USE_FOG
	if ( hfParams.z > 0.5 ) {
		float hfAmt = 1.0 - exp( - hfParams.y * max( 0.0, hfParams.x - vFogWorldY ) );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, hfColor, clamp( hfAmt * hfParams.w, 0.0, 1.0 ) );
	}
#endif
`;
  }
}
const addWorldUniforms = (shader) => { shader.uniforms.hfParams = WORLD_UNIFORMS.hfParams; shader.uniforms.hfColor = WORLD_UNIFORMS.hfColor; };

// Foreign materials (characters, fx): attach the shared height-fog uniforms before their first compile.
const adopted = new WeakSet();
export function adoptMaterial(m, renderer) {
  if (adopted.has(m)) return;
  adopted.add(m);
  if (!m.fog || m.isShaderMaterial || renderer.properties.get(m).programs) return; // compiled already: shared program state covers it
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey();
  m.onBeforeCompile = function (shader, r) { prev.call(this, shader, r); addWorldUniforms(shader); };
  m.customProgramCacheKey = () => prevKey; // same source -> reuse cached programs (no recompiles)
}

// ---------- stud-space mapping (shared onBeforeCompile => one program per define set) ----------
const STUD_VERT = /* glsl */`
#ifdef STUD_MAP
{
	#ifdef USE_INSTANCING
		vec3 sc = vec3( length( instanceMatrix[ 0 ].xyz ), length( instanceMatrix[ 1 ].xyz ), length( instanceMatrix[ 2 ].xyz ) );
		mat3 sr = mat3( instanceMatrix[ 0 ].xyz / sc.x, instanceMatrix[ 1 ].xyz / sc.y, instanceMatrix[ 2 ].xyz / sc.z );
		vec3 sp = transformed * sc + transpose( sr ) * instanceMatrix[ 3 ].xyz; // batched parts line up like one wall
	#else
		vec3 sc = vec3( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ), length( modelMatrix[ 2 ].xyz ) );
		vec3 sp = transformed * sc + studOffset;
	#endif
	vec3 an = abs( objectNormal / sc );
	vec2 suv = ( an.x >= an.y && an.x >= an.z ) ? sp.zy : ( an.y >= an.z ? sp.xz : sp.xy );
	suv /= studTile;
	#ifdef USE_MAP
		vMapUv = suv;
	#endif
	#ifdef USE_BUMPMAP
		vBumpMapUv = suv;
	#endif
}
#endif
`;
const BUMP_PARS = THREE.ShaderChunk.bumpmap_pars_fragment.replace(/(texture2D\( bumpMap, vBumpMapUv[^)]*\))\.x/g, '$1.y');
function studCompile(shader) {
  addWorldUniforms(shader);
  shader.uniforms.studTile = { value: this.userData.studTile ?? new THREE.Vector2(8, 8) };
  shader.uniforms.studOffset = { value: this.userData.studOffset ?? new THREE.Vector3() };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec2 studTile;\nuniform vec3 studOffset;')
    .replace('#include <fog_vertex>', '#include <fog_vertex>\n' + STUD_VERT);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <map_fragment>', '#ifdef USE_MAP\n\tdiffuseColor.rgb *= texture2D( map, vMapUv ).r;\n#endif')
    .replace('#include <bumpmap_pars_fragment>', BUMP_PARS);
}
function worldCompile(shader) { addWorldUniforms(shader); } // non-textured world materials (neon, sky-facing etc.)

// ---------- textures ----------
let maxAniso = 8;
export function setRenderer(renderer) { maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy()); }
const texCache = new Map();
export function textureFor(gen) {
  if (!texCache.has(gen)) {
    const p = proceduralTexture(gen);
    const t = new THREE.CanvasTexture(p.canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace; // R (albedo) is authored in sRGB; G (height) only needs to be monotonic
    t.anisotropy = maxAniso;
    t.userData = { tile: p.tile, bump: p.bump };
    texCache.set(gen, t);
  }
  return texCache.get(gen);
}

// Materials whose emissive follows the look's "lights on" factor (lit windows, lamp bulbs at night).
export const NIGHT_GLOW = new Set();

const matCache = new Map();
// opts: transparency (0..1), reflectance (0..1), instanced (colour comes from per-instance colour -> white base),
// glow (emissive multiplier that follows look.lights), side, fog.
export function getMaterial(name = 'Plastic', color, opts = {}) {
  const N = materialName(name);
  const [rough, metal, gen, defColor, kind] = MATERIALS[N];
  const { transparency = 0, reflectance = 0, instanced = false, glow = 0, side = THREE.FrontSide, fog = true, emissive = null } = opts;
  const key = [N, instanced ? 'inst' : colorKey(color ?? defColor), transparency, reflectance, glow, side, fog, emissive && colorKey(emissive)].join('|');
  if (matCache.has(key)) return matCache.get(key);
  const c = instanced ? new THREE.Color(1, 1, 1) : toColor(color ?? defColor);
  let m;
  if (kind === 'neon') {
    m = new THREE.MeshBasicMaterial({ color: c.multiplyScalar(neonGain(c)), side, fog });
    m.onBeforeCompile = worldCompile;
  } else if (kind === 'forcefield') {
    m = new THREE.MeshBasicMaterial({ color: c.multiplyScalar(1.6), map: textureFor(gen), transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, side, fog });
    m.userData.scroll = true;
  } else {
    const tex = gen ? textureFor(gen) : null;
    m = new THREE.MeshStandardMaterial({
      color: c, roughness: THREE.MathUtils.lerp(rough, 0.05, reflectance), metalness: THREE.MathUtils.lerp(metal, 0.6, reflectance),
      map: tex, bumpMap: tex && tex.userData.bump ? tex : null, bumpScale: tex ? tex.userData.bump * 10 : 1,
      envMapIntensity: 1 + reflectance * 1.5 + (kind === 'glass' ? 0.6 : 0) + metal * 0.5, side, fog,
    });
    if (tex) { m.defines = { STUD_MAP: '' }; m.userData.studTile = new THREE.Vector2(...tex.userData.tile); }
    m.onBeforeCompile = tex ? studCompile : worldCompile;
    if (glow || emissive) { m.emissive = toColor(emissive ?? color ?? defColor); m.userData.glow = glow || 1; m.emissiveIntensity = 0; NIGHT_GLOW.add(m); }
  }
  const tr = kind === 'glass' && transparency === 0 ? 0 : transparency;
  if (tr > 0) { m.transparent = true; m.opacity = 1 - tr; m.depthWrite = tr < 0.3; }
  m.name = `${N}${instanced ? ':inst' : ''}`;
  matCache.set(key, m);
  return m;
}

// Per-frame material animation (ForceField scroll). Pure in t.
export function updateMaterials(t) {
  WORLD_UNIFORMS.worldTime.value = t;
  for (const m of matCache.values()) if (m.userData.scroll) m.map.offset.set((t * 0.05) % 1, (t * 0.11) % 1);
}

// A stud-mapped standard material with a custom texture generator (terrain uses its own shader; this is for props).
export { studCompile, worldCompile, addWorldUniforms };
