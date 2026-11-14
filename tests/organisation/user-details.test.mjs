import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserDetailsComponent } from '@hmcts/rpx-xui-core-lib/ui/user-details';

test('user details checks roles safely for absent and present users', () => {
  const component = new UserDetailsComponent();
  assert.equal(component.userHasRole('pui-caa'), false);
  component.user = { roles: ['pui-caa'] };
  assert.equal(component.userHasRole('pui-caa'), true);
  assert.equal(component.userHasRole('pui-finance-manager'), false);
});

test('user details emits the original user for suspend and reinvite actions', () => {
  const component = new UserDetailsComponent();
  const user = { fullName: 'Synthetic User', email: 'user@example.invalid' };
  const events = [];
  component.reinvite.subscribe(value => events.push(['reinvite', value]));
  component.suspendUserEvent.subscribe(value => events.push(['suspend', value]));
  component.reinviteClick(user);
  component.suspendUser(user);
  assert.deepEqual(events, [['reinvite', user], ['suspend', user]]);
  assert.equal(events[0][1], user);
  assert.equal(events[1][1], user);
});
