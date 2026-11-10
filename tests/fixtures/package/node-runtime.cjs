const assert = require('node:assert/strict');
const { arrayPatternMatch, isStringPatternMatch } = require('@hmcts/rpx-xui-core-lib/node');
assert.equal(isStringPatternMatch('pui-user-manager', '^pui-'), true);
assert.equal(arrayPatternMatch(['pui-user-manager'], 'user-manager'), true);
assert.equal(arrayPatternMatch([], '['), false);
assert.throws(() => isStringPatternMatch('role', '['), SyntaxError);
assert.throws(() => arrayPatternMatch(['role'], '['), SyntaxError);
assert.ok(Object.keys(require.cache).every((path) => !/\/@angular\/|rpx-xui-node-lib|rpx-xui-translation/.test(path)));
console.log('Installed CommonJS Node contract passed without Angular or legacy initialization');
