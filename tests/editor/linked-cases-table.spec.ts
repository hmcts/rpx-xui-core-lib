import { LinkedCasesToTableComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/components/linked-cases-table/linked-cases-to-table.component';

export const registered = true;

describe('Linked cases table migration contract', () => {
  it('orders reason codes and cases without dropping their values', () => {
    const component = new LinkedCasesToTableComponent({} as unknown as ConstructorParameters<typeof LinkedCasesToTableComponent>[0], {} as unknown as ConstructorParameters<typeof LinkedCasesToTableComponent>[1], {} as unknown as ConstructorParameters<typeof LinkedCasesToTableComponent>[2]);
    const cases = [
      { id: 'ordinary', reasons: [{ value: { Reason: 'OTHER' } }] },
      { id: 'progressed', reasons: [{ value: { Reason: 'CLRC015' } }, { value: { Reason: 'CLRC016' } }] }
    ];
    const sorted = component.sortReasonCodes(cases);
    expect(sorted.map(item => (item as unknown as typeof cases[number]).id)).toEqual(['progressed', 'ordinary']);
    expect((sorted[0].reasons[0] as unknown as typeof cases[number]['reasons'][number]).value.Reason).toBe('CLRC016');
    expect((sorted[0].reasons[1] as unknown as typeof cases[number]['reasons'][number]).value.Reason).toBe('CLRC015');
  });
});
