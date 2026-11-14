import { NgModule } from '@angular/core';
import { DateInputModule } from '@hmcts/rpx-xui-core-lib/case/editor-date';

@NgModule({ imports: [DateInputModule], exports: [DateInputModule] })
export class FormModule {}
