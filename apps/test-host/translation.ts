import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';

@Component({
  selector: 'core-translation-host',
  imports: [RpxTranslationModule],
  template: `<main>
    <h1>Translation diagnostic pilot</h1>
    <p>{{ failure ? 'Simulated service failure' : 'Local synthetic translation service' }}</p>
    <a [href]="failure ? '/translation' : '/translation?scenario=failure'">{{ failure ? 'Try a successful response' : 'Try service failure' }}</a>
    <button type="button" (click)="translations.language = 'en'">English</button>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <p data-testid="language">{{ translations.language }}</p>
    @let translated = phrase | rpxTranslate;
    <p data-testid="translation" [attr.lang]="translated === 'Helo byd' ? 'cy' : 'en'">{{ translated }}</p>
  </main>`,
})
class TranslationGallery {
  readonly failure = new URLSearchParams(window.location.search).get('scenario') === 'failure';
  // The synthetic gallery has one Welsh response; source, loading and failure text are English.
  readonly phrase: string = this.failure ? 'Service unavailable' : 'Hello world';
  constructor(public translations: RpxTranslationService) {}
}

export function startTranslationGallery() {
  const failure = new URLSearchParams(window.location.search).get('scenario') === 'failure';
  return bootstrapApplication(TranslationGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({
      baseUrl: failure ? '/translations/failure' : '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false,
    }))],
  });
}
