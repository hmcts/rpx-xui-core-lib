import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingSpecImports } from './spec-imports.mjs';

test('requires named and side-effect spec imports without accepting commented text', () => {
  const entry = `import { registered } from './one.spec';\nimport './nested/two.spec';\n// import './missing.spec';`;
  assert.deepEqual(missingSpecImports(entry, ['one.spec.ts', 'nested/two.spec.ts', 'missing.spec.ts']), ['missing.spec.ts']);
});
