import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

for (const file of ['test-results/editor/jasmine.json', 'test-results/editor/features.html', 'test-results/editor/driver-junit.xml']) {
  await rm(file, { force: true });
}
const child = spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve', 'editor-tests', '--port', process.argv[2]], { stdio: 'inherit' });
/** @type {NodeJS.Signals[]} */
const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
