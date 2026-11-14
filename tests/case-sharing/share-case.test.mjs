import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BehaviorSubject } from 'rxjs';
import { ShareCaseComponent, ShareCaseConfirmComponent, UserSelectComponent } from '@hmcts/rpx-xui-core-lib/case/share-case';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';

test('sharing supplies a label when the consumer does not provide one', () => {
  const component = new ShareCaseComponent(new CaseSharingStateService(), /** @type {never} */ ({}));
  assert.equal(component.addUserLabel, 'Find a person');
});

for (const Component of [ShareCaseComponent, ShareCaseConfirmComponent]) {
  test(`${Component.name} releases the host state subscription`, () => {
    const host = new BehaviorSubject([{ caseId: 'one', caseTitle: 'Case' }]);
    const component = new Component(new CaseSharingStateService(), /** @type {never} */ ({}));
    component.shareCases$ = host;
    component.ngOnInit();
    assert.equal(host.observed, true);
    component.ngOnDestroy();
    assert.equal(host.observed, false);
  });
}

test('continue validation reads current state without keeping subscriptions', () => {
  const state = new CaseSharingStateService();
  const component = new ShareCaseComponent(state, /** @type {never} */ ({}));
  component.shareCases$ = new BehaviorSubject([{ caseId: 'one', caseTitle: 'Case' }]);
  component.ngOnInit();
  const observed = new BehaviorSubject([{ caseId: 'one', caseTitle: 'Case', pendingShares: [{ idamId: 'user', firstName: 'A', lastName: 'B', email: 'a@example.invalid' }] }]);
  component.shareCases$ = observed;
  component.setContinueAllowed();
  assert.equal(component.continueAllowed, true);
  assert.equal(observed.observed, false);
  observed.next([{ caseId: 'one', caseTitle: 'Case', pendingShares: [] }]);
  component.setContinueAllowed();
  assert.equal(component.continueAllowed, false);
  assert.equal(observed.observed, false);
  component.ngOnDestroy();
});

test('user selection stops emitting when the component is destroyed', () => {
  const component = new UserSelectComponent();
  const selected = [];
  component.selected.subscribe(value => selected.push(value));
  component.ngOnInit();
  component.control.setValue('first');
  assert.deepEqual(selected, [null]);
  component.ngOnDestroy();
  component.control.setValue('second');
  assert.deepEqual(selected, [null]);
});
