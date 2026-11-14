import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { AlertIconClassPipe } from './alert-icon-class.pipe';
import { AlertComponent } from './alert.component';

@NgModule({
  imports: [
    CommonModule,
    RpxTranslationModule.forChild()
  ],
  declarations: [
    AlertComponent,
    AlertIconClassPipe
  ],
  exports: [
    AlertComponent
  ]
})
export class AlertModule {}
