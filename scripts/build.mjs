import { spawnSync } from 'node:child_process';
import { ngPackagr } from 'ng-packagr';
import { copyFile, mkdir, symlink, realpath, writeFile } from 'node:fs/promises';

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
  const subscription = packager.watch().subscribe({
    next: () => { stage().catch((error) => { console.error(error); process.exitCode = 1; }); },
    error: (error) => { console.error(error); process.exitCode = 1; },
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { subscription.unsubscribe(); process.exit(); });
  }
} else {
  await packager.build();
  await stage();
}
