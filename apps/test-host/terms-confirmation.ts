import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { TermsConfirmationModule } from '@hmcts/rpx-xui-core-lib/terms/confirmation';

@Component({
  selector: 'core-terms-confirmation-host',
  imports: [TermsConfirmationModule],
  template: `
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <xuilib-tc-confirm buttonText="Confirm" (confirm)="onConfirm()" />
    <output data-testid="confirm-event-count">{{ confirmCount }}</output>
  `,
})
class TermsConfirmationGallery {
  confirmCount = 0;

  constructor(public translations: RpxTranslationService) {}

  onConfirm(): void {
    this.confirmCount += 1;
  }
}

export function startTermsConfirmationGallery() {
  return bootstrapApplication(TermsConfirmationGallery, {
    providers: [
      importProvidersFrom(
        RouterModule.forRoot([]),
        RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
      ),
    ],
  });
}
