import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsErrorSummaryComponent } from './hmcts-error-summary.component';

@NgModule({
  declarations: [HmctsErrorSummaryComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [HmctsErrorSummaryComponent],
})
export class HmctsErrorSummaryModule {}
