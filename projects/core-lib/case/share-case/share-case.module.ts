import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RouterModule } from '@angular/router';
import { SelectedCaseModule } from '@hmcts/rpx-xui-core-lib/case/selected-case';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { HmctsErrorSummaryComponent } from './hmcts-error-summary.component';
import { ShareCaseComponent } from './share-case.component';
import { ShareCaseConfirmComponent } from './share-case-confirm.component';
import { UserSelectComponent } from './user-select.component';

@NgModule({
  declarations: [HmctsErrorSummaryComponent, ShareCaseComponent, ShareCaseConfirmComponent, UserSelectComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, RouterModule, SelectedCaseModule, RpxTranslationModule, GovInputModule],
  exports: [ShareCaseComponent, ShareCaseConfirmComponent, UserSelectComponent]
})
export class ShareCaseModule {}
