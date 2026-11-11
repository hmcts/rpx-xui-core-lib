import { hasKey, sortArray } from '../../projects/core-lib/node';

test('hasKey includes inherited keys and rejects absent keys', () => {
  const value = Object.assign(Object.create({ inherited: 1 }) as Record<string, unknown>, { own: undefined });
  expect(hasKey(value, 'own')).toBe(true);
  expect(hasKey(value, 'inherited')).toBe(true);
  expect(hasKey(value, 'missing')).toBe(false);
});

test('sortArray returns the same array sorted in place', () => {
  const value = ['z', 'A', 'a', '10', '2'];
  expect(sortArray(value)).toBe(value);
  expect(value).toEqual(['10', '2', 'A', 'a', 'z']);
});
