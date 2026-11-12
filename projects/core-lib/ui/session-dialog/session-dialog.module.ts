import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsSessionDialogComponent } from './hmcts-session-dialog.component';

@NgModule({ declarations: [HmctsSessionDialogComponent], imports: [CommonModule, RpxTranslationModule.forChild()], exports: [HmctsSessionDialogComponent] })
export class SessionDialogModule {}
