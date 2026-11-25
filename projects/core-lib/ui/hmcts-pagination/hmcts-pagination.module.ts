import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxPaginationModule } from 'ngx-pagination';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPaginationComponent } from './hmcts-pagination.component';

@NgModule({
  declarations: [HmctsPaginationComponent],
  imports: [CommonModule, NgxPaginationModule, RpxTranslationModule],
  exports: [HmctsPaginationComponent],
})
export class HmctsPaginationModule {}
