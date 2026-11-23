// ffmpeg wrappers: a streaming H.264 encoder fed through stdin, plus one-shot helpers.
import { spawn } from 'node:child_process';
import { FFMPEG } from './config.mjs';

// BT.709 limited-range tags. The scale filter must also *convert* with the 709 matrix: swscale's
// default for RGB->YUV is BT.601, which would make the tags lie (visible hue/saturation shift).
export const BT709_TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
export const TO_YUV420_709 = 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p';

function run(args, stdin) {
  const proc = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args], { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000); });
  const done = new Promise((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`))));
  });
  return { proc, done };
}

// input: 'raw' (RGBA, give width/height; flip=true for bottom-up readPixels rows) | 'yuv' (I420, already BT.709
// limited range: no conversion) | 'png' | 'jpeg'.
// out: file path, or null to encode and discard (throughput tests).
export function startEncoder({ input, width, height, fps = 30, flip = false, out, crf = 16, preset = 'medium', codecArgs }) {
  const inArgs = {
    raw: ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-framerate', `${fps}`, '-i', 'pipe:0'],
    yuv: ['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${width}x${height}`, '-framerate', `${fps}`, ...BT709_TAGS, '-i', 'pipe:0'],
    png: ['-f', 'image2pipe', '-c:v', 'png', '-framerate', `${fps}`, '-i', 'pipe:0'],
    jpeg: ['-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', `${fps}`, '-i', 'pipe:0'],
  }[input];
  const vf = input === 'yuv' ? [] : ['-vf', (flip ? 'vflip,' : '') + TO_YUV420_709];
  const codec = codecArgs ?? ['-c:v', 'libx264', '-preset', preset, '-crf', `${crf}`];
  const outArgs = out ? ['-movflags', '+faststart', '-y', out] : ['-f', 'null', '-'];
  const { proc, done } = run([...inArgs, ...vf, ...codec, ...BT709_TAGS, ...outArgs], true);
  let failed = null;
  done.catch((e) => { failed = e; });
  proc.stdin.on('error', () => {}); // EPIPE surfaces through `done`
  return {
    // Resolves once ffmpeg's pipe has accepted the frame (natural backpressure).
    write: (buf) => new Promise((resolve, reject) => {
      if (failed) return reject(failed);
      proc.stdin.write(buf, (err) => (err ? reject(failed ?? err) : resolve()));
    }),
    end: async () => { proc.stdin.end(); await done; },
  };
}

// One frame -> PNG file. RGBA (bottom-up when flip) or I420 (BT.709 limited, decoded like a player would).
export async function writePng(buf, { width, height, flip = true, yuv = false, out }) {
  const input = yuv ? ['-pix_fmt', 'yuv420p'] : ['-pix_fmt', 'rgba'];
  const vf = yuv ? ['-vf', 'scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int'] : flip ? ['-vf', 'vflip'] : [];
  const { proc, done } = run(['-f', 'rawvideo', ...input, '-s', `${width}x${height}`, '-i', 'pipe:0', ...vf, '-frames:v', '1', '-y', out], true);
  proc.stdin.end(buf);
  await done;
}

// Annex-B H.264 elementary stream -> MP4 without re-encoding; h264_metadata writes BT.709 into the SPS VUI.
export async function muxH264(input, out, fps = 30) {
  await run(['-f', 'h264', '-framerate', `${fps}`, '-i', input, '-c', 'copy',
    '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0',
    ...BT709_TAGS, '-movflags', '+faststart', '-y', out]).done;
}

export function ffmpeg(args) { return run(args, false).done; }
