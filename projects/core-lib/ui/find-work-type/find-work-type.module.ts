import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { SearchWorkTypeModule } from '@hmcts/rpx-xui-core-lib/ui/search-work-type';
import { FindWorkTypeComponent } from './find-work-type.component';

@NgModule({ declarations: [FindWorkTypeComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, SearchWorkTypeModule], exports: [FindWorkTypeComponent] })
export class FindWorkTypeModule {}
