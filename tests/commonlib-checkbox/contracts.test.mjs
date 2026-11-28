import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const read = relativePath => readFile(resolve(root, relativePath), 'utf8');

test('single checkbox has an independent entry and preserves its CommonLib form contract', async () => {
  const [entry, implementation, template, module, packageConfig] = await Promise.all([
    read('projects/core-lib/ui/gov-checkbox/public-api.ts'),
    read('projects/core-lib/ui/gov-checkbox/gov-uk-checkbox.component.ts'),
    read('projects/core-lib/ui/gov-checkbox/gov-uk-checkbox.component.html'),
    read('projects/core-lib/ui/gov-checkbox/gov-checkbox.module.ts'),
    read('projects/core-lib/ng-package.json'),
  ]);

  assert.match(entry, /GovUkCheckboxComponent/);
  assert.match(entry, /GovCheckboxModule/);
  assert.match(implementation, /selector:\s*'xuilib-gov-checkbox'/);
  for (const input of ['group', 'config', 'isChecked']) {
    assert.match(implementation, new RegExp(`@Input\\(\\) public ${input}\\b`), `Missing public input ${input}`);
  }
  assert.match(implementation, /config\.focusOn\s*\?\s*this\.config\.focusOn\s*:\s*this\.config\.value/);
  assert.match(template, /\[formControlName\]="config\.value"/);
  assert.match(template, /\[checked\]="isChecked"/);
  assert.match(template, /\[attr\.aria-describedby\]/);
  assert.match(template, /config\.hint \| rpxTranslate/);
  assert.match(module, /GovInputModule/);
  assert.match(module, /FormGroupModule/);
  assert.match(packageConfig, /ui\/gov-checkbox/);
});

test('Invitation preserves the checkbox public API by re-exporting the shared class', async () => {
  const [module, entry] = await Promise.all([
    read('projects/core-lib/ui/invitation/invitation.module.ts'),
    read('projects/core-lib/ui/invitation/public-api.ts'),
  ]);
  assert.match(module, /GovCheckboxModule/);
  assert.match(module, /GovUkCheckboxComponent/);
  assert.doesNotMatch(module, /declarations:\s*\[[^\]]*GovUkCheckboxComponent/);
  assert.match(entry, /GovUkCheckboxComponent.*ui\/gov-checkbox/);
  await assert.rejects(read('projects/core-lib/ui/invitation/gov-uk-checkbox.component.ts'), { code: 'ENOENT' });
});
