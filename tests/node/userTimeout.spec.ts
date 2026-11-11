import { getUserSessionTimeout } from '../../projects/core-lib/node';

describe('getUserSessionTimeout', () => {
  const first = { pattern: 'manager', idleModalDisplayTime: 2, totalIdleTime: 10 };
  const second = { pattern: 'admin', idleModalDisplayTime: 4, totalIdleTime: 20 };

  test('matches configuration order and sorts roles in place', () => {
    const roles = ['admin', 'manager', 'account'];
    expect(getUserSessionTimeout(roles, [first, second])).toBe(first);
    expect(roles).toEqual(['account', 'admin', 'manager']);
    expect(getUserSessionTimeout(['admin'], [first, second])).toBe(second);
    const wildcard = { ...second, pattern: '.' };
    expect(getUserSessionTimeout(['other'], [first, wildcard])).toBe(wildcard);
  });

  test('returns the same mutable fallback for unmatched and empty roles', () => {
    const fallback = getUserSessionTimeout(['other'], [first]);
    expect(fallback).toEqual({
      idleModalDisplayTime: 10,
      pattern: 'ERROR: NO-SESSION_TIMEOUT_SET. You need to set a DEFAULT Session Timeout for this application through' +
        'the configuration file. ie. use the pattern \".\", @see unit tests. The totalIdleTime will be set to a low value.',
      totalIdleTime: 480,
    });
    const previous = fallback.totalIdleTime;
    try {
      fallback.totalIdleTime = 123;
      expect(getUserSessionTimeout([], [first])).toBe(fallback);
      expect(getUserSessionTimeout(['other'], [first]).totalIdleTime).toBe(123);
    } finally {
      fallback.totalIdleTime = previous;
    }
  });

  test('throws for an invalid pattern only when there are roles to examine', () => {
    const invalid = { ...first, pattern: '[' };
    expect(() => getUserSessionTimeout(['manager'], [invalid])).toThrow(SyntaxError);
    expect(() => getUserSessionTimeout([], [invalid])).not.toThrow();
  });

  test('throws on missing roles or configuration', () => {
    expect(() => getUserSessionTimeout(undefined as unknown as string[], [])).toThrow(TypeError);
    expect(() => getUserSessionTimeout([], undefined as unknown as typeof first[])).toThrow(TypeError);
  });
});
