import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { FindAPersonService, FindPersonComponent, PersonRole } from '@hmcts/rpx-xui-core-lib/ui/find-person';

const wait = () => new Promise(resolve => setTimeout(resolve, 350));
function setup(t) {
  const requests = [];
  const service = { find: () => of([]), findCaseworkers: () => { const request = new Subject(); requests.push(request); return request; } };
  const injector = Injector.create({ providers: [FindPersonComponent, { provide: FindAPersonService, useValue: service }, { provide: ChangeDetectorRef, useValue: { detectChanges() {} } }] });
  const component = injector.get(FindPersonComponent);
  component.domain = PersonRole.ADMIN;
  component.findPersonGroup = new FormGroup({});
  component.ngOnInit();
  t.after(() => { component.ngOnDestroy(); injector.destroy(); });
  return { component, requests };
}
for (const nextInput of ['bob', '', 'bo']) {
  test(`new input ${JSON.stringify(nextInput)} immediately cancels stale lookup`, async t => {
    const { component, requests } = setup(t);
    component.findPersonControl.setValue('alice');
    await wait();
    assert.equal(requests.length, 1);
    component.findPersonControl.setValue(nextInput);
    requests[0].next([{ id: 'old', name: 'Alice', domain: PersonRole.ADMIN }]);
    assert.equal(component.findPersonControl.value, nextInput);
    assert.equal(component.showAutocomplete, false);
    assert.deepEqual(component.filteredOptions, []);
    assert.equal(requests[0].observers.length, 0);
  });
}
test('destroy cancels a pending lookup', async t => {
  const { component, requests } = setup(t);
  component.findPersonControl.setValue('alice');
  await wait();
  assert.equal(requests.length, 1);
  component.ngOnDestroy();
  assert.equal(requests[0].observers.length, 0);
});
test('latest lookup displays the new options and emits the cleared selection after debounce', async t => {
  const { component, requests } = setup(t);
  const selected = [];
  component.personSelected.subscribe(value => selected.push(value));
  component.findPersonControl.setValue('alice');
  await wait();
  component.findPersonControl.setValue('bob');
  requests[0].next([{ id: 'old', name: 'Alice', domain: PersonRole.ADMIN }]);
  await wait();
  assert.equal(requests.length, 2);
  requests[1].next([{ id: 'new', name: 'Bob', domain: PersonRole.ADMIN }]);
  assert.equal(component.showAutocomplete, true);
  assert.deepEqual(component.filteredOptions.map(person => person.id), ['new']);
  assert.deepEqual(selected, [null, null]);
});

test('a failed lookup clears results and a later input still works', async t => {
  const { component, requests } = setup(t);
  component.findPersonControl.setValue('alice');
  await wait();
  requests[0].error(new Error('synthetic lookup failure'));
  assert.deepEqual(component.filteredOptions, []);
  component.findPersonControl.setValue('bob');
  await wait();
  assert.equal(requests.length, 2);
  requests[1].next([{ id: 'new', name: 'Bob', domain: PersonRole.ADMIN }]);
  assert.deepEqual(component.filteredOptions.map(person => person.id), ['new']);
});

test('selection emits a person and sets display text without starting another search', async t => {
  const { component, requests } = setup(t);
  const selected = [];
  component.personSelected.subscribe(value => selected.push(value));
  const person = { id: 'p1', name: 'Person', email: 'person@example.test', domain: PersonRole.ADMIN };
  component.onSelectionChange(person);
  await wait();
  assert.deepEqual(selected, [person]);
  assert.equal(component.findPersonControl.value, 'Person (person@example.test)');
  assert.equal(requests.length, 0);
});
test('direct selection during pending debounce retains legacy follow-up search behavior', async t => {
  const { component, requests } = setup(t);
  const selected = [];
  component.personSelected.subscribe(value => selected.push(value));
  component.findPersonControl.setValue('alice');
  const person = { id: 'chosen', name: 'Alice', domain: PersonRole.ADMIN };
  component.onSelectionChange(person);
  await wait();
  assert.deepEqual(selected, [person, null]);
  assert.equal(requests.length, 1);
  assert.equal(component.findPersonControl.value, 'Alice');
});

test('direct selection without a control value event retains the legacy active request', async t => {
  const { component, requests } = setup(t);
  component.findPersonControl.setValue('alice');
  await wait();
  const person = { id: 'chosen', name: 'Alice', domain: PersonRole.ADMIN };
  component.onSelectionChange(person);
  requests[0].next([{ id: 'old', name: 'Alice', domain: PersonRole.ADMIN }]);
  assert.equal(component.showAutocomplete, true);
  assert.deepEqual(component.filteredOptions.map(option => option.id), ['old']);
  assert.equal(requests[0].observers.length, 1);
});
