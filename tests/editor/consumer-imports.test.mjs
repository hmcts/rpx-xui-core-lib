import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toolkitImports } from './consumer-imports.mjs';

test('collects original named and type imports without matching comments or other packages', () => {
  const source = `// import { Fake } from '@hmcts/ccd-case-ui-toolkit';
    import { CaseNotifier as Notifier, type CaseView } from '@hmcts/ccd-case-ui-toolkit';
    import type { CaseField } from '@hmcts/ccd-case-ui-toolkit';
    import { Ignore } from 'another-package';`;
  assert.deepEqual(toolkitImports(source), { names: ['CaseField', 'CaseNotifier', 'CaseView'], unsupported: [] });
});

test('reports unsupported namespace, deep, dynamic, side-effect and re-export forms', () => {
  const source = `import * as toolkit from '@hmcts/ccd-case-ui-toolkit';
    import '@hmcts/ccd-case-ui-toolkit';
    import { thing } from '@hmcts/ccd-case-ui-toolkit/internal';
    export { CaseView } from '@hmcts/ccd-case-ui-toolkit';
    const module = import('@hmcts/ccd-case-ui-toolkit');
    type Toolkit = typeof import('@hmcts/ccd-case-ui-toolkit');`;
  assert.deepEqual(toolkitImports(source), {
    names: [],
    unsupported: ['deep import', 'dynamic import', 'namespace import', 're-export', 'side-effect import', 'type import']
  });
});

test('orders imported names consistently by code unit', () => {
  const source = "import { Éclair, alpha, Zeta } from '@hmcts/ccd-case-ui-toolkit';";
  assert.deepEqual(toolkitImports(source).names, ['Zeta', 'alpha', 'Éclair']);
});
