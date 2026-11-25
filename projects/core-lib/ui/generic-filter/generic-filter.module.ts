import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { CapitalizeModule } from '@hmcts/rpx-xui-core-lib/ui/capitalize';
import { FindLocationModule } from '@hmcts/rpx-xui-core-lib/ui/find-location';
import { FindPersonModule } from '@hmcts/rpx-xui-core-lib/ui/find-person';
import { FindServiceModule } from '@hmcts/rpx-xui-core-lib/ui/find-service';
import { FindTaskNameModule } from '@hmcts/rpx-xui-core-lib/ui/find-task-name';
import { FindWorkTypeModule } from '@hmcts/rpx-xui-core-lib/ui/find-work-type';
import { GenericFilterComponent } from './generic-filter.component';

@NgModule({
  declarations: [GenericFilterComponent],
  imports: [
    CommonModule, ReactiveFormsModule, RpxTranslationModule, CapitalizeModule,
    FindLocationModule, FindPersonModule, FindServiceModule, FindTaskNameModule, FindWorkTypeModule,
  ],
  exports: [GenericFilterComponent],
})
export class GenericFilterModule {}
