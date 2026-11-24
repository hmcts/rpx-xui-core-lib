import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SearchVenueComponent } from './search-venue.component';

@NgModule({
  declarations: [SearchVenueComponent],
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, RpxTranslationModule],
  exports: [SearchVenueComponent],
})
export class SearchVenueModule {}
