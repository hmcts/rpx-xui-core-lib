import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const target = process.argv[2];
if (!['gallery', 'i18n'].includes(target)) throw new Error('Unknown host');
let proxy;
let identityServer;
if (process.env.CORE_EVIDENCE_RUN_ID) {
  const identity = JSON.parse(readFileSync('test-results/lane-provenance/run.json', 'utf8'));
  if (identity.invocationId !== process.env.CORE_EVIDENCE_RUN_ID || !identity.sourceSnapshot) throw new Error('Missing supervised host identity');
  const route = '/__core-evidence/' + encodeURIComponent(identity.invocationId);
  identityServer = createServer((request, response) => {
    if (request.url !== route) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(identity));
  });
  await new Promise((resolveListening, reject) => identityServer.listen(0, '127.0.0.1', resolveListening).once('error', reject));
  const address = identityServer.address();
  if (!address || typeof address === 'string') throw new Error('Missing identity server address');
  mkdirSync('.angular/evidence-proxy', { recursive: true });
  proxy = resolve('.angular/evidence-proxy', `${identity.invocationId}-${target}.mjs`);
  const original = target === 'gallery' ? `import original from ${JSON.stringify(pathToFileURL(resolve('apps/test-host/local-translations.mjs')).href)};` : 'const original = {};';
  writeFileSync(proxy, `${original}\nexport default { ...original, [${JSON.stringify(route)}]: { target: ${JSON.stringify(`http://127.0.0.1:${address.port}`)}, secure: false } };\n`);
}
const args = target === 'gallery' ? ['scripts/dev.mjs'] : ['node_modules/@angular/cli/bin/ng.js', 'serve', 'translation-tests', ...(process.env.CORE_HOST_PORT ? ['--port', process.env.CORE_HOST_PORT] : []), ...(proxy ? ['--proxy-config', proxy] : [])];
const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...(proxy ? { CORE_HOST_PROXY_CONFIG: proxy } : {}) } });
let closing = false;
function close(signal) {
  if (closing) return;
  closing = true;
  if (signal && child.exitCode === null && child.signalCode === null) child.kill(signal);
  identityServer?.close();
  if (proxy) rmSync(proxy, { force: true });
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => close(signal));
child.on('error', error => { console.error(error); close(); process.exitCode = 1; });
child.on('exit', (code, signal) => { close(); process.exitCode = code ?? (signal ? 1 : 0); });
