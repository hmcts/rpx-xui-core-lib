import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const packageRoot = new URL('../../dist/core-lib/', import.meta.url);

test('the built editor-source package exposes the migrated case viewer API', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', packageRoot), 'utf8'));
  assert.deepEqual(manifest.exports['./case/editor-source'], {
    types: './case/editor-source/index.d.ts',
    default: './fesm2022/hmcts-rpx-xui-core-lib-case-editor-source.mjs'
  });

  const declaration = await readFile(new URL('case/editor-source/index.d.ts', packageRoot), 'utf8');
  for (const symbol of ['CaseViewerModule', 'CaseViewerComponent', 'CaseViewComponent', 'CaseResolver', 'EventTriggerResolver', 'viewerRouting']) {
    assert.match(declaration, new RegExp(`\\b${symbol}\\b`), `The public viewer entry must expose ${symbol}`);
  }

  const implementation = await readFile(new URL('fesm2022/hmcts-rpx-xui-core-lib-case-editor-source.mjs', packageRoot), 'utf8');
  assert.match(implementation, /CaseViewerModule/);
});
