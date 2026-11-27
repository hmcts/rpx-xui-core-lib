import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GovUkFormGroupWrapperComponent as FromInvitation, GovUkFieldsetComponent as InvitationFieldset } from '@hmcts/rpx-xui-core-lib/ui/invitation';
import { GovUkFormGroupWrapperComponent, GovUkFieldsetComponent, RemoveHostDirective } from '@hmcts/rpx-xui-core-lib/ui/form-group';

test('invitation and standalone form-group entries share their wrapper and fieldset classes', () => {
  assert.equal(FromInvitation, GovUkFormGroupWrapperComponent);
  assert.equal(InvitationFieldset, GovUkFieldsetComponent);
});

test('the standalone host-removal directive preserves the existing selector', () => {
  const definition = /** @type {{ selectors: string[][] }} */ (RemoveHostDirective.ɵdir);
  assert.equal(definition.selectors[0][1], 'appRemoveHost');
});
