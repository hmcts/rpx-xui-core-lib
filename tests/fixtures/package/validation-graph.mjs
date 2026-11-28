import { FormControl, FormGroup } from '@angular/forms';
import { checkboxesBeCheckedValidator, dateValidator, radioGroupValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';
console.log(checkboxesBeCheckedValidator()(new FormGroup({})));
console.log(dateValidator()(new FormGroup({ day: new FormControl('1'), month: new FormControl('1'), year: new FormControl('2026') })));
console.log(radioGroupValidator()(new FormGroup({ selected: new FormControl('yes') })));
