import assert from 'node:assert/strict';
const entry = await import('@hmcts/rpx-xui-core-lib/terms/models');
assert.deepEqual(Object.keys(entry), []);
