// Local server rooted at the project folder: serves engine/runtime, engine/node_modules, assets/, productions/,
// and receives rendered frames as binary POSTs (POST /frame?i=<index>&kind=<yuv|raw|jpeg|png>).
// The response is sent only after the sink consumed the frame, so encoder backpressure reaches the page.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.map': 'application/json',
  '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.ass': 'text/plain; charset=utf-8',
};

export async function startServer({ root = PROJECT_ROOT, port = 0 } = {}) {
  root = path.resolve(root);
  const state = { sink: null }; // async (buffer, index, kind) => void
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://local');
      if (req.method === 'POST' && url.pathname === '/frame') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        if (!state.sink) throw new Error('no frame sink set');
        await state.sink(Buffer.concat(chunks), Number(url.searchParams.get('i')), url.searchParams.get('kind'));
        res.writeHead(204).end();
        return;
      }
      const rel = url.pathname === '/' ? '/engine/runtime/preview.html' : url.pathname;
      const file = path.join(root, decodeURIComponent(rel));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500).end(String(e?.message ?? e));
    }
  });
  server.keepAliveTimeout = 60_000;
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    state,
    close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }),
  };
}
