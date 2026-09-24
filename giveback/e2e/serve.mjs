// Minimal static server for the Expo web export, resolving [param] routes.
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const root = process.argv[2];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon' };
function resolve(dir, parts) {
  if (!parts.length) return existsSync(join(dir, 'index.html')) ? join(dir, 'index.html') : null;
  const [head, ...rest] = parts;
  if (!rest.length) {
    for (const f of [head, head + '.html', join(head, 'index.html')]) {
      const p = join(dir, f);
      if (existsSync(p) && statSync(p).isFile()) return p;
    }
  }
  if (existsSync(join(dir, head)) && statSync(join(dir, head)).isDirectory()) {
    const r = resolve(join(dir, head), rest);
    if (r) return r;
  }
  for (const entry of readdirSync(dir)) {
    if (!entry.startsWith('[')) continue;
    const p = join(dir, entry);
    if (!rest.length && entry.endsWith('.html')) return p;
    if (statSync(p).isDirectory()) { const r = resolve(p, rest); if (r) return r; }
  }
  return null;
}
createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = resolve(root, path.split('/').filter(Boolean)) ?? join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(8082, () => console.log('serving on 8082'));
