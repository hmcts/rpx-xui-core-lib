import '@angular/compiler';
import assert from 'node:assert/strict';
import * as canonical from '@hmcts/rpx-xui-core-lib/i18n';
// The staged facade exists only inside the clean installed consumer.
const legacyPackage = 'rpx-xui-translation';
const facade = await import(legacyPackage);

assert.deepEqual(Object.keys(facade), Object.keys(canonical));
for (const name of ['RpxTranslationService', 'RpxTranslationConfig', 'RpxTranslationModule', 'RpxTranslatePipe', 'YesOrNoValue']) {
  assert.equal(typeof canonical[name], name === 'YesOrNoValue' ? 'object' : 'function');
  assert.equal(facade[name], canonical[name], `${name} must retain canonical identity`);
}
const config = new canonical.RpxTranslationConfig();
config.baseUrl = '/translations';
config.validity = { days: 1 };
const root = facade.RpxTranslationModule.forRoot(config);
assert.equal(root.ngModule, canonical.RpxTranslationModule);
assert.equal(root.providers[0].provide, canonical.RpxTranslationConfig);
assert.equal(root.providers[0].useValue, config);
assert.equal(root.providers[1], canonical.RpxTranslationService);
assert.equal(facade.RpxTranslationModule.forChild().providers, undefined);
console.log('Staged reexport fixture preserves canonical class and provider identities');
