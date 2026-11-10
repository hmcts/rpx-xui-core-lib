import { FormControl, FormGroup, type ValidatorFn } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

const validator: ValidatorFn = checkboxesBeCheckedValidator(2);
const form: FormGroup = new FormGroup({ first: new FormControl(true) }, validator);
void form.errors;

import { arrayPatternMatch, isStringPatternMatch } from '@hmcts/rpx-xui-core-lib/node';
const matches: boolean = arrayPatternMatch(['pui-user-manager'], 'user-manager');
const singleMatch: boolean = isStringPatternMatch('pui-user-manager', '^pui-');
void [matches, singleMatch];
