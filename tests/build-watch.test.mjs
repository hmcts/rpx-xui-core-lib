import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = process.cwd();
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const includes = async (path, text) => {
  try { return (await readFile(path, 'utf8')).includes(text); }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
};

async function until(predicate, message) {
  for (let i = 0; i < 240; i++) {
    if (await predicate()) return;
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${message}`);
}

test('watch rebuilds Node changes, recovers and stops', { timeout: 120_000 }, async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'core-watch-test-'));
  let child;
  let log = '';
  let childError;
  try {
    await mkdir(join(fixture, 'scripts'), { recursive: true });
    await cp(join(root, 'scripts/build.mjs'), join(fixture, 'scripts/build.mjs'));
    for (const file of ['tsconfig.json', 'package.json', 'LICENCE']) await cp(join(root, file), join(fixture, file));
    await cp(join(root, 'projects/core-lib'), join(fixture, 'projects/core-lib'), {
      recursive: true,
      filter: (source) => basename(source) !== 'node_modules',
    });
    await mkdir(join(fixture, 'node_modules/@hmcts'), { recursive: true });
    for (const name of await readdir(join(root, 'node_modules'))) {
      if (name !== '@hmcts') await symlink(resolve(root, 'node_modules', name), join(fixture, 'node_modules', name));
    }
    for (const name of await readdir(join(root, 'node_modules/@hmcts'))) {
      if (name !== 'rpx-xui-core-lib') await symlink(resolve(root, 'node_modules/@hmcts', name), join(fixture, 'node_modules/@hmcts', name));
    }
    await symlink(resolve(root, 'projects/core-lib/node/node_modules'), join(fixture, 'projects/core-lib/node/node_modules'));
    child = spawn(process.execPath, ['scripts/build.mjs', '--watch'], { cwd: fixture, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', (error) => { childError = error; });
    child.stdout.on('data', (chunk) => { log += chunk; });
    child.stderr.on('data', (chunk) => { log += chunk; });
    const countReady = () => (log.match(/Validation diagnostic build ready/g) ?? []).length;
    const untilAlive = (predicate, message) => until(async () => {
      if (childError) throw childError;
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Watcher exited before ${message} (code ${child.exitCode}, signal ${child.signalCode})`);
      return predicate();
    }, message);
    async function settled() {
      let previous;
      do { previous = countReady(); await wait(1000); } while (countReady() !== previous);
    }
    const nodeFile = join(fixture, 'projects/core-lib/node/http.ts');
    const angularFile = join(fixture, 'projects/core-lib/i18n/public-api.ts');
    const output = join(fixture, 'dist/core-lib/node/http.js');
    const angularOutput = join(fixture, 'dist/core-lib/fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs');
    const original = await readFile(nodeFile, 'utf8');
    const angularOriginal = await readFile(angularFile, 'utf8');
    await untilAlive(() => countReady() >= 1, 'initial build');
    await writeFile(nodeFile, `${original}\nexport const WATCH_TEST = true;\n`);
    await untilAlive(() => includes(output, 'WATCH_TEST'), 'Node rebuild');
    const util = join(fixture, 'projects/core-lib/node/util');
    await rename(util, `${util}-renamed`);
    await untilAlive(() => log.includes('Node library compilation failed'), 'directory rename compilation failure');
    const beforeRestore = countReady();
    await rename(`${util}-renamed`, util);
    await untilAlive(() => countReady() > beforeRestore, 'directory restore rebuild');
    await settled();
    const added = join(fixture, 'projects/core-lib/node/test-directory');
    const beforeAdd = countReady();
    await mkdir(added);
    await untilAlive(() => countReady() > beforeAdd, 'directory creation rebuild');
    await settled();
    const beforeRemove = countReady();
    await rm(added, { recursive: true });
    await untilAlive(() => countReady() > beforeRemove, 'directory removal rebuild');
    for (let i = 0; i < 3; i++) {
      await writeFile(nodeFile, `${original}\nexport const WATCH_FINAL_${i} = true;\n`);
      await writeFile(angularFile, `${angularOriginal}\nexport const WATCH_ANGULAR_${i} = 'watch-angular-${i}';\n`);
    }
    await untilAlive(async () => await includes(output, 'WATCH_FINAL_2') && await includes(angularOutput, 'watch-angular-2') && log.lastIndexOf('Validation diagnostic build ready') > log.lastIndexOf('Built Angular Package'), 'final Angular and Node builds');
    await settled();
    assert.ok(await includes(output, 'WATCH_FINAL_2'));
    assert.ok(await includes(angularOutput, 'watch-angular-2'));
    child.kill('SIGTERM');
    const [code, signal] = await new Promise((resolvePromise) => child.once('exit', (...args) => resolvePromise(args)));
    assert.equal(signal, null);
    assert.equal(code, 0);
    child = undefined;
    const previousReady = countReady();
    child = spawn(process.execPath, ['scripts/build.mjs', '--watch'], { cwd: fixture, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', (error) => { childError = error; });
    child.stdout.on('data', (chunk) => { log += chunk; });
    child.stderr.on('data', (chunk) => { log += chunk; });
    await untilAlive(() => countReady() > previousReady, 'second watcher startup');
    const stopped = new Promise((resolvePromise) => child.once('exit', (...args) => resolvePromise(args)));
    await rename(join(fixture, 'projects/core-lib/node'), join(fixture, 'projects/core-lib/node-removed'));
    let timeout;
    const fatalExit = await Promise.race([stopped, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Watcher did not stop after source root removal')), 10_000); })]).finally(() => clearTimeout(timeout));
    assert.equal(fatalExit[0], 1);
    child = undefined;
  } catch (error) {
    error.message += `\nWatcher output:\n${log.slice(-8000)}`;
    throw error;
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await new Promise((resolvePromise) => child.once('exit', resolvePromise));
    }
    await rm(fixture, { recursive: true, force: true });
  }
});
