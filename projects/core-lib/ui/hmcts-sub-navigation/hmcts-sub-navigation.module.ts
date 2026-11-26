import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsSubNavigationComponent } from './hmcts-sub-navigation.component';

@NgModule({
  declarations: [HmctsSubNavigationComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [HmctsSubNavigationComponent],
})
export class HmctsSubNavigationModule {}
