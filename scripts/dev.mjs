import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
function start(args) {
  const child = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'inherit'] });
  children.add(child);
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.on('error', (error) => { console.error(error); stop(1); });
  child.on('exit', (code) => { children.delete(child); stop(code ?? 1); });
  return child;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());

// The watcher performs the initial build; wait for its staged export before serving.
const library = start(['scripts/build.mjs', '--watch']);
const lines = createInterface({ input: library.stdout });
let serving = false;
lines.on('line', (line) => {
  if (line === 'Validation diagnostic build ready' && !serving && !stopping) {
    serving = true;
    start(['node_modules/@angular/cli/bin/ng.js', 'serve', 'test-host']);
  }
});
