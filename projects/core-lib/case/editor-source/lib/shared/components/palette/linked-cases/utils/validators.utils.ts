import { Injectable } from '@angular/core';
import { AbstractControl, ValidatorFn } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ValidatorsUtils {
  public numberLengthValidator(inputLength: number): ValidatorFn {
    return (control: AbstractControl): { isValid: false } | null => {
      return control.value.length !== inputLength ? { isValid: false } : null;
    };
  }
  public formArraySelectedValidator(): ValidatorFn {
    return (control: AbstractControl): { isValid: false } | null => {
      return control.value.every((option: { selected?: boolean }) => !option.selected) ? { isValid: false } : null;
    };
  }
  public regexPattern(regexPattern: string): ValidatorFn {
    return (control: AbstractControl): { isValid: false } | null => {
      const regex = new RegExp(regexPattern);
      return regex.test(control.value) ? null : { isValid: false };
    };
  }
}
