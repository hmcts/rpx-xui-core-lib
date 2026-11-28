import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsIdentityBarComponent } from './hmcts-identity-bar.component';

@NgModule({
  declarations: [HmctsIdentityBarComponent],
  imports: [CommonModule, RpxTranslationModule],
  exports: [HmctsIdentityBarComponent],
})
export class HmctsIdentityBarModule {}
