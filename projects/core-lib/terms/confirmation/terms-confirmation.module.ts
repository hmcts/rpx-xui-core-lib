import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { TcConfirmComponent } from './tc-confirm.component';

@NgModule({
  declarations: [TcConfirmComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [TcConfirmComponent],
})
export class TermsConfirmationModule {}
