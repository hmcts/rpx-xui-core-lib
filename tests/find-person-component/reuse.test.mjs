import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, Injector } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { FindAPersonService, FindPersonComponent } from '@hmcts/rpx-xui-core-lib/ui/find-person';

function component(t, group, selectedPerson) {
  const injector = Injector.create({ providers: [FindPersonComponent, { provide: FindAPersonService, useValue: { find: () => of([]), findCaseworkers: () => of([]) } }, { provide: ChangeDetectorRef, useValue: { detectChanges() {} } }] });
  const instance = injector.get(FindPersonComponent);
  instance.findPersonGroup = group;
  instance.selectedPerson = selectedPerson;
  t.after(() => { instance.ngOnDestroy(); injector.destroy(); });
  return instance;
}

test('uses a parent-owned existing control and preserves its value and validators after destruction', t => {
  const existing = new FormControl('retained', Validators.required);
  const group = new FormGroup({ findPersonControl: existing });
  const view = component(t, group, 'different input');
  view.ngOnInit();
  assert.equal(view.findPersonControl, existing);
  assert.equal(existing.value, 'retained');
  assert.equal(existing.hasValidator(Validators.required), true);
  existing.setValue('');
  assert.equal(view.findPersonControl.invalid, true);
  view.ngOnDestroy();
  assert.equal(group.get('findPersonControl'), existing);
});

test('retains an existing disabled control and does not replace parent state', t => {
  const existing = new FormControl({ value: 'retained disabled', disabled: true }, Validators.required);
  const group = new FormGroup({ findPersonControl: existing });
  const view = component(t, group, 'different input');
  view.ngOnInit();
  assert.equal(view.findPersonControl, existing);
  assert.equal(existing.disabled, true);
  assert.equal(existing.value, 'retained disabled');
  assert.equal(existing.hasValidator(Validators.required), true);
});

test('creates a control with selectedPerson when absent and keeps it in parent after destroy', t => {
  const group = new FormGroup({});
  const view = component(t, group, 'selected person');
  view.ngOnInit();
  assert.equal(group.get('findPersonControl'), view.findPersonControl);
  assert.equal(view.findPersonControl.value, 'selected person');
  view.ngOnDestroy();
  assert.equal(group.get('findPersonControl'), view.findPersonControl);
});

test('preserves legacy initialization when the existing entry is not a FormControl', t => {
  const wrong = new FormGroup({ child: new FormControl('unchanged') });
  const group = new FormGroup({ findPersonControl: wrong });
  const view = component(t, group);
  view.ngOnInit();
  assert.equal(group.get('findPersonControl'), wrong);
  assert.notEqual(view.findPersonControl, wrong);
  assert.equal(wrong.get('child').value, 'unchanged');
});

test('initialization retains the legacy parent group update and validation emissions', t => {
  let validations = 0;
  const existing = new FormControl('retained', Validators.required);
  const group = new FormGroup({ findPersonControl: existing }, () => { validations++; return null; });
  const values = [];
  const statuses = [];
  group.valueChanges.subscribe(value => values.push(value));
  group.statusChanges.subscribe(status => statuses.push(status));
  validations = 0;
  const view = component(t, group);
  view.ngOnInit();
  assert.equal(validations, 1);
  assert.deepEqual(values, [{ findPersonControl: 'retained' }]);
  assert.deepEqual(statuses, ['VALID']);
  assert.equal(existing.hasValidator(Validators.required), true);
});

test('a retained control drives lookup events until component destruction', async t => {
  const retained = new FormControl('initial');
  const group = new FormGroup({ findPersonControl: retained });
  const view = component(t, group);
  const events = [];
  view.personSelected.subscribe(value => events.push(value));
  view.ngOnInit();
  retained.setValue('alice');
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.deepEqual(events, [null]);
  view.ngOnDestroy();
  retained.setValue('bob');
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.deepEqual(events, [null]);
  assert.equal(group.get('findPersonControl'), retained);
});

test('recreating a component retains parent-owned state and leaves only the new subscription active', async t => {
  const retained = new FormControl({ value: 'retained disabled', disabled: true }, Validators.required);
  const group = new FormGroup({ findPersonControl: retained });
  const oldView = component(t, group, 'old input');
  const oldEvents = [];
  oldView.personSelected.subscribe(value => oldEvents.push(value));
  oldView.ngOnInit();
  oldView.ngOnDestroy();
  assert.equal(group.get('findPersonControl'), retained);
  const newView = component(t, group, 'new input');
  const newEvents = [];
  newView.personSelected.subscribe(value => newEvents.push(value));
  newView.ngOnInit();
  assert.equal(newView.findPersonControl, retained);
  assert.equal(retained.disabled, true);
  assert.equal(retained.value, 'retained disabled');
  assert.equal(retained.hasValidator(Validators.required), true);
  retained.enable({ emitEvent: false });
  retained.setValue('alice');
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.deepEqual(oldEvents, []);
  assert.deepEqual(newEvents, [null]);
});
