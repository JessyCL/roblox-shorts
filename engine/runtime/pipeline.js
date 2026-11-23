// Renderer + post chain. Time is set explicitly per frame (frame / fps); nothing reads a clock.
// Every effect parameter is read from director.post each frame (see director.js / fx module).
import * as THREE from 'three';
import {
  EffectComposer, EffectPass, Pass, RenderPass, BlendFunction, BloomEffect, ChromaticAberrationEffect,
  DepthOfFieldEffect, NoiseEffect, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

// Replaces RenderPass. Renders `samples` sub-frames over the shutter interval and averages them in a half-float
// target (motion blur). Sub-frame times are passed with the frame-centre time so the director keeps every sub-frame
// inside the active shot (no blending across cuts). The centre sub-frame renders last so its depth feeds AO/DOF.
class AccumulationRenderPass extends Pass {
  constructor(director, fps) {
    super('AccumulationRenderPass');
    this.needsSwap = false;
    this.needsDepthBlit = true;
    this.director = director;
    this.fps = fps;
    this.frameTime = 0;
    this.samples = 1;
    this.maxSamples = 16;
    this.shutter = 0.5; // fraction of the frame interval (0.5 = 180-degree shutter)
    this.renderPass = new RenderPass(director.scene, director.camera);
    this.accum = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.fullscreenMaterial = new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, scale: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform float scale; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv) * scale; }',
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
      depthTest: false, depthWrite: false,
    });
  }

  render(renderer, inputBuffer) {
    const n = Math.min(this.maxSamples, Math.max(1, this.director.post.motionBlur?.samples ?? this.samples));
    const shutter = this.director.post.motionBlur?.shutter ?? this.shutter;
    if (n <= 1) {
      this.director.setTime(this.frameTime, this.frameTime);
      this.renderPass.render(renderer, inputBuffer);
      return;
    }
    const m = this.fullscreenMaterial;
    renderer.setRenderTarget(this.accum);
    renderer.clear(true, false, false);
    const offsets = Array.from({ length: n }, (_, k) => ((k + 0.5) / n - 0.5) * shutter / this.fps)
      .sort((a, b) => Math.abs(b) - Math.abs(a)); // centre-most last
    m.blending = THREE.CustomBlending;
    m.uniforms.scale.value = 1 / n;
    m.uniforms.map.value = inputBuffer.texture;
    for (const dt of offsets) {
      this.director.setTime(this.frameTime + dt, this.frameTime);
      this.renderPass.render(renderer, inputBuffer);
      renderer.setRenderTarget(this.accum);
      renderer.render(this.scene, this.camera);
    }
    m.blending = THREE.NoBlending;
    m.uniforms.scale.value = 1;
    m.uniforms.map.value = this.accum.texture;
    renderer.setRenderTarget(inputBuffer); // colour only (depthWrite off): keeps centre depth
    renderer.render(this.scene, this.camera);
  }

  setSize(width, height) { this.accum.setSize(width, height); }
}

