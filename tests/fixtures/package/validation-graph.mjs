import { FormGroup } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';
console.log(checkboxesBeCheckedValidator()(new FormGroup({})));
