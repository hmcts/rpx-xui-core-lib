import { ReadComplexFieldCollectionTableComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/complex/read-complex-field-collection-table.component';
import { SortOrder } from '../../projects/core-lib/case/editor-source/lib/shared/domain';

export const registered = true;

describe('Complex table migration contract', () => {
  it('sorts numeric rows in both directions without losing row data', () => {
    const table = new ReadComplexFieldCollectionTableComponent();
    table.columnsHorizontalLabel = { amount: { type: { type: 'Number' }, sortOrder: SortOrder.UNSORTED } };
    table.rows = [{ amount: 10, name: 'ten' }, { amount: 2, name: 'two' }];
    table.sortRowsByColumns('amount');
    expect(table.rows.map(row => row.name)).toEqual(['two', 'ten']);
    table.sortRowsByColumns('amount');
    expect(table.rows.map(row => row.name)).toEqual(['ten', 'two']);
  });
});
