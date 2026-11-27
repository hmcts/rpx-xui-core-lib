import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { FormGroupModule } from '@hmcts/rpx-xui-core-lib/ui/form-group';
import { GovUkRadioComponent } from './gov-uk-radio.component';
@NgModule({ declarations: [GovUkRadioComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule, FormGroupModule], exports: [GovUkRadioComponent] })
export class GovRadioModule {}
