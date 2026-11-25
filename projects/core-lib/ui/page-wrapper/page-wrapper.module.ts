import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { ExuiPageWrapperComponent } from './exui-page-wrapper.component';

@NgModule({
  declarations: [ExuiPageWrapperComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [ExuiPageWrapperComponent],
})
export class PageWrapperModule {}
