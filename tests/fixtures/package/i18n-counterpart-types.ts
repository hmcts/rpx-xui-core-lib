import { RpxTranslationService, RpxTranslationModule, RpxTranslationConfig, RpxTranslatePipe, YesOrNoValue,
  type RpxLanguage, type Replacements, type ValidityDurationSpec } from 'rpx-xui-translation';
import * as core from '@hmcts/rpx-xui-core-lib/i18n';
const service: typeof core.RpxTranslationService = RpxTranslationService;
const module: typeof core.RpxTranslationModule = RpxTranslationModule;
const pipe: typeof core.RpxTranslatePipe = RpxTranslatePipe;
const config: core.RpxTranslationConfig = new RpxTranslationConfig();
const language: RpxLanguage = 'cy';
const replacements: Replacements = { LABEL: 'Fictional' };
const validity: ValidityDurationSpec = { days: 1 };
const answer: core.YesOrNoValue = YesOrNoValue.YES;
export { service, module, pipe, config, language, replacements, validity, answer };
