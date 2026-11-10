import '@angular/compiler';
import assert from 'node:assert/strict';
import { RpxTranslationService, RpxTranslationConfig } from '@hmcts/rpx-xui-core-lib/i18n';
const legacyName = 'rpx-xui-translation';
const legacy = await import(legacyName);
assert.equal(legacy.RpxTranslationService, RpxTranslationService, 'Published legacy service must forward canonical class identity');
assert.equal(legacy.RpxTranslationConfig, RpxTranslationConfig, 'Published legacy config must forward canonical token identity');
