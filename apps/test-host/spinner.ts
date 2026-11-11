import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { LoadingSpinnerModule } from '@hmcts/rpx-xui-core-lib/ui/loading-spinner';

@Component({
  selector: 'core-spinner-host',
  imports: [LoadingSpinnerModule],
  template: `<main>
    <div style="position:relative; z-index:100">
      <button type="button" (click)="message = 'Searching'">Custom message</button>
      <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
      <button type="button" (click)="visible = false">Hide spinner</button>
      <button type="button" (click)="visible = true">Show spinner</button>
    </div>
    @if (visible) {
      <xuilib-loading-spinner />
      <xuilib-loading-spinner [loadingText]="message" />
    }
  </main>`,
})
class SpinnerGallery {
  message = 'Loading';
  visible = true;
  constructor(public translations: RpxTranslationService) {}
}

export function startSpinnerGallery() {
  return bootstrapApplication(SpinnerGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
