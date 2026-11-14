import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { TabComponent } from './tab.component';
import { TabsComponent } from './tabs.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    RpxTranslationModule.forChild()
  ],
  declarations: [
    TabsComponent,
    TabComponent,
  ],
  exports: [
    TabsComponent,
    TabComponent,
  ]
})
export class TabsModule {}
