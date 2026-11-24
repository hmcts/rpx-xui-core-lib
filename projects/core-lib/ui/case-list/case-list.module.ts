import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { BrowserService } from '@hmcts/rpx-xui-core-lib/browser/user-agent';
import { PaginationModule } from '@hmcts/rpx-xui-core-lib/ui/ccd-pagination';
import { CaseListComponent } from './case-list.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    PaginationModule,
    RpxTranslationModule.forChild()
  ],
  declarations: [CaseListComponent],
  exports: [CaseListComponent],
  providers: [
    BrowserService
  ]
})
export class CaseListModule { }
