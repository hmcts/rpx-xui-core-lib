import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstValueFrom, Subject } from 'rxjs';
import { SelectedCaseComponent, SelectedCaseListComponent, SelectedCaseConfirmComponent } from '@hmcts/rpx-xui-core-lib/case/selected-case';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';

test('selected case stops listening to shared state when destroyed', () => {
  const state = new Subject();
  const component = new SelectedCaseComponent(/** @type {CaseSharingStateService} */ (/** @type {unknown} */ ({ state })));
  component.ngOnInit();
  const initial = [{ caseId: 'one' }];
  state.next(initial);
  assert.equal(component.shareCases, initial);
  component.ngOnDestroy();
  state.next([{ caseId: 'two' }]);
  assert.equal(component.shareCases, initial);
  assert.equal(state.observed, false);
});

for (const Component of [SelectedCaseListComponent, SelectedCaseConfirmComponent]) {
  test(`${Component.name} stops listening to shared state when destroyed`, () => {
    const state = new Subject();
    const component = new Component(/** @type {CaseSharingStateService} */ (/** @type {unknown} */ ({ state })));
    component.ngOnInit();
    const initial = [{ caseId: 'one' }];
    state.next(initial);
    assert.equal(component.shareCases, initial);
    component.ngOnDestroy();
    state.next([{ caseId: 'two' }]);
    assert.equal(component.shareCases, initial);
    assert.equal(state.observed, false);
  });
}

test('selected case actions use the same state and forward emitted changes', async () => {
  const state = new CaseSharingStateService();
  const user = { idamId: 'one', email: 'one@example.invalid', firstName: 'One', lastName: 'User' };
  const selectedCase = { caseId: 'case-one', caseTitle: 'Case', sharedWith: [user] };
  state.setCases([selectedCase]);
  const component = new SelectedCaseComponent(state);
  const list = new SelectedCaseListComponent(state);
  component.ngOnInit();
  list.ngOnInit();
  assert.equal(await firstValueFrom(component.canRemove('case-one', user)), false);
  component.removeUserFromCaseToggleOn = true;
  assert.equal(await firstValueFrom(component.canRemove('case-one', user)), true);
  /** @type {import('@hmcts/rpx-xui-core-lib/case/sharing').SharedCase[]} */
  let emitted = [];
  component.synchronizeStore.subscribe(value => { emitted = value; });
  component.onRemove(user, selectedCase);
  assert.equal(emitted, list.shareCases);
  assert.deepEqual(emitted[0].pendingUnshares, [user]);
  assert.equal(await firstValueFrom(component.canRemove('case-one', user)), false);
  state.setCases(emitted);
  component.onCancel(user, selectedCase);
  assert.deepEqual(list.shareCases[0].pendingUnshares, []);
  component.ngOnDestroy();
  list.ngOnDestroy();
});

test('list forwards selection and confirmation displays pending changes only', () => {
  const state = new CaseSharingStateService();
  const selectedCase = { caseId: 'case-one', caseTitle: 'Case' };
  state.setCases([selectedCase]);
  const list = new SelectedCaseListComponent(state);
  const confirm = new SelectedCaseConfirmComponent(state);
  list.ngOnInit();
  confirm.ngOnInit();
  let unselected;
  list.unselect.subscribe(value => { unselected = value; });
  list.onUnselect(selectedCase);
  assert.equal(unselected, selectedCase);
  assert.equal(list.caseCount, 1);
  confirm.sharedCase = selectedCase;
  assert.ok(!confirm.showUserAccessBlock());
  confirm.sharedCase = { ...selectedCase, pendingShares: [{ idamId: 'one', email: 'one@example.invalid', firstName: 'One', lastName: 'User' }] };
  assert.equal(confirm.showUserAccessBlock(), true);
  confirm.sharedCase = { ...selectedCase, pendingUnshares: [{ idamId: 'two', email: 'two@example.invalid', firstName: 'Two', lastName: 'User' }] };
  assert.equal(confirm.showUserAccessBlock(), true);
  list.ngOnDestroy();
  confirm.ngOnDestroy();
});
