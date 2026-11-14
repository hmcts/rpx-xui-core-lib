import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { preparePackedWorkspace } from './packed-workspace.mjs';

test('isolates the packed package and removes its source aliases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'packed-workspace-test-'));
  let workspace;
  try {
    for (const dir of ['projects', 'tests/editor', 'node_modules/@hmcts/rpx-xui-core-lib', 'node_modules/@hmcts/media-viewer', 'node_modules/example']) await mkdir(join(root, dir), { recursive: true });
    for (const file of ['angular.json', 'package.json', 'tsconfig.json']) await writeFile(join(root, file), '{}');
    const paths = { '@hmcts/rpx-xui-core-lib/case/notifier': ['source'], '@hmcts/rpx-xui-core-lib/case/editor-source': ['source'], '@hmcts/rpx-xui-core-lib/i18n': ['i18n'], '@hmcts/rpx-xui-core-lib/browser/session-storage': ['source'], '@hmcts/rpx-xui-core-lib/case/models': ['source'], '@hmcts/rpx-xui-core-lib/case/reference': ['source'], '@hmcts/rpx-xui-core-lib/case/editor-date': ['source'] };
    await writeFile(join(root, 'tests/editor/tsconfig.json'), JSON.stringify({ compilerOptions: { paths } }));
    workspace = await preparePackedWorkspace(root);
    const config = JSON.parse(await readFile(join(workspace, 'tests/editor/tsconfig.json'), 'utf8'));
    assert.deepEqual(config.compilerOptions.paths, {});
    assert.deepEqual(JSON.parse(await readFile(join(root, 'tests/editor/tsconfig.json'), 'utf8')).compilerOptions.paths, paths);
    assert.equal(await readlink(join(workspace, 'node_modules/@hmcts/media-viewer')), join(root, 'node_modules/@hmcts/media-viewer'));
    await assert.rejects(readlink(join(workspace, 'node_modules/@hmcts/rpx-xui-core-lib')), { code: 'ENOENT' });
  } finally {
    if (workspace) await rm(workspace, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});
