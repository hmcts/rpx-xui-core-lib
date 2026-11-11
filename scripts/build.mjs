import { spawnSync } from 'node:child_process';
import { ngPackagr } from 'ng-packagr';
import { copyFile, mkdir, symlink, realpath, writeFile } from 'node:fs/promises';
import { readdirSync, watch } from 'node:fs';
import { join } from 'node:path';

const packager = ngPackagr()
  .forProject('projects/core-lib/ng-package.json')
  .withTsConfig('projects/core-lib/tsconfig.lib.json');

async function stage() {
  const nodeBuild = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'projects/core-lib/node/tsconfig.json'], { stdio: 'inherit' });
  if (nodeBuild.status !== 0) throw new Error('Node library compilation failed');
  const nodeModulesLink = 'dist/core-lib/node/node_modules';
  try {
    await symlink('../../../projects/core-lib/node/node_modules', nodeModulesLink, 'dir');
  } catch (error) {
    if (error.code !== 'EEXIST' || await realpath(nodeModulesLink) !== await realpath('projects/core-lib/node/node_modules')) throw error;
  }
  await writeFile('dist/core-lib/node/package.json', '{\"type\":\"commonjs\"}\n');
  await copyFile('LICENCE', 'dist/core-lib/LICENCE');
  await mkdir('node_modules/@hmcts', { recursive: true });
  const link = 'node_modules/@hmcts/rpx-xui-core-lib';
  try {
    await symlink('../../dist/core-lib', link, 'dir');
  } catch (error) {
    if (error.code !== 'EEXIST' || await realpath(link) !== await realpath('dist/core-lib')) throw error;
  }
  console.log('Validation diagnostic build ready');
}

if (process.argv.includes('--watch')) {
  let ready = false;
  let running = false;
  let pending = false;
  let stopping = false;
  async function requestStage() {
    pending = true;
    if (!ready || running || stopping) return;
    running = true;
    while (pending && !stopping) {
      pending = false;
      try {
        await stage();
        if (!stopping) process.exitCode = 0;
      } catch (error) {
        console.error(error);
        process.exitCode = 1;
      }
    }
    running = false;
  }
  const nodeWatchers = new Map();
  let subscription;
  let parentWatcher;
  function fail(error) {
    console.error(error);
    stopping = true;
    closeWatchers();
    subscription?.unsubscribe();
    process.exitCode = 1;
  }
  function watchDirectory(directory) {
    if (nodeWatchers.has(directory)) return;
    const watcher = watch(directory, (event, filename) => {
      if (event === 'rename') {
        try { refreshWatchers(); } catch (error) { fail(error); return; }
      }
      if (!filename || (event === 'rename' && filename !== 'node_modules') || /\.(?:ts|json)$/.test(filename)) void requestStage();
    });
    watcher.on('error', fail);
    nodeWatchers.set(directory, watcher);
  }
  function closeWatchers() {
    parentWatcher?.close();
    for (const watcher of nodeWatchers.values()) watcher.close();
    nodeWatchers.clear();
  }
  function refreshWatchers() {
    const seen = new Set();
    function visit(directory) {
      try {
        watchDirectory(directory);
        const entries = readdirSync(directory, { withFileTypes: true });
        seen.add(directory);
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'node_modules') visit(join(directory, entry.name));
        }
      } catch (error) {
        if (error.code !== 'ENOENT' || directory === 'projects/core-lib/node') throw error;
      }
    }
    visit('projects/core-lib/node');
    for (const [directory, watcher] of nodeWatchers) {
      if (!seen.has(directory)) { watcher.close(); nodeWatchers.delete(directory); }
    }
  }
  parentWatcher = watch('projects/core-lib', (_event, filename) => {
    if (!filename || filename === 'node') {
      try { refreshWatchers(); } catch (error) { fail(error); }
    }
  });
  parentWatcher.on('error', fail);
  refreshWatchers();
  subscription = packager.watch().subscribe({
    next: () => { ready = true; void requestStage(); },
    error: fail,
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { stopping = true; closeWatchers(); subscription.unsubscribe(); process.exit(); });
  }
} else {
  await packager.build();
  await stage();
}
