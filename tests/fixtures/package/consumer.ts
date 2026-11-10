// The structural APF root must resolve without exposing runtime capabilities.
import type {} from '@hmcts/rpx-xui-core-lib';
import { FormControl, FormGroup, type ValidatorFn } from '@angular/forms';
import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';

const validator: ValidatorFn = checkboxesBeCheckedValidator(2);
const form: FormGroup = new FormGroup({ first: new FormControl(true) }, validator);
void form.errors;

import { arrayPatternMatch, isStringPatternMatch } from '@hmcts/rpx-xui-core-lib/node';
const matches: boolean = arrayPatternMatch(['pui-user-manager'], 'user-manager');
const singleMatch: boolean = isStringPatternMatch('pui-user-manager', '^pui-');
void [matches, singleMatch];

import { RpxTranslationConfig, RpxTranslationService, RpxTranslationModule, RpxTranslatePipe, type RpxLanguage, type Replacements } from '@hmcts/rpx-xui-core-lib/i18n';
import { RpxTranslationService as LegacyTranslationService } from 'rpx-xui-translation';
const translationConstructor: typeof RpxTranslationService = LegacyTranslationService;
const language: RpxLanguage = 'cy';
const replacements: Replacements = { name: 'Example' };
const configuration = new RpxTranslationConfig();
void [translationConstructor, language, replacements, configuration, RpxTranslationModule, RpxTranslatePipe];
