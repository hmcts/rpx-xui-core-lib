import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { AccessibilityComponent } from './accessibility.component';

@NgModule({ declarations: [AccessibilityComponent], imports: [CommonModule, RpxTranslationModule], exports: [AccessibilityComponent] })
export class AccessibilityModule {}
