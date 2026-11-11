import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isStringPatternMatch } from '../../projects/core-lib/node';

for (const [role, pattern, expected] of [
  ['pui-case-manager', 'case-', true],
  ['pui-case-manager', 'pui', true],
  ['pui-case-manager', 'dwp-', false],
  ['pui', '.', true],
] as const) {
  test(`isRoleMatch() matches ${role} to ${pattern}`, () => {
    assert.equal(isStringPatternMatch(role, pattern), expected);
  });
}
