import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InviteUserFormComponent, InviteUserPermissionComponent } from '@hmcts/rpx-xui-core-lib/ui/invitation';

test('invitation form defaults missing errors and emits a submit event', () => {
  const component = new InviteUserFormComponent();
  component.errorMessages = null;
  assert.deepEqual(component.isInvalid, {});
  let count = 0;
  component.submitForm.subscribe(() => count++);
  component.onSubmit();
  assert.equal(count, 1);
});

test('invitation permissions retain legacy default flags', () => {
  const component = new InviteUserPermissionComponent();
  assert.deepEqual([component.isPuiCaseManager, component.isPuiUserManager, component.isPuiOrganisationManager, component.isPuiFinanceManager], [false, false, false, false]);
});
