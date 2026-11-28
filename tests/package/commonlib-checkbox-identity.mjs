import assert from 'node:assert/strict';
import '@angular/compiler';
import { GovUkCheckboxComponent as StandaloneCheckbox, GovCheckboxModule } from '@hmcts/rpx-xui-core-lib/ui/gov-checkbox';
import { GovUkCheckboxComponent as InvitationCheckbox, InvitationModule } from '@hmcts/rpx-xui-core-lib/ui/invitation';

assert.strictEqual(InvitationCheckbox, StandaloneCheckbox);
assert.ok(GovCheckboxModule);
assert.ok(InvitationModule);
