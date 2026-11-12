import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovUkInputComponent } from './components/gov-uk-input/gov-uk-input.component';
import { GovUkLabelComponent } from './components/gov-uk-label/gov-uk-label.component';
import { GovUkErrorMessageComponent } from './components/gov-uk-error-message/gov-uk-error-message.component';
@NgModule({declarations: [GovUkInputComponent, GovUkLabelComponent, GovUkErrorMessageComponent], imports: [CommonModule, ReactiveFormsModule, RpxTranslationModule], exports: [GovUkInputComponent, GovUkLabelComponent, GovUkErrorMessageComponent]})
export class GovInputModule {}
