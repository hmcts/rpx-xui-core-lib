import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getUserSessionTimeout } from '../../projects/core-lib/node';

const first = { pattern: 'manager', idleModalDisplayTime: 2, totalIdleTime: 10 };
const second = { pattern: 'admin', idleModalDisplayTime: 4, totalIdleTime: 20 };

test('getUserSessionTimeout matches configuration order and sorts roles in place', () => {
  const roles = ['admin', 'manager', 'account'];
  assert.equal(getUserSessionTimeout(roles, [first, second]), first);
  assert.deepEqual(roles, ['account', 'admin', 'manager']);
  assert.equal(getUserSessionTimeout(['admin'], [first, second]), second);
  const wildcard = { ...second, pattern: '.' };
  assert.equal(getUserSessionTimeout(['other'], [first, wildcard]), wildcard);
  const unicodeRoles = ['é', 'a', '😀', 'Z', '\uE000', 'A', 'z', 'a'];
  const legacyOrder = [...unicodeRoles].sort();
  getUserSessionTimeout(unicodeRoles, []);
  assert.deepEqual(unicodeRoles, legacyOrder);
  assert.deepEqual(unicodeRoles, ['A', 'Z', 'a', 'a', 'z', 'é', '😀', '\uE000']);
  const mixed = [2, 10, '3', null, undefined] as unknown as string[];
  const legacyMixed = [...mixed].sort();
  getUserSessionTimeout(mixed, []);
  assert.deepEqual(mixed, legacyMixed);
  const invalidRoles = [Symbol('role'), 'x'] as unknown as string[];
  assert.throws(() => getUserSessionTimeout(invalidRoles, []), TypeError);
});

test('getUserSessionTimeout returns the same mutable fallback for unmatched and empty roles', () => {
  const fallback = getUserSessionTimeout(['other'], [first]);
  assert.deepEqual(fallback, {
    idleModalDisplayTime: 10,
    pattern: 'ERROR: NO-SESSION_TIMEOUT_SET. You need to set a DEFAULT Session Timeout for this application through' +
      'the configuration file. ie. use the pattern \".\", @see unit tests. The totalIdleTime will be set to a low value.',
    totalIdleTime: 480,
  });
  const previous = fallback.totalIdleTime;
  try {
    fallback.totalIdleTime = 123;
    assert.equal(getUserSessionTimeout([], [first]), fallback);
    assert.equal(getUserSessionTimeout(['other'], [first]).totalIdleTime, 123);
  } finally {
    fallback.totalIdleTime = previous;
  }
});

test('getUserSessionTimeout throws for an invalid pattern only when there are roles to examine', () => {
  const invalid = { ...first, pattern: '[' };
  assert.throws(() => getUserSessionTimeout(['manager'], [invalid]), SyntaxError);
  assert.doesNotThrow(() => getUserSessionTimeout([], [invalid]));
});

test('getUserSessionTimeout throws on missing roles or configuration', () => {
  assert.throws(() => getUserSessionTimeout(undefined as unknown as string[], []), TypeError);
  assert.throws(() => getUserSessionTimeout([], undefined as unknown as typeof first[]), TypeError);
});
