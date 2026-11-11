import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { arrayPatternMatch, isStringPatternMatch } from '../../projects/core-lib/node'

test('empty roles do not match, including an invalid unused pattern', () => {
    assert.equal(arrayPatternMatch([], '.'), false);
    assert.equal(arrayPatternMatch([], '['), false);
})

test('invalid patterns throw SyntaxError for a string or nonempty roles', () => {
    assert.throws(() => isStringPatternMatch('role', '['), SyntaxError);
    assert.throws(() => arrayPatternMatch(['role'], '['), SyntaxError);
})
