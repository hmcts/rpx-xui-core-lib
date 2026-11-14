import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxPaginationModule, PaginatePipe } from 'ngx-pagination';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { PaginationComponent } from './pagination.component';

@NgModule({
  imports: [
    CommonModule,
    NgxPaginationModule,
    RpxTranslationModule.forChild()
  ],
  declarations: [
    PaginationComponent
  ],
  exports: [
    PaginationComponent,
    PaginatePipe
  ],
})
export class PaginationModule {}
