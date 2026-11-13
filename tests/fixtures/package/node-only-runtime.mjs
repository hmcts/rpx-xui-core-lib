import assert from 'node:assert/strict';
import { arrayPatternMatch } from '@hmcts/rpx-xui-core-lib/node';
import { http } from '@hmcts/rpx-xui-core-lib/node/http';

assert.equal(typeof arrayPatternMatch, 'function');
assert.equal(typeof http.get, 'function');
