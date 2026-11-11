import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { arrayPatternMatch } from '../../projects/core-lib/node';

const roles = ['pui-organisation-manager', 'pui-user-manager', 'pui-finance-manager'];
for (const [pattern, expected] of [['user-manager', true], ['.', true], ['dwp', false]] as const) {
  test(`arrayPatternMatch() matches [${roles.map((role) => JSON.stringify(role)).join(', ')}] to ${pattern} expecting ${expected}`, () => {
    assert.equal(arrayPatternMatch(roles, pattern), expected);
  });
}
