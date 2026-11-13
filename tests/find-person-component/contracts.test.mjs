import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChangeDetectorRef, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';
import { FindAPersonService, FindPersonComponent, PersonRole } from '@hmcts/rpx-xui-core-lib/ui/find-person';
function setup(t) {
  const judicial = [{ id: 'j1', name: 'Judge One', domain: PersonRole.JUDICIAL }, { id: 'j2', name: 'Judge Two', domain: PersonRole.JUDICIAL }];
  const caseworkers = [{ id: 'c1', name: 'Worker One', domain: PersonRole.ADMIN }];
  const calls = [];
  const service = { find: options => { calls.push(['judicial', options]); return of(judicial); }, findCaseworkers: options => { calls.push(['caseworkers', options]); return of(caseworkers); } };
  const injector = Injector.create({ providers: [FindPersonComponent, { provide: FindAPersonService, useValue: service }, { provide: ChangeDetectorRef, useValue: { detectChanges() {} } }] });
  t.after(() => injector.destroy());
  return { component: injector.get(FindPersonComponent), calls, judicial, caseworkers };
}
test('judicial search excludes already selected people and forwards search options', async t => {
  const { component, calls, judicial } = setup(t);
  component.domain = PersonRole.JUDICIAL; component.selectedPersons = [judicial[0]];
  component.services = 'TEST'; component.assignedUser = ['already']; component.userIncluded = true;
  assert.deepEqual(await firstValueFrom(component.filter('Jud')), [judicial[1]]);
  assert.deepEqual(calls.map(([kind]) => kind), ['judicial', 'caseworkers']);
  assert.deepEqual(calls[0][1], { searchTerm: 'Jud', userRole: PersonRole.JUDICIAL, services: ['TEST'], userIncluded: true, assignedUser: ['already'] });
});
test('all-domain search joins both people lists in legacy order', async t => {
  const { component, judicial, caseworkers } = setup(t); component.domain = PersonRole.ALL;
  assert.deepEqual(await firstValueFrom(component.filter('all')), [...judicial, ...caseworkers]);
});
for (const role of [PersonRole.ADMIN, PersonRole.CTSC, PersonRole.LEGAL_OPERATIONS]) {
  test(`${role} domain returns caseworkers`, async t => {
    const { component, caseworkers } = setup(t); component.domain = role;
    assert.deepEqual(await firstValueFrom(component.filter('worker')), caseworkers);
  });
}
test('unknown domain and short term return empty results', async t => {
  const { component } = setup(t);
  component.domain = /** @type {import('@hmcts/rpx-xui-core-lib/ui/find-person').PersonRole} */ (/** @type {unknown} */ ('not-a-domain')); assert.deepEqual(await firstValueFrom(component.filter('worker')), []);
  component.domain = PersonRole.ALL; assert.deepEqual(await firstValueFrom(component.filter('ab')), []);
});
test('display names and field-change event preserve the component contract', t => {
  const { component } = setup(t); let changes = 0;
  component.personFieldChanged.subscribe(() => changes++); component.onInput();
  assert.equal(changes, 1); assert.equal(component.getDisplayName(null), '');
  assert.equal(component.getDisplayName({ id: 'a', name: 'Name', domain: PersonRole.ADMIN }), 'Name');
  assert.equal(component.getDisplayName({ id: 'a', name: 'Name', email: 'a@example.test', domain: PersonRole.ADMIN }), 'Name (a@example.test)');
  assert.equal(component.getDisplayName({ id: 'a', name: 'Name', fullName: 'Judge', email: 'a@example.test', domain: PersonRole.JUDICIAL }), 'Judge (a@example.test)');
});


test('find-person shared parent group uses one control with duplicate subscriptions', async t => {
  const first = setup(t);
  const second = setup(t);
  const group = new FormGroup({});
  first.component.findPersonGroup = group;
  second.component.findPersonGroup = group;
  const firstSelections = [];
  const secondSelections = [];
  first.component.personSelected.subscribe(value => firstSelections.push(value));
  second.component.personSelected.subscribe(value => secondSelections.push(value));
  first.component.ngOnInit();
  second.component.ngOnInit();
  try {
    const control = group.get('findPersonControl');
    assert.equal(control, first.component.findPersonControl);
    assert.equal(control, second.component.findPersonControl);
    control.setValue('synthetic person');
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.deepEqual(firstSelections, [null]);
    assert.deepEqual(secondSelections, [null]);
    assert.equal(first.calls.length, 2);
    assert.equal(second.calls.length, 2);
  } finally {
    first.component.ngOnDestroy();
    second.component.ngOnDestroy();
  }
});
