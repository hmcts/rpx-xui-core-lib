import { CcdTabFieldsPipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/complex/ccd-tab-fields.pipe';
import { CaseField } from '../../projects/core-lib/case/editor-source/lib/shared/domain/definition/case-field.model';
import { FormControl, FormGroup } from '@angular/forms';
import { CcdPageFieldsPipe } from '../../projects/core-lib/case/editor-source/lib/shared/pipes/complex/ccd-page-fields.pipe';

export const registered = true;

describe('Page fields migration contract', () => {
  it('retains the legacy fallback for falsy top-level form values', () => {
    const first = Object.assign(new CaseField(), { id: 'first', order: 1, value: 'fallback', field_type: { id: 'Text', type: 'Text' } });
    const control = Object.assign(new FormControl('nested'), { caseField: first });
    const form = new FormGroup({ data: new FormGroup({ first: control }), first: new FormControl('') });
    const page = { id: 'page', label: 'Page', case_fields: [first] } as unknown as Parameters<CcdPageFieldsPipe['transform']>[0];
    expect(new CcdPageFieldsPipe().transform(page, form).value).toEqual({ first: 'fallback' });
    form.controls.first.setValue('selected');
    expect(new CcdPageFieldsPipe().transform(page, form).value).toEqual({ first: 'selected' });
  });
  it('selects current page controls and preserves field ordering', () => {
    const makeField = (id: string, order: number, value: string) => Object.assign(new CaseField(), { id, order, value, field_type: { id: 'Text', type: 'Text' } });
    const first = makeField('first', 1, 'one');
    const second = makeField('second', 2, 'two');
    const other = makeField('other', 0, 'other');
    const control = (field: CaseField) => Object.assign(new FormControl(field.value), { caseField: field });
    const form = new FormGroup({ data: new FormGroup({ second: control(second), first: control(first), other: control(other) }) });
    const result = new CcdPageFieldsPipe().transform({ id: 'page', label: 'Page', case_fields: [first, second] } as unknown as Parameters<CcdPageFieldsPipe['transform']>[0], form);
    expect(result.field_type.complex_fields.map(field => field.id)).toEqual(['first', 'second']);
    expect(result.value).toEqual({ first: 'one', second: 'two' });
  });
});

describe('Tab fields migration contract', () => {
  it('retains values and field definitions in a readonly complex field', () => {
    const fields = [Object.assign(new CaseField(), { id: 'name', value: 'Alex', field_type: { id: 'Text', type: 'Text' } }), Object.assign(new CaseField(), { id: 'empty', value: null, field_type: { id: 'Text', type: 'Text' } })];
    const tab = { id: 'details', label: 'Details', fields } as unknown as Parameters<CcdTabFieldsPipe['transform']>[0];
    const result = new CcdTabFieldsPipe().transform(tab);
    expect(result.id).toBe('details');
    expect(result.display_context).toBe('READONLY');
    expect(result.value).toEqual({ name: 'Alex', empty: null });
    expect(result.field_type.complex_fields.map(field => field.id)).toEqual(['name', 'empty']);
  });
});