// finishing: pmndrs Effect from fx (grade/flash/2D zoom/blurs). overlay: pmndrs Pass from fx drawing screen-space
// stickers/speech bubbles/speed lines AFTER grading (so overlays are not graded or blurred).
export async function createPipeline(canvas, director, { width, height, fps = 60, quality = 'final', finishing = null, overlay = null } = {}) {
  const preview = quality === 'preview';
  const renderer = director.renderer;
  renderer.setPixelRatio(1); // never devicePixelRatio: output size must not depend on the display
  renderer.setSize(width, height, false);

  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType }); // HDR until tone mapping
  const scenePass = new AccumulationRenderPass(director, fps);
  if (preview) scenePass.maxSamples = 1; // previews skip motion blur
  const ao = new N8AOPostPass(director.scene, director.camera, width, height);
  ao.setQualityMode(preview ? 'Performance' : 'Medium');
  Object.assign(ao.configuration, { aoRadius: 1.5, distanceFalloff: 1, intensity: 2.0, gammaCorrection: false });
  const dof = new DepthOfFieldEffect(director.camera, { focusRange: 7, bokehScale: 2.5 });
  dof.target = new THREE.Vector3();
  const smaa = new SMAAEffect({ preset: preview ? SMAAPreset.MEDIUM : SMAAPreset.HIGH });
  const smaaReady = new Promise((resolve) => smaa.addEventListener('load', resolve));
  const noise = new NoiseEffect({ blendFunction: BlendFunction.SOFT_LIGHT });
  // Khronos PBR Neutral keeps BrickColors close to their sRGB values (Roblox has no filmic curve; AgX/ACES wash it out).
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
  // Roblox bloom thresholds on bright (emissive/Neon) content; keep threshold >= 1 so plastic never blooms.
  const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, intensity: 0.4 });
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.25 });
  const vignette = new VignetteEffect({ offset: 0.35, darkness: 0.35 });
  const passes = [
    new EffectPass(director.camera, dof, bloom, tone),
    new EffectPass(director.camera, smaa),                 // convolution effects cannot share a pass
    ...(finishing ? [new EffectPass(director.camera, finishing)] : []), // grade, flash, 2D zoom/shake, blurs (fx module)
    new EffectPass(director.camera, ca, vignette, noise),
  ];
  for (const p of [scenePass, ao, ...passes, ...(overlay ? [overlay] : [])]) composer.addPass(p);
  await smaaReady;

  // Apply director.post (written during setTime) to the effects. Called after the centre sub-frame is evaluated,
  // i.e. at the start of the next composer.render, so we evaluate the frame centre once up front.
  function applyPost(P) {
    renderer.toneMappingExposure = P.exposure ?? 1;
    tone.mode = ToneMappingMode[P.toneMapping ?? 'NEUTRAL'];
    bloom.intensity = P.bloom?.intensity ?? 0.4;
    bloom.luminanceMaterial.threshold = P.bloom?.threshold ?? 1.0;
    const d = P.dof;
    dof.bokehScale = d && d.enabled !== false ? (d.bokeh ?? 2.5) : 0;
    if (d?.focus) dof.target.copy(d.focus);
    dof.cocMaterial.focusRange = d?.range ?? 7;
    ao.configuration.intensity = P.ao?.intensity ?? 0.8; // light AO: heavy AO reads as Blender (STYLE_BIBLE §8)
    ao.enabled = P.ao?.enabled !== false;
    ca.offset.set(P.chromatic ?? 0, P.chromatic ?? 0);
    // Samples: vignette in 1/10 videos, grain in 0/10 -> both off unless a shot asks.
    vignette.offset = P.vignette?.offset ?? 0.35;
    vignette.darkness = P.vignette?.darkness ?? 0;
    noise.blendMode.opacity.value = P.grain ?? 0;
    finishing?.apply?.(P);
    overlay?.apply?.(P);
  }

  // GPU conversion of the final sRGB frame to BT.709 limited-range I420, 4 bytes per RGBA8 texel, top-down rows:
  // reading the (W/4 x 1.5H) target yields exactly ffmpeg's yuv420p layout (2.67x fewer bytes than RGBA).
  if (width % 8 || height % 2) throw new Error(`I420 packing needs width % 8 == 0 and even height, got ${width}x${height}`);
  const frameTex = new THREE.FramebufferTexture(width, height);
  const yuvTarget = new THREE.WebGLRenderTarget(width / 4, height * 1.5, { depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const yuvPass = new Pass('YUVPackPass');
  yuvPass.fullscreenMaterial = new THREE.ShaderMaterial({
    uniforms: { frame: { value: frameTex }, size: { value: new THREE.Vector2(width, height) } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform sampler2D frame; // canvas copy: y = 0 is the bottom row
      uniform vec2 size;
      const vec3 K = vec3(0.2126, 0.7152, 0.0722);
      vec3 px(int x, int yTop) { return texelFetch(frame, ivec2(x, int(size.y) - 1 - yTop), 0).rgb; }
      float chroma(int cx, int cy, bool cr) {
        vec3 c = 0.25 * (px(2 * cx, 2 * cy) + px(2 * cx + 1, 2 * cy) + px(2 * cx, 2 * cy + 1) + px(2 * cx + 1, 2 * cy + 1));
        float y = dot(c, K);
        return 128.0 + 224.0 * (cr ? (c.r - y) / 1.5748 : (c.b - y) / 1.8556);
      }
      void main() {
        int W = int(size.x), H = int(size.y), Q = W * H / 4;
        ivec2 t = ivec2(gl_FragCoord.xy);
        vec4 o;
        for (int c = 0; c < 4; c++) {
          int x = 4 * t.x + c;
          if (t.y < H) { o[c] = 16.0 + 219.0 * dot(px(x, t.y), K); continue; }
          int k = (t.y - H) * W + x, plane = k / Q;
          k -= plane * Q;
          o[c] = chroma(k % (W / 2), k / (W / 2), plane == 1);
        }
        gl_FragColor = o / 255.0;
      }`,
    depthTest: false, depthWrite: false,
  });

  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  return {
    yuvSize: [width / 4, height * 1.5],
    renderer, composer, gl, scenePass,
    fx: { ao, dof, bloom, tone, smaa, ca, vignette, noise, finishing },
    packYUV() {
      renderer.setRenderTarget(null);
      renderer.copyFramebufferToTexture(frameTex);
      renderer.setRenderTarget(yuvTarget);
      renderer.render(yuvPass.scene, yuvPass.camera);
    },
    sync() { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }, // drains the GPU queue
    renderFrame(frame) {
      const t = frame / fps;
      director.setTime(t, t); // evaluate the frame centre once so post params are current for this frame
      applyPost(director.post);
      scenePass.frameTime = t;
      for (const p of passes) p.fullscreenMaterial.time = t; // grain seed = frame time
      composer.render(0);
    },
  };
}
