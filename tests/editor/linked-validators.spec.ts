import { FormControl } from '@angular/forms';
import { ValidatorsUtils } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/utils/validators.utils';

export const registered = true;

describe('Linked-case validators migration contract', () => {
  it('requires a selected option and a correctly shaped reference', () => {
    const validators = new ValidatorsUtils();
    const selected = validators.formArraySelectedValidator();
    expect(selected(new FormControl([{ selected: false }]))).toEqual({ isValid: false });
    expect(selected(new FormControl([{ selected: true }]))).toBeNull();
    expect(validators.numberLengthValidator(4)(new FormControl('123'))).toEqual({ isValid: false });
    expect(validators.regexPattern('^\\d{4}$')(new FormControl('1234'))).toBeNull();
    expect(validators.regexPattern('^\\d{4}$')(new FormControl('abc'))).toEqual({ isValid: false });
  });
});
