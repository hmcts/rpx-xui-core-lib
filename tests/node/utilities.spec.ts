import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { hasKey, sortArray } from '../../projects/core-lib/node';

test('hasKey includes inherited keys and rejects absent keys', () => {
  const value = Object.assign(Object.create({ inherited: 1 }) as Record<string, unknown>, { own: undefined });
  assert.equal(hasKey(value, 'own'), true);
  assert.equal(hasKey(value, 'inherited'), true);
  assert.equal(hasKey(value, 'missing'), false);
});

test('sortArray returns the same array sorted in place', () => {
  const cases = [
    { input: [], expected: [] },
    { input: ['z', 'A', 'a', '10', '2'], expected: ['10', '2', 'A', 'a', 'z'] },
    { input: ['', 'é', 'e', '😀', '\ud800', '\udfff', '😀', 'a\u0301'], expected: ['', 'a\u0301', 'e', 'é', '\ud800', '😀', '😀', '\udfff'] },
  ];
  for (const { input, expected } of cases) {
    const value = [...input];
    assert.equal(sortArray(value), value);
    assert.deepEqual(value, expected);
  }
  const numbers = [2, 10] as unknown as string[];
  assert.equal(sortArray(numbers), numbers);
  assert.deepEqual(numbers, [10, 2]);
  const sparse = ['z', , undefined, 'a'] as unknown as string[];
  sortArray(sparse);
  assert.deepEqual(sparse, ['a', 'z', undefined, ,]);
  assert.throws(() => sortArray([Symbol('x'), 'a'] as unknown as string[]), TypeError);
});
