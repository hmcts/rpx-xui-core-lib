import { replacePlaceholders, splitPhraseIntoComponents, splitWithLiterals } from '../../../../../projects/core-lib/i18n/lib/helpers/replace-placeholders/replace-placeholders.helper';

describe('replacePlaceholders', () => {
  it('handles literal metacharacter keys, repeated values and empty literals', () => {
    expect(splitWithLiterals('%A+B%/%A+B%/%EMPTY%', {}, { 'A+B': ' x ', EMPTY: '' })).toEqual([
      { value: ' x ', literal: true }, { value: '/', literal: false },
      { value: ' x ', literal: true }, { value: '/', literal: false }, { value: '', literal: true }
    ]);
    expect(splitWithLiterals('%A%B%', { A: 'label' }, { 'A%B': 'literal' })).toEqual([{ value: 'literal', literal: true }]);
    expect(() => splitWithLiterals('%A%', { A: 'label' }, { A: 'secret' })).toThrow();
  });

  it('should replace placeholders with the correct values - example 1', () => {
    const input = 'Hello %FIELDNAME%';
    const replacements = { FIELDNAME: 'John' };
    const expected = 'Hello John';

    const actual = replacePlaceholders(input, replacements);

    expect(actual).toBe(expected);
  });

  it('should replace placeholders with the correct values - example 2', () => {
    const input = 'The data entered is not valid for %FIELDLABEL%. Link mark up characters are not allowed in this field';
    const replacements = { FIELDLABEL: 'TextField' };
    const expected = [
      'The data entered is not valid for',
      ' ',
      'TextField',
      '. Link mark up characters are not allowed in this field'
    ];

    const actual = splitPhraseIntoComponents(input, replacements);

    expect(actual).toEqual(expected);
  });

  it('should replace placeholders with the correct values - example 3', () => {
    const input = 'Case #%CASEREFERENCE% has been updated with event: %NAME%';
    const replacements = { CASEREFERENCE: '1708-4384-3055-7194', NAME: 'Deceased details' };
    const expected = [
      'Case #',
      '1708-4384-3055-7194',
      ' ',
      'has been updated with event:',
      ' ',
      'Deceased details'
    ];

    const actual = splitPhraseIntoComponents(input, replacements);
    expect(actual).toEqual(expected);
  });
});
