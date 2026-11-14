import { CaseField } from '../../projects/core-lib/case/editor-source/lib/shared/domain/definition/case-field.model';
import { FormControl, Validators } from '@angular/forms';
import { ConditionalShowFormDirective } from '../../projects/core-lib/case/editor-source/lib/shared/directives/conditional-show/conditional-show-form.directive';
import { FieldsUtils } from '../../projects/core-lib/case/editor-source/lib/shared/services/fields/fields.utils';

export const registered = true;

describe('Conditional form migration contract', () => {
  it('disables a hidden validated field and re-enables it when shown', () => {
    const directive = new ConditionalShowFormDirective(new FieldsUtils());
    const field = { id: 'target', show_condition: 'other="yes"', hidden: false } as CaseField;
    const control = new FormControl('', Validators.required);
    directive.caseFields = [field];
    directive['allFieldValues'] = { other: 'no' };
    directive['evaluateCondition'](field, null, control);
    expect(field.hidden).toBeTrue();
    expect(control.disabled).toBeTrue();
    directive['allFieldValues'] = { other: 'yes' };
    directive['evaluateCondition'](field, null, control);
    expect(field.hidden).toBeFalse();
    expect(control.enabled).toBeTrue();
  });
});
