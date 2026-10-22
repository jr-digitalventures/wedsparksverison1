import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const size = fs.statSync(file).size, range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    if (range) {
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : size - 1, size - 1);
      if (start >= size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 }); fs.createReadStream(file, { start, end }).pipe(res);
    } else { res.writeHead(200, { ...headers, 'Content-Length': size }); fs.createReadStream(file).pipe(res); }
  } catch { res.writeHead(404).end('Not found'); }
}).listen(8765, '127.0.0.1', () => console.log('Vendor profile preview: http://127.0.0.1:8765/vendor-profile/'));
