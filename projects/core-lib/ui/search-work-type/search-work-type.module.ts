import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SearchWorkTypeComponent } from './search-work-type.component';

@NgModule({ declarations: [SearchWorkTypeComponent], imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, RpxTranslationModule], exports: [SearchWorkTypeComponent] })
export class SearchWorkTypeModule {}
