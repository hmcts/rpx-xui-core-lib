import test from 'node:test';
import assert from 'node:assert/strict';
import { findForbiddenExternalImports } from './entry-graph-contract.mjs';

const nodeOnlyPackages = ['express', 'express-session', 'passport'];
const unrelatedPackages = ['ngx-editor', 'prosemirror-model', '@hmcts/media-viewer', '@hmcts/ccpay-web-component'];

test('rejects Node-only package names and their subpaths as bare externals', () => {
  assert.deepEqual(
    findForbiddenExternalImports(['@angular/core', 'express', 'express-session/store'], nodeOnlyPackages, unrelatedPackages),
    ['express', 'express-session/store'],
  );
});

test('rejects Node built-in module imports from browser entries', () => {
  assert.deepEqual(
    findForbiddenExternalImports(['@angular/core', 'node:fs/promises', 'fs'], nodeOnlyPackages, unrelatedPackages),
    ['node:fs/promises', 'fs'],
  );
});

test('rejects unrelated editor and application package imports', () => {
  assert.deepEqual(
    findForbiddenExternalImports(['@angular/core', '@hmcts/media-viewer/player'], nodeOnlyPackages, unrelatedPackages),
    ['@hmcts/media-viewer/player'],
  );
});

test('does not reject similarly prefixed but distinct packages', () => {
  assert.deepEqual(
    findForbiddenExternalImports(['expressive-utils', '@hmcts/ccpay-web-component-extra'], nodeOnlyPackages, unrelatedPackages),
    [],
  );
});
