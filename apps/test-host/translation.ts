import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';

@Component({
  selector: 'core-translation-host',
  imports: [RpxTranslationModule],
  template: `<main>
    <h1>Translation diagnostic pilot</h1>
    <button type="button" (click)="translations.language = 'en'">English</button>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <p data-testid="language">{{ translations.language }}</p>
    <p data-testid="translation">{{ 'Hello world' | rpxTranslate }}</p>
  </main>`,
})
class TranslationGallery {
  constructor(public translations: RpxTranslationService) {}
}

export function startTranslationGallery() {
  return bootstrapApplication(TranslationGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({
      baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false,
    }))],
  });
}
