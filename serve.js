// 로컬 미리보기용 정적 파일 서버 (선택). 배포에는 필요 없음.
// 실행: node serve.js  →  http://localhost:5178
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5178;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const fp = path.join(__dirname, path.normalize(p));
  if (!fp.startsWith(__dirname)) { res.writeHead(403); return res.end('forbidden'); }
  try {
    const data = await fs.readFile(fp);
    res.writeHead(200, { 'content-type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`\n  💪 로컬 미리보기: http://localhost:${PORT}`);
  console.log('  (정적 파일 서버 · 종료 Ctrl+C)\n');
});
