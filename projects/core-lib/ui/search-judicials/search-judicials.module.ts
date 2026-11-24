import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SearchJudicialsComponent } from './search-judicials.component';

@NgModule({
  declarations: [SearchJudicialsComponent],
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, RpxTranslationModule],
  exports: [SearchJudicialsComponent],
})
export class SearchJudicialsModule {}
