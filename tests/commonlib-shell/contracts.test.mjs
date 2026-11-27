import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');

async function read(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

test('main wrapper has an independent public entry and preserves its CommonLib inputs and output', async () => {
  const [entry, implementation, template, module, packageConfig] = await Promise.all([
    read('projects/core-lib/ui/hmcts-main-wrapper/public-api.ts'),
    read('projects/core-lib/ui/hmcts-main-wrapper/hmcts-main-wrapper.component.ts'),
    read('projects/core-lib/ui/hmcts-main-wrapper/hmcts-main-wrapper.component.html'),
    read('projects/core-lib/ui/hmcts-main-wrapper/hmcts-main-wrapper.module.ts'),
    read('projects/core-lib/ng-package.json'),
  ]);

  for (const symbol of ['HmctsMainWrapperComponent', 'HmctsMainWrapperModule', 'HmctsBannerInfo']) {
    assert.match(entry, new RegExp(`\\b${symbol}\\b`), `The wrapper public entry must export ${symbol}`);
  }
  for (const input of ['backLink', 'title', 'summaryErrors', 'banner', 'actionButtons', 'showWarningMessage']) {
    assert.match(implementation, new RegExp(`@Input\\(\\) public (?:set )?${input}\\b`), `Missing public input ${input}`);
  }
  assert.match(implementation, /selector:\s*'xuilib-hmcts-main-wrapper'/);
  assert.match(implementation, /@Output\(\) public backEvent = new EventEmitter<void>\(\)/);
  assert.match(implementation, /isFromValid/);
  assert.match(template, /<ng-content><\/ng-content>/);
  assert.match(module, /HmctsErrorSummaryModule/);
  assert.match(module, /BannerModule/);
  assert.match(packageConfig, /ui\/hmcts-main-wrapper/);
});
test('primary navigation has a separate public entry and preserves the CommonLib contract', async () => {
  const [entry, implementation, template, module, packageConfig] = await Promise.all([
    read('projects/core-lib/ui/hmcts-primary-navigation/public-api.ts'),
    read('projects/core-lib/ui/hmcts-primary-navigation/hmcts-primary-navigation.component.ts'),
    read('projects/core-lib/ui/hmcts-primary-navigation/hmcts-primary-navigation.component.html'),
    read('projects/core-lib/ui/hmcts-primary-navigation/hmcts-primary-navigation.module.ts'),
    read('projects/core-lib/ng-package.json'),
  ]);

  for (const symbol of ['HmctsPrimaryNavigationComponent', 'HmctsPrimaryNavigationModule']) {
    assert.match(entry, new RegExp(`\\b${symbol}\\b`), `The navigation public entry must export ${symbol}`);
  }
  assert.match(implementation, /selector:\s*'xuilib-hmcts-primary-navigation'/);
  for (const input of ['userLoggedIn', 'label', 'items', 'isBrandedHeader']) {
    assert.match(implementation, new RegExp(`@Input\\(\\)(?: public)? (?:set )?${input}\\b`), `Missing public input ${input}`);
  }
  assert.match(template, /\[routerLink\]="item\.href"/);
  assert.match(template, /\[innerHTML\]="item\.text \| rpxTranslate"/);
  assert.match(module, /RouterModule/);
  assert.match(module, /RpxTranslationModule/);
  assert.match(packageConfig, /ui\/hmcts-primary-navigation/);
});
