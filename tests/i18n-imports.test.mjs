import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingSpecImports } from './i18n/spec-imports.mjs';

const files = ['future.spec.ts'];
test('side-effect spec imports are actual declarations, not comments or strings', () => {
  assert.deepEqual(missingSpecImports("import './future.spec';", files), []);
  assert.deepEqual(missingSpecImports('import "./future.spec";', files), []);
  for (const entry of ["// TODO import './future.spec';", "/* import './future.spec'; */", 'const text = "import \'./future.spec\';";', "import type { X } from './future.spec';", "import { unused } from './future.spec';"]) {
    assert.deepEqual(missingSpecImports(entry, files), files);
  }
});
test('all new spec files need imports and path separators are normalized', () => {
  assert.deepEqual(missingSpecImports("import './existing.spec';", ['existing.spec.ts', 'future.spec.ts', 'helper.ts']), files);
  assert.deepEqual(missingSpecImports("import './nested/future.spec';", ['nested\\future.spec.ts']), []);
});
