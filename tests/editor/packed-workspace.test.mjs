import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readlink, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { preparePackedWorkspace } from './packed-workspace.mjs';

test('isolates the packed package and removes its source aliases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'packed-workspace-test-'));
  let workspace;
  try {
    for (const dir of ['projects', 'tests/editor', 'node_modules/@hmcts/rpx-xui-core-lib', 'node_modules/@hmcts/media-viewer', 'node_modules/example']) await mkdir(join(root, dir), { recursive: true });
    await mkdir(join(root, 'projects/core-lib'), { recursive: true });
    await writeFile(join(root, 'projects/core-lib/package.json'), JSON.stringify({ name: '@hmcts/rpx-xui-core-lib', exports: { './node': './node.js' } }));
    for (const file of ['angular.json', 'package.json', 'tsconfig.json']) await writeFile(join(root, file), '{}');
    const paths = { '@hmcts/rpx-xui-core-lib/case/notifier': ['source'], '@hmcts/rpx-xui-core-lib/case/editor-source': ['source'], '@hmcts/rpx-xui-core-lib/i18n': ['i18n'], '@hmcts/rpx-xui-core-lib/browser/session-storage': ['source'], '@hmcts/rpx-xui-core-lib/case/models': ['source'], '@hmcts/rpx-xui-core-lib/case/reference': ['source'], '@hmcts/rpx-xui-core-lib/case/editor-date': ['source'] };
    await writeFile(join(root, 'tests/editor/tsconfig.json'), JSON.stringify({ compilerOptions: { paths } }));
    workspace = await preparePackedWorkspace(root);
    const config = JSON.parse(await readFile(join(workspace, 'tests/editor/tsconfig.json'), 'utf8'));
    assert.deepEqual(config.compilerOptions.paths, {});
    assert.deepEqual(JSON.parse(await readFile(join(root, 'tests/editor/tsconfig.json'), 'utf8')).compilerOptions.paths, paths);
    assert.equal(JSON.parse(await readFile(join(root, 'projects/core-lib/package.json'), 'utf8')).name, '@hmcts/rpx-xui-core-lib');
    assert.equal(await readlink(join(workspace, 'node_modules/@hmcts/media-viewer')), join(root, 'node_modules/@hmcts/media-viewer'));
    await assert.rejects(readlink(join(workspace, 'node_modules/@hmcts/rpx-xui-core-lib')), { code: 'ENOENT' });
    const installed = join(workspace, 'node_modules/@hmcts/rpx-xui-core-lib');
    await mkdir(installed);
    await writeFile(join(installed, 'package.json'), JSON.stringify({ name: '@hmcts/rpx-xui-core-lib', exports: { './case/notifier': './notifier.js' } }));
    await writeFile(join(installed, 'notifier.js'), '');
    const probe = join(workspace, 'projects/core-lib/probe.cjs');
    await writeFile(probe, "process.stdout.write(require.resolve('@hmcts/rpx-xui-core-lib/case/notifier'))");
    const result = spawnSync(process.execPath, [probe], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, await realpath(join(installed, 'notifier.js')));
  } finally {
    if (workspace) await rm(workspace, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});
