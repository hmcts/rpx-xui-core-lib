import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CheckboxListComponent } from '@hmcts/rpx-xui-core-lib/ui/checkbox-list';

const detector = { detectChanges() {}, markForCheck() {}, detach() {}, checkNoChanges() {}, reattach() {} };

test('checkbox list maps preselection to actual options and removes unavailable selections', () => {
  const first = { label: 'First' };
  const second = { label: 'Second' };
  const component = new CheckboxListComponent(detector);
  component.options = [first, second];
  component.labelFunction = item => item.label;
  component.preselection = [{ label: 'Second' }, { label: 'Unknown' }];
  const emissions = [];
  component.selectionChange.subscribe(value => emissions.push(value));
  component.ngOnChanges();
  assert.deepEqual(component.selection, [second]);
  assert.equal(component.selection[0], second);
  component.options = [first];
  component.ngOnChanges();
  assert.deepEqual(component.selection, []);
  assert.deepEqual(emissions.at(-1), []);
});

test('checkbox list emits user selection and select-all transitions', () => {
  const component = new CheckboxListComponent(detector);
  component.options = ['one', 'two'];
  component.labelFunction = item => item;
  const emissions = [];
  component.selectionChange.subscribe(value => emissions.push([...value]));
  component.toggleItemSelection('one');
  component.toggleSelectAll();
  component.toggleSelectAll();
  assert.deepEqual(emissions, [['one'], ['one', 'two'], []]);
});

test('checkbox list keeps an active user selection when preselection later changes', () => {
  const component = new CheckboxListComponent(detector);
  component.options = ['one', 'two'];
  component.labelFunction = item => item;
  component.preselection = ['one'];
  component.ngOnChanges();
  component.toggleItemSelection('two');
  component.preselection = ['two'];
  component.ngOnChanges();
  const copy = component.selection;
  copy.pop();
  assert.deepEqual(component.selection, ['one', 'two']);
});
