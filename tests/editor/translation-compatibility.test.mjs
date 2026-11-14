import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RpxTranslationModule as CoreModule, RpxTranslationService as CoreService } from '@hmcts/rpx-xui-core-lib/i18n';
import { RpxTranslationModule as LegacyModule, RpxTranslationService as LegacyService } from 'rpx-xui-translation';

test('legacy translation module resolves to the Core module identity', () => {
  assert.equal(LegacyModule, CoreModule, 'Legacy consumers must use the Core translation module identity');
});

test('legacy translation service resolves to the Core service identity', () => {
  assert.equal(LegacyService, CoreService, 'Legacy consumers must use the Core translation service identity');
});
