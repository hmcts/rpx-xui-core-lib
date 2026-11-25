import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { CookieBannerComponent } from './cookie-banner.component';

@NgModule({
  declarations: [CookieBannerComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [CookieBannerComponent],
})
export class CookieBannerModule {}
