import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { PaginationComponent } from './pagination.component';

@NgModule({
  declarations: [PaginationComponent],
  imports: [CommonModule, RpxTranslationModule],
  exports: [PaginationComponent],
})
export class PaginationModule {}
