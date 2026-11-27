import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import { GovUkFileUploadComponent } from './gov-uk-file-upload.component';
@NgModule({ declarations: [GovUkFileUploadComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule, GovInputModule], exports: [GovUkFileUploadComponent] })
export class GovFileUploadModule {}
