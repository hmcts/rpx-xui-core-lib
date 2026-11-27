import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { GovUkTextareaComponent } from './gov-uk-textarea.component';
@NgModule({ declarations: [GovUkTextareaComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule], exports: [GovUkTextareaComponent] })
export class GovTextareaModule {}
