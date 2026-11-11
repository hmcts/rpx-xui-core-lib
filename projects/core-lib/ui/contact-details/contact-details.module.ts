import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { ContactDetailsComponent } from './contact-details.component';

@NgModule({ declarations: [ContactDetailsComponent], imports: [RpxTranslationModule], exports: [ContactDetailsComponent] })
export class ContactDetailsModule {}
