import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SearchLocationComponent } from './search-location.component';

@NgModule({ declarations: [SearchLocationComponent], imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, RpxTranslationModule], exports: [SearchLocationComponent] })
export class SearchLocationModule {}
