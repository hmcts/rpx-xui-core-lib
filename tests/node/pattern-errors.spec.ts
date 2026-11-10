import { arrayPatternMatch, isStringPatternMatch } from '../../projects/core-lib/node'

test('empty roles do not match, including an invalid unused pattern', () => {
    expect(arrayPatternMatch([], '.')).toBe(false)
    expect(arrayPatternMatch([], '[')).toBe(false)
})

test('invalid patterns throw SyntaxError for a string or nonempty roles', () => {
    expect(() => isStringPatternMatch('role', '[')).toThrow(SyntaxError)
    expect(() => arrayPatternMatch(['role'], '[')).toThrow(SyntaxError)
})
