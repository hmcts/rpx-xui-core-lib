import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { of } from 'rxjs';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { FeatureToggleService } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';
import { ServiceMessagesModule } from '@hmcts/rpx-xui-core-lib/ui/service-messages';

@Component({
  selector: 'core-test-host',
  imports: [ServiceMessagesModule],
  template: `<main><h1>Service messages diagnostic</h1><xuilib-service-messages [userRoles]="roles" featureToggleKey="messages" serviceMessageCookie="core-test-hidden" /></main>`
})
class ServiceMessagesGallery { readonly roles = ['caseworker']; }

export function startServiceMessagesGallery() {
  return bootstrapApplication(ServiceMessagesGallery, { providers: [
    { provide: FeatureToggleService, useValue: { getValue: () => of([{ index: 1, roles: 'caseworker', message_en: 'Service notice <strong>available</strong><img src="x" alt="" onerror="window.serviceMessageExecuted=true">', message_cy: '' }]) } },
    importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))
  ] });
}
