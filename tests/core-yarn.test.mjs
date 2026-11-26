import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const launcher = join(root, 'scripts/core-yarn.mjs');

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'core-yarn-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('runs the Yarn path selected by the current working directory and forwards arguments', t => {
  const directory = fixture(t);
  mkdirSync(join(directory, '.yarn/releases'), { recursive: true });
  writeFileSync(join(directory, '.yarn/releases/test-yarn.cjs'), 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n');
  writeFileSync(join(directory, '.yarnrc.yml'), 'yarnPath: .yarn/releases/test-yarn.cjs\n');

  const result = spawnSync(process.execPath, [launcher, 'install', '--immutable'], { cwd: directory, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ['install', '--immutable']);
});

test('preserves the selected Yarn process exit code', t => {
  const directory = fixture(t);
  mkdirSync(join(directory, '.yarn/releases'), { recursive: true });
  writeFileSync(join(directory, '.yarn/releases/test-yarn.cjs'), 'process.exitCode = 7;\n');
  writeFileSync(join(directory, '.yarnrc.yml'), 'yarnPath: ".yarn/releases/test-yarn.cjs" # checked in release\n');

  const result = spawnSync(process.execPath, [launcher, 'test:all'], { cwd: directory, encoding: 'utf8' });

  assert.equal(result.status, 7);
});

test('reports a missing configured Yarn release without attempting another version', t => {
  const directory = fixture(t);
  writeFileSync(join(directory, '.yarnrc.yml'), 'yarnPath: .yarn/releases/missing.cjs\n');

  const result = spawnSync(process.execPath, [launcher, '--version'], { cwd: directory, encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /configured Yarn release.*missing\.cjs/i);
});

test('the repository launcher executes its configured Yarn release', () => {
  const result = spawnSync(process.execPath, [launcher, '--version'], { cwd: root, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});
