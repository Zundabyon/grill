import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawn } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + '/') || /(?:^|\/)\./.test(pathname)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 5173), '127.0.0.1', () => {
  const url=`http://127.0.0.1:${server.address().port}`;
  console.log(`Grill: ${url}`);
  if(process.argv.includes('--open') && process.platform==='darwin') {
    const browser=spawn('open',[url],{stdio:'ignore'});
    browser.on('error',()=>console.log('ブラウザで上のURLを開いてください。'));
  }
});
