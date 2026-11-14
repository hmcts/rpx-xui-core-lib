import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SelectedCaseListComponent } from './selected-case-list.component';
import { SelectedCaseConfirmComponent } from './selected-case-confirm.component';
import { SelectedCaseComponent } from './selected-case.component';

@NgModule({
  declarations: [SelectedCaseComponent, SelectedCaseListComponent, SelectedCaseConfirmComponent],
  imports: [CommonModule, RouterModule, RpxTranslationModule],
  exports: [SelectedCaseComponent, SelectedCaseListComponent, SelectedCaseConfirmComponent]
})
export class SelectedCaseModule {}
