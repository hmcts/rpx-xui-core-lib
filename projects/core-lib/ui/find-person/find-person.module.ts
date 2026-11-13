import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { FindPersonComponent } from './find-person.component';

@NgModule({ declarations: [FindPersonComponent], imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, RpxTranslationModule], exports: [FindPersonComponent] })
export class FindPersonModule {}
