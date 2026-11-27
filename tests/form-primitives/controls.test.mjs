import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormControl, FormGroup } from '@angular/forms';
import { GovUkRadioComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-radio';
import { GovUkRadiosComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-radios';
import { GovUkCheckboxesComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-checkboxes';
import { GovUkTextareaComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-textarea';
import { GovUkFileUploadComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-file-upload';

test('radio preserves caller configuration identity and focus/class initialization', () => {
  const radio = new GovUkRadioComponent();
  const config = { id: 'original', value: 'yes', focusOn: 'preferred', classes: 'extra' };
  radio.config = config;
  radio.ngOnInit();
  assert.equal(radio.config, config);
  assert.equal(config.id, 'preferred');
  assert.equal(config.classes, 'extra govuk-radios__label');
});

test('checkbox columns and selection preserve legacy order without mutating the prior value', () => {
  const checkbox = new GovUkCheckboxesComponent();
  checkbox.config = { id: 'choices', name: 'choices', rows: 2 };
  checkbox.items = ['a', 'b', 'c'].map(value => ({ id: value, value, label: value }));
  const original = ['a'];
  checkbox.group = new FormGroup({ choices: new FormControl(original) });
  checkbox.ngOnInit();
  assert.deepEqual(checkbox.columns.map(column => column.map(item => item.value)), [['a', 'b'], ['c']]);
  checkbox.onChecked(true, 'b');
  assert.deepEqual(original, ['a']);
  assert.deepEqual(checkbox.group.value.choices, ['a', 'b']);
  checkbox.onChecked(false, 'a');
  assert.deepEqual(checkbox.group.value.choices, ['b']);
});

test('textarea and file upload preserve configured hint and error descriptions', () => {
  for (const Component of [GovUkTextareaComponent, GovUkFileUploadComponent]) {
    const component = new Component();
    component.config = { id: 'details', hint: 'Help' };
    assert.equal(component.setDescribedBy(), 'details-hint');
    component.errorMessage = { isInvalid: true, messages: ['Required'] };
    assert.equal(component.setDescribedBy(), 'details-hint details-error');
    component.errorMessage = { isInvalid: true, messages: [] };
    assert.equal(component.setDescribedBy(), 'details-hint');
  }
});

test('file upload retains legacy label sizing and reload default', () => {
  const upload = new GovUkFileUploadComponent();
  upload.config = { id: 'document', classes: 'caller' };
  assert.equal(upload.reloadInput, true);
  upload.ngOnInit();
  assert.equal(upload.config.classes, 'govuk-label--m');
});

test('radios preserves the caller-owned option model', () => {
  const radios = new GovUkRadiosComponent();
  const options = { key: 'answer', group: new FormGroup({}), config: { id: 'answer' }, errors: null, items: [] };
  radios.options = options;
  assert.equal(radios.options, options);
});
