import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { ServiceMessageComponent } from './service-message.component';
import { ServiceMessagesComponent } from './service-messages.component';

@NgModule({ declarations: [ServiceMessageComponent, ServiceMessagesComponent], imports: [CommonModule, RpxTranslationModule.forChild()], exports: [ServiceMessageComponent, ServiceMessagesComponent] })
export class ServiceMessagesModule {}
