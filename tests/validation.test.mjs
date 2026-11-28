import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { checkboxesBeCheckedValidator, dateValidator, radioGroupValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

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

const dateForm = (day, month, year) => new FormGroup({
  day: new FormControl(day),
  month: new FormControl(month),
  year: new FormControl(year),
});

test('date validator accepts an ordinary valid calendar date', () => {
  assert.equal(dateValidator()(dateForm('1', '1', '2026')), null);
});

test('date validator accepts leap day in a leap year', () => {
  assert.equal(dateValidator()(dateForm('29', '2', '2024')), null);
});

test('date validator rejects a day that would roll into the next month', () => {
  assert.deepEqual(dateValidator()(dateForm('31', '2', '2026')), { dateIsInvalid: true });
});

test('date validator rejects a leap day in a non-leap year', () => {
  assert.deepEqual(dateValidator()(dateForm('29', '2', '2025')), { dateIsInvalid: true });
});

test('date validator rejects blank date parts', () => {
  assert.deepEqual(dateValidator()(dateForm('', '1', '2026')), { dateIsInvalid: true });
});

test('date validator rejects non-numeric date parts', () => {
  assert.deepEqual(dateValidator()(dateForm('not-a-day', '1', '2026')), { dateIsInvalid: true });
});

test('date validator rejects non-decimal numeric notation', () => {
  assert.deepEqual(dateValidator()(dateForm('1e1', '1', '2026')), { dateIsInvalid: true });
});

test('date validator rejects a day outside the calendar range', () => {
  assert.deepEqual(dateValidator()(dateForm('0', '1', '2026')), { dateIsInvalid: true });
});

test('date validator rejects a month outside the calendar range', () => {
  assert.deepEqual(dateValidator()(dateForm('1', '13', '2026')), { dateIsInvalid: true });
});

test('date validator rejects missing date controls', () => {
  const form = new FormGroup({ day: new FormControl('1'), month: new FormControl('1') });
  assert.deepEqual(dateValidator()(form), { dateIsInvalid: true });
});

test('date validator rejects use on a non-group control with a clear error', () => {
  assert.throws(() => dateValidator()(new FormControl('1')), /dateValidator requires a FormGroup/);
});

test('radio group validator reports invalid children with its legacy error key', () => {
  const group = new FormGroup({ selected: new FormControl('', Validators.required) }, radioGroupValidator());
  assert.deepEqual(group.errors, { isRadioGroupInvalid: true });
});

test('radio group validator accepts a group whose children are valid', () => {
  const group = new FormGroup({ selected: new FormControl('yes', Validators.required) }, radioGroupValidator());
  assert.equal(group.errors, null);
});

test('radio group validator accepts an empty group as CommonLib does', () => {
  assert.equal(radioGroupValidator()(new FormGroup({})), null);
});

test('radio group validator rejects use on a non-group control with a clear error', () => {
  assert.throws(() => radioGroupValidator()(new FormControl('yes')), /radioGroupValidator requires a FormGroup/);
});
