import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

const suppliedPort = process.argv[2];
const port = Number(suppliedPort);
if (!/^\d{1,5}$/.test(suppliedPort ?? '') || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid port');
}

for (const file of ['test-results/editor/jasmine.json', 'test-results/editor/features.html', 'test-results/editor/driver-junit.xml', 'test-results/editor/driver.json']) {
  await rm(file, { force: true });
}
const child = spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve', 'editor-tests', '--host', '127.0.0.1', '--port', String(port)], { stdio: 'inherit' });
/** @type {NodeJS.Signals[]} */
const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
