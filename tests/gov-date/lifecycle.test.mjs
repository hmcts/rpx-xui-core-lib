import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormControl, FormGroup } from '@angular/forms';
import { GovUkDateComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-date';

test('date revalidates on month and year changes and stops after destruction', () => {
  const day = new FormControl('29');
  const month = new FormControl('2');
  const year = new FormControl('2024');
  const form = new FormGroup({ date_day: day, date_month: month, date_year: year });
  const component = new GovUkDateComponent();
  component.config = { id: 'date' };
  component.formGroup = form;
  component.ngOnInit();

  year.setValue('2023');
  assert.deepEqual(day.errors, { dateComponent: true });
  assert.equal(form.status, 'INVALID');
  month.setValue('3');
  assert.equal(day.errors, null);
  assert.equal(form.status, 'VALID');

  component.ngOnDestroy();
  year.setValue('2024');
  month.setValue('2');
  year.setValue('2023');
  assert.equal(day.errors, null, 'destroyed component must no longer revalidate the day');
});

test('date preserves legacy required and optional empty-value validation', () => {
  const cases = [
    { day: '', month: '1', year: '2021', optional: false, valid: false },
    { day: '1', month: null, year: '2021', optional: false, valid: false },
    { day: '1', month: '1', year: null, optional: false, valid: false },
    { day: '1.', month: '13', year: '2021', optional: false, valid: false },
    { day: '', month: '', year: '', optional: true, valid: true },
    { day: null, month: null, year: '', optional: true, valid: true },
    { day: null, month: undefined, year: '', optional: true, valid: true },
    { day: null, month: undefined, year: '2021', optional: true, valid: false }
  ];
  for (const { day, month, year, optional, valid } of cases) {
    const component = new GovUkDateComponent();
    component.config = { id: 'date' };
    component.isOptional = optional;
    component.formGroup = new FormGroup({ date_day: new FormControl(day), date_month: new FormControl(month), date_year: new FormControl(year) });
    component.ngOnInit();
    component.formGroup.controls.date_day.updateValueAndValidity();
    assert.equal(component.formGroup.valid, valid, JSON.stringify({ day, month, year, optional }));
    component.ngOnDestroy();
  }
});
