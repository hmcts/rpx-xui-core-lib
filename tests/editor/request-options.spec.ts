import { HttpParams } from '@angular/common/http';
import { RequestOptionsBuilder } from '../../projects/core-lib/case/editor-source/lib/shared/services/request/request.options.builder';

export const registered = true;

describe('Search request options migration contract', () => {
  it('preserves nested collection values and omits blank criteria', () => {
    const options = new RequestOptionsBuilder().buildOptions({ page: 2, empty: ' ' }, { 'people.value.name': [{ value: { name: ' Alice ' } }, { value: { name: 'Bob' } }], ignored: '' }, 'SEARCH');
    const params = options.params as HttpParams;
    expect(params.get('view')).toBe('SEARCH');
    expect(params.get('page')).toBe('2');
    expect(params.get('empty')).toBeNull();
    expect(params.get('case.people.value.name')).toBe('[Alice, Bob]');
    expect(params.has('case.ignored')).toBeFalse();
  });
});
