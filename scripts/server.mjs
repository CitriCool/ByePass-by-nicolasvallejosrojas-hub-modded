import { memoriaApi } from './memoria-api.mjs';
import { saltoApi } from './salto-api.mjs';
import { minasApi } from './minas-api.mjs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let rulingsCache;
export const root = fileURLToPath(new URL('../', import.meta.url));
export const policy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.gstatic.com http://127.0.0.1:9000",
  "connect-src 'self' http://127.0.0.1:9000 ws://127.0.0.1:9000 http://127.0.0.1:9099",
  "img-src 'self' data: blob: https://assets.tcgdex.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "media-src 'self' data: blob:",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-src 'self' http://127.0.0.1:9000", "frame-ancestors 'self'",
].join('; ');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
export function startServer(port = 8001, { apiSalto = saltoApi, apiMinas = minasApi } = {}) {
  const web = path.join(root, 'web');
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', policy);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    if (/^\/(admin|cuenta|muro|staff|herramientas|estadisticas)(\.html|\?|$)/.test(req.url)) res.setHeader('X-Frame-Options', 'DENY');
    if (await memoriaApi(req,res)) return;
    if (await apiSalto(req,res)) return;
    if (await apiMinas(req,res)) return;
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      let file = path.resolve(web, '.' + pathname);
      if (file !== web && !file.startsWith(web + path.sep)) { res.writeHead(403).end(); return; }
      if (pathname === '/sw.js') { res.writeHead(404).end(); return; }
      let status = 200;
      try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
      catch { file = path.join(web, '404.html'); status = 404; }
      let body = await readFile(file);
      if (path.basename(file) === 'rulings.json') {
        const etag = '"' + createHash('sha256').update(body).digest('hex') + '"';
        res.setHeader('ETag', etag); res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('Vary', 'Accept-Encoding');
        if (req.headers['if-none-match'] === etag) { res.writeHead(304).end(); return; }
        const accepted = req.headers['accept-encoding'] || '';
        if (!rulingsCache || rulingsCache.etag !== etag) rulingsCache = { etag, br: brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]:4 } }), gzip:gzipSync(body) };
        if (/\bbr\b/.test(accepted)){ body = rulingsCache.br; res.setHeader('Content-Encoding','br'); }
        else if (/\bgzip\b/.test(accepted)){ body = rulingsCache.gzip; res.setHeader('Content-Encoding','gzip'); }
      }
      res.writeHead(status, { 'Content-Type': (mime[path.extname(file)] || 'application/octet-stream') +
        (['.html', '.js', '.css', '.json'].includes(path.extname(file)) ? '; charset=utf-8' : '') });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(400).end('Solicitud no válida'); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
