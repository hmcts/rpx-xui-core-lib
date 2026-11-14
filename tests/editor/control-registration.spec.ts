import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AbstractFormFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/base-field/abstract-form-field.component';

export const registered = true;
class TestField extends AbstractFormFieldComponent {
  register(control: FormControl, replace = false) { return this.registerControl(control, replace); }
}

describe('Field control registration migration contract', () => {
  it('restores a truthy case value only into an existing null control', () => {
    const field = new TestField();
    const original = new FormControl(null);
    field.caseField = { id: 'field', value: 'restored' } as unknown as typeof field.caseField;
    field.formGroup = new FormGroup({ field: original });
    const changes: unknown[] = [];
    original.valueChanges.subscribe(value => changes.push(value));
    expect(field.register(new FormControl('ignored'))).toBe(original);
    expect(original.value).toBe('restored');
    expect(changes).toEqual([]);
    field.caseField.value = 'new';
    field.register(new FormControl('ignored'));
    expect(original.value).toBe('restored');
  });
  it('reuses existing controls and preserves validators on replacement', () => {
    const field = new TestField();
    const original = new FormControl('old', Validators.required);
    field.caseField = { id: 'field' } as unknown as typeof field.caseField;
    field.formGroup = new FormGroup({ field: original });
    expect(field.register(new FormControl('ignored'))).toBe(original);
    const replacement = new FormControl('');
    expect(field.register(replacement, true)).toBe(replacement);
    expect(field.formGroup.get('field')).toBe(replacement);
    expect(replacement.validator(replacement)).toEqual({ required: true });
    expect(replacement.invalid).toBeTrue();
    expect(field.formGroup.invalid).toBeTrue();
  });
});
