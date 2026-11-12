import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormControl } from '@angular/forms';
import { DateInputComponent } from '@hmcts/rpx-xui-core-lib/case/editor-date';

test('date input reports mandatory and partial values through the legacy validator', () => {
  const component = new DateInputComponent();
  component.mandatory = true;
  const control = new FormControl('');
  assert.deepEqual(component.validate(control), { required: 'This field is required' });
  component.registerOnChange(value => control.setValue(value));
  component.dayChange('29');
  assert.deepEqual(component.validate(control), { pattern: 'Date is not valid' });
  component.monthChange('2'); component.yearChange('2024');
  assert.equal(control.value, '2024-02-29');
  assert.equal(component.validate(control), undefined);
});

test('date input write and callback preserve the legacy padded value', () => {
  const component = new DateInputComponent();
  const changes = [];
  component.registerOnChange(value => changes.push(value));
  component.writeValue('2024-05-06');
  component.dayChange('7');
  assert.deepEqual(changes, ['2024-05-07']);
  assert.equal(component.displayMonth, '05');
});

test('date input retains legacy touched callback and destruction behavior', () => {
  const component = new DateInputComponent();
  let called = false;
  component.registerOnTouched(() => { called = true; });
  component.mandatory = true;
  assert.deepEqual(component.validate(new FormControl('')), { required: 'This field is required' });
  component.ngOnDestroy();
  assert.equal(component.validate(new FormControl('')), undefined);
  assert.equal(called, false);
});
