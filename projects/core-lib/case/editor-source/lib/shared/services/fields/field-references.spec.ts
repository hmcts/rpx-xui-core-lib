import { FormControl } from '@angular/forms';
import { CaseField } from '../../domain/definition/case-field.model';
import { AbstractFormFieldComponent } from '../../components/palette/base-field/abstract-form-field.component';
import { FieldsUtils } from './fields.utils';

describe('field control references', () => {
  it('maps a nested complex field without changing its values', () => {
    const child = new CaseField();
    child.id = 'child';
    child.value = 'value';
    const parent = new CaseField();
    parent.id = 'parent';
    parent.field_type = { id: 'Complex', type: 'Complex', complex_fields: [child] };
    expect(FieldsUtils.toValuesMap([parent])).toEqual({ parent: { child: 'value' } });
  });

  it('attaches the original field and component to the same control', () => {
    const control = new FormControl();
    const field = new CaseField();
    const component = {} as AbstractFormFieldComponent;
    FieldsUtils.addCaseFieldAndComponentReferences(control, field, component);
    expect(Reflect.get(control, 'caseField')).toBe(field);
    expect(Reflect.get(control, 'component')).toBe(component);
  });
});

export const registered = true;
