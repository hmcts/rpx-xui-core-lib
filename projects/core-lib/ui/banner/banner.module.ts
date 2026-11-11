import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsBannerComponent } from './hmcts-banner.component';
@NgModule({ declarations: [HmctsBannerComponent], imports: [RpxTranslationModule.forChild()], exports: [HmctsBannerComponent] })
export class BannerModule {}
