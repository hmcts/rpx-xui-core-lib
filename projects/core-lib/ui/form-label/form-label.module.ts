import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovUkLabelComponent } from './gov-uk-label.component';
@NgModule({ declarations: [GovUkLabelComponent], imports: [RpxTranslationModule.forChild()], exports: [GovUkLabelComponent] })
export class FormLabelModule {}
