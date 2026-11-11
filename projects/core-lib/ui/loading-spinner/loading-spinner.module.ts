import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { LoadingSpinnerComponent } from './loading-spinner.component';

@NgModule({
  declarations: [LoadingSpinnerComponent],
  imports: [RpxTranslationModule],
  exports: [LoadingSpinnerComponent],
})
export class LoadingSpinnerModule {}
