import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { BannerModule } from '@hmcts/rpx-xui-core-lib/ui/banner';
import { HmctsErrorSummaryModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-error-summary';
import { HmctsMainWrapperComponent } from './hmcts-main-wrapper.component';

@NgModule({ declarations: [HmctsMainWrapperComponent], imports: [CommonModule, RouterModule, RpxTranslationModule, BannerModule, HmctsErrorSummaryModule], exports: [HmctsMainWrapperComponent] })
export class HmctsMainWrapperModule {}
