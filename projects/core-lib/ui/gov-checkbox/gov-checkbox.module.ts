import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { FormGroupModule } from '@hmcts/rpx-xui-core-lib/ui/form-group';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { GovUkCheckboxComponent } from './gov-uk-checkbox.component';

@NgModule({
  declarations: [GovUkCheckboxComponent],
  imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, FormGroupModule, GovInputModule],
  exports: [GovUkCheckboxComponent],
})
export class GovCheckboxModule {}
