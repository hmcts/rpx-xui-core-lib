import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { DateInputComponent } from './date-input.component';

@NgModule({ imports: [CommonModule, RpxTranslationModule.forChild()], declarations: [DateInputComponent], exports: [DateInputComponent] })
export class DateInputModule {}
