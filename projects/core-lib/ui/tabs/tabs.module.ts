import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { TabComponent } from './tab.component';

@NgModule({ declarations: [TabComponent], imports: [CommonModule, MatTabsModule, RpxTranslationModule], exports: [TabComponent] })
export class TabsModule {}
