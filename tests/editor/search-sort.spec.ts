import { SearchResultViewItemComparatorFactory } from '../../projects/core-lib/case/editor-source/lib/shared/services/search-result/sorting/search-result-view-item-comparator-factory';

export const registered = true;

describe('Search sorting migration contract', () => {
  it('compares numbers, text and multiselect values with existing null handling', () => {
    const factory = new SearchResultViewItemComparatorFactory();
    type Column = Parameters<typeof factory.createSearchResultViewItemComparator>[0];
    type Comparator = ReturnType<typeof factory.createSearchResultViewItemComparator>;
    type Item = Parameters<Comparator['compare']>[0];
    const compare = (type: string, a: unknown, b: unknown) => {
      const column = { case_field_id: 'field', case_field_type: { type } } as unknown as Column;
      const left = { case_fields: { field: a } } as unknown as Item;
      const right = { case_fields: { field: b } } as unknown as Item;
      return factory.createSearchResultViewItemComparator(column).compare(left, right);
    };
    expect(compare('Number', 10, 2)).toBeGreaterThan(0);
    expect(compare('Number', null, 2)).toBeLessThan(0);
    expect(compare('Text', 'ALPHA', 'alpha')).toBe(0);
    expect(compare('MultiSelectList', ['B'], ['a'])).toBeGreaterThan(0);
  });
});
