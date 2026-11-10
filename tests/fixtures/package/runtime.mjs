import '@angular/compiler';
import assert from 'node:assert/strict';
import { FormControl, FormGroup } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

const required = { requireOneCheckboxToBeChecked: true };
for (const { values, minimum, errors } of [
  { values: {}, errors: required },
  { values: { first: false, second: false }, errors: required },
  { values: { first: true, second: false }, errors: null },
  { values: { first: 'true', second: 1, third: {} }, errors: required },
  { values: { first: true, second: false }, minimum: 2, errors: required },
  { values: { first: true, second: true }, minimum: 2, errors: null },
  { values: {}, minimum: 0, errors: null },
]) {
  const controls = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, new FormControl(value)]));
  const form = new FormGroup(controls, checkboxesBeCheckedValidator(minimum));
  assert.deepEqual(form.errors, errors);
}
console.log('Installed validator: all seven contracts passed');
