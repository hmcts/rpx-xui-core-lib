import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { TermsAndConditionsComponent } from './terms-and-conditions.component';
import { TcDisplayHtmlComponent } from './tc-display/tc-display-html/tc-display-html.component';
import { TcDisplayPlainComponent } from './tc-display/tc-display-plain/tc-display-plain.component';

@NgModule({ declarations: [TermsAndConditionsComponent, TcDisplayHtmlComponent, TcDisplayPlainComponent], imports: [CommonModule, RpxTranslationModule], exports: [TermsAndConditionsComponent, TcDisplayHtmlComponent, TcDisplayPlainComponent] })
export class TermsDisplayModule {}
