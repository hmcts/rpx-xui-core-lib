import { isFormGroup, ValidatorFn } from '@angular/forms';

export function dateValidator(): ValidatorFn {
  return function validate(control) {
    if (!isFormGroup(control)) throw new Error('dateValidator requires a FormGroup');
    const formGroup = control;
    const values = ['day', 'month', 'year'].map(name => formGroup.get(name)?.value);
    if (values.some(value => typeof value === 'number' ? !Number.isInteger(value) : typeof value !== 'string' || !/^\d+$/.test(value.trim()))) {
      return { dateIsInvalid: true };
    }

    const [day, month, year] = values.map(Number);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1) {
      return { dateIsInvalid: true };
    }

    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? null : { dateIsInvalid: true };
  };
}
