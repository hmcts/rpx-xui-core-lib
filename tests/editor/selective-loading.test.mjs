import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { probeLoading } from './selective-loading-lib.mjs';

test('follows Core secondary entries and detects transitive heavy imports', async () => {
  const root = await mkdtemp(join(tmpdir(), 'editor-loading-test-'));
  try {
    await mkdir(join(root, 'fesm2022'));
    await writeFile(join(root, 'package.json'), JSON.stringify({ exports: { './child': { default: './fesm2022/child.mjs' } } }));
    await writeFile(join(root, 'fesm2022/entry.mjs'), "export { entry } from '@hmcts/rpx-xui-core-lib/child';\n");
    await writeFile(join(root, 'fesm2022/child.mjs'), "import { viewer } from '@hmcts/media-viewer/subpath'; export const entry = viewer;\n");
    const result = await probeLoading(root, 'fesm2022/entry.mjs', 'entry');
    assert.equal(result.mediaViewer, true);
    assert.equal(result.payment, false);
    await writeFile(join(root, 'fesm2022/entry.mjs'), "export { entry } from '@hmcts/rpx-xui-core-lib/missing';\n");
    await assert.rejects(probeLoading(root, 'fesm2022/entry.mjs', 'entry'), /Unknown Core entry/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
