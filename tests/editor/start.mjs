import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

const port = process.argv[2];
if (!/^\d{1,5}$/.test(port ?? '') || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('Invalid port');
}

for (const file of ['test-results/editor/jasmine.json', 'test-results/editor/features.html', 'test-results/editor/driver-junit.xml']) {
  await rm(file, { force: true });
}
const child = spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve', 'editor-tests', '--port', port], { stdio: 'inherit' });
/** @type {NodeJS.Signals[]} */
const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
