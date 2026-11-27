import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { GovUkCheckboxesComponent } from './gov-uk-checkboxes.component';
@NgModule({ declarations: [GovUkCheckboxesComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule], exports: [GovUkCheckboxesComponent] })
export class GovCheckboxesModule {}
