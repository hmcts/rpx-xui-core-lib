import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { AccessibilityModule } from '@hmcts/rpx-xui-core-lib/ui/accessibility';

@Component({
  selector: 'core-accessibility-host',
  imports: [AccessibilityModule],
  template: `<main><button type="button" (click)="translations.language = 'cy'">Cymraeg</button><xuilib-accessibility /></main>`,
})
class AccessibilityGallery {
  constructor(public translations: RpxTranslationService) {}
}

export function startAccessibilityGallery() {
  return bootstrapApplication(AccessibilityGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
