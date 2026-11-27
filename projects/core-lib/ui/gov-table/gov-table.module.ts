import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovukTableComponent } from './gov-uk-table.component';

@NgModule({
  declarations: [GovukTableComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [GovukTableComponent],
})
export class GovTableModule {}
