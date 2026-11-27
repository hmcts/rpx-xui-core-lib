import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { FormGroupModule } from '@hmcts/rpx-xui-core-lib/ui/form-group';
import { GovRadioModule } from '@hmcts/rpx-xui-core-lib/ui/gov-radio';
import { GovUkRadiosComponent } from './gov-uk-radios.component';
@NgModule({ declarations: [GovUkRadiosComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule, FormGroupModule, GovRadioModule], exports: [GovUkRadiosComponent] })
export class GovRadiosModule {}
