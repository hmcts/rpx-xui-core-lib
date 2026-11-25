import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { packedLoadingPort } from './port.mjs';
const root = resolve(process.env.CORE_LOADING_HOST || '');
const identity = process.env.CORE_LOADING_ID;
if (!identity || !process.env.CORE_LOADING_HOST) throw new Error('Packed host identity is required');
createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (pathname === '/__loading_identity') { response.writeHead(200, { 'content-type': 'text/plain' }).end(identity); return; }
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (file !== root && !file.startsWith(root + sep)) { response.writeHead(400).end(); return; }
  try {
    const data = await readFile(file);
    response.writeHead(200, { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' })[extname(file)] ?? 'application/octet-stream' }).end(data);
  } catch { response.writeHead(404).end(); }
}).listen(packedLoadingPort, '127.0.0.1');
