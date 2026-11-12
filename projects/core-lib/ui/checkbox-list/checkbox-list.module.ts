import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { CheckboxListComponent } from './checkbox-list.component';

@NgModule({
  declarations: [CheckboxListComponent],
  imports: [CommonModule, RpxTranslationModule],
  exports: [CheckboxListComponent]
})
export class CheckboxListModule {}
