import { ngPackagr } from 'ng-packagr';
import { copyFile, mkdir, symlink, realpath } from 'node:fs/promises';

const packager = ngPackagr()
  .forProject('projects/core-lib/ng-package.json')
  .withTsConfig('projects/core-lib/tsconfig.lib.json');

async function stage() {
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
