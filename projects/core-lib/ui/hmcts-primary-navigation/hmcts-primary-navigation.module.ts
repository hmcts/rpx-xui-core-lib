import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPrimaryNavigationComponent } from './hmcts-primary-navigation.component';

@NgModule({ declarations: [HmctsPrimaryNavigationComponent], imports: [CommonModule, RouterModule, RpxTranslationModule], exports: [HmctsPrimaryNavigationComponent] })
export class HmctsPrimaryNavigationModule {}
