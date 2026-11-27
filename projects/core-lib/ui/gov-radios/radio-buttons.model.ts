import { FormGroup } from '@angular/forms';
import { GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';

export interface RadioButtonsModel {
  key: string;
  group: FormGroup;
  config: GovUiConfigModel;
  // Preserve the legacy public error payload until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  items: GovUiConfigModel[];
}

