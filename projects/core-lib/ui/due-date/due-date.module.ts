import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { DueDateComponent } from './due-date.component';

@NgModule({ declarations: [DueDateComponent], imports: [CommonModule, RpxTranslationModule], exports: [DueDateComponent] })
export class DueDateModule {}
