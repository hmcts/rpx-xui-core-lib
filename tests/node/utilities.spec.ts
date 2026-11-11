import { hasKey, sortArray } from '../../projects/core-lib/node';

test('hasKey includes inherited keys and rejects absent keys', () => {
  const value = Object.assign(Object.create({ inherited: 1 }) as Record<string, unknown>, { own: undefined });
  expect(hasKey(value, 'own')).toBe(true);
  expect(hasKey(value, 'inherited')).toBe(true);
  expect(hasKey(value, 'missing')).toBe(false);
});

test('sortArray returns the same array sorted in place', () => {
  const cases = [
    { input: [], expected: [] },
    { input: ['z', 'A', 'a', '10', '2'], expected: ['10', '2', 'A', 'a', 'z'] },
    { input: ['', 'é', 'e', '😀', '\ud800', '\udfff', '😀', 'a\u0301'], expected: ['', 'a\u0301', 'e', 'é', '\ud800', '😀', '😀', '\udfff'] },
  ];
  for (const { input, expected } of cases) {
    const value = [...input];
    expect(sortArray(value)).toBe(value);
    expect(value).toEqual(expected);
  }
  const numbers = [2, 10] as unknown as string[];
  expect(sortArray(numbers)).toBe(numbers);
  expect(numbers).toEqual([10, 2]);
  const sparse = ['z', , undefined, 'a'] as unknown as string[];
  sortArray(sparse);
  expect(sparse).toStrictEqual(['a', 'z', undefined, ,]);
  expect(() => sortArray([Symbol('x'), 'a'] as unknown as string[])).toThrow(TypeError);
});
