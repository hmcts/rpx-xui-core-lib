import { isFormGroup, ValidatorFn } from '@angular/forms';

export function radioGroupValidator(): ValidatorFn {
  return function validate(control) {
    if (!isFormGroup(control)) throw new Error('radioGroupValidator requires a FormGroup');
    const formGroup = control;
    return Object.values(formGroup.controls).some(control => !control.valid) ? { isRadioGroupInvalid: true } : null;
  };
}
