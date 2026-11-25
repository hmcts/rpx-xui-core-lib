import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { CookieBannerModule } from '@hmcts/rpx-xui-core-lib/ui/cookie-banner';

@Component({
  selector: 'core-cookie-banner-host',
  imports: [CookieBannerModule, RouterOutlet],
  template: `<main>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <xuilib-cookie-banner
      identifier="core-cookie-banner-consent"
      appName="Case service"
      [enableDynatrace]="true"
      (acceptanceNotifier)="decision = 'accepted'"
      (rejectionNotifier)="decision = 'rejected'"
    />
    <p data-testid="cookie-decision">{{ decision }}</p>
    <router-outlet />
  </main>`,
})
class CookieBannerGallery {
  decision = '';

  constructor(public translations: RpxTranslationService) {}
}

@Component({ selector: 'core-cookie-details', template: '<h1>Cookie details</h1>' })
class CookieDetailsPage {}

@Component({ selector: 'core-cookie-banner-landing', template: '' })
class CookieBannerLanding {}

export function startCookieBannerGallery() {
  return bootstrapApplication(CookieBannerGallery, {
    providers: [
      importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false })),
      importProvidersFrom(RouterModule.forRoot([
        { path: 'cookies', component: CookieDetailsPage },
        { path: '**', component: CookieBannerLanding },
      ])),
    ],
  });
}
