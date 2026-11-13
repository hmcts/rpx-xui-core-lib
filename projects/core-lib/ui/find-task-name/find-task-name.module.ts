import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { FindTaskNameComponent } from './find-task-name.component';

@NgModule({ declarations: [FindTaskNameComponent], imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, RpxTranslationModule], exports: [FindTaskNameComponent] })
export class FindTaskNameModule {}
