import { GovCheckboxModule, GovUkCheckboxComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-checkbox';
import { GovUkCheckboxComponent as InvitationCheckbox } from '@hmcts/rpx-xui-core-lib/ui/invitation';
import type { GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';

const config: GovUiConfigModel = {
  id: 'manage-cases',
  value: 'manageCases',
  name: 'roles',
  label: 'Manage cases',
};
const component = new GovUkCheckboxComponent();
component.config = config;
component.isChecked = true;

void GovCheckboxModule;
void InvitationCheckbox;
void component;
