import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormControl, FormGroup } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

// Catches accidental truthiness, changed default, and off-by-one thresholds.
for (const { name, values, minimum, errors } of [
  { name: 'rejects an empty group with the default minimum', values: {}, errors: { requireOneCheckboxToBeChecked: true } },
  { name: 'rejects unchecked controls', values: { first: false, second: false }, errors: { requireOneCheckboxToBeChecked: true } },
  { name: 'accepts one actual true by default', values: { first: true, second: false }, errors: null },
  { name: 'rejects truthy non-boolean values', values: { first: 'true', second: 1, third: {} }, errors: { requireOneCheckboxToBeChecked: true } },
  { name: 'rejects fewer than the configured minimum', values: { first: true, second: false }, minimum: 2, errors: { requireOneCheckboxToBeChecked: true } },
  { name: 'accepts the exact configured minimum', values: { first: true, second: true }, minimum: 2, errors: null },
  { name: 'accepts zero when zero is explicitly required', values: {}, minimum: 0, errors: null },
]) {
  test(name, () => {
    const controls = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, new FormControl(value)]));
    const form = new FormGroup(controls, checkboxesBeCheckedValidator(minimum));
    assert.deepEqual(form.errors, errors);
  });
}

test('rejects use on a non-group control with a clear error', () => {
  assert.throws(() => checkboxesBeCheckedValidator()(new FormControl(false)), /checkboxesBeCheckedValidator requires a FormGroup/);
});
