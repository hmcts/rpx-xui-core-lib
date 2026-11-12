import { Component, ViewChild, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { TermsAndConditionsComponent, TermsDisplayModule } from '@hmcts/rpx-xui-core-lib/terms/display';
import type { TCDocument } from '@hmcts/rpx-xui-core-lib/terms/models';

@Component({ selector: 'core-test-host', imports: [TermsDisplayModule], template: `
  <main><button (click)="html()">HTML</button><button (click)="plain()">Plain text</button>
  <button (click)="unsupported()">Unsupported</button><button (click)="traceSanitizer()">Trace sanitizer</button><button (click)="translations.language = 'cy'">Cymraeg</button>
  <button (click)="translations.language = 'en'">English</button>
  <xuilib-terms-and-conditions [document]="document" /><output data-testid="sanitized-input">{{ sanitizedInput }}</output></main>` })
class TermsDisplayGallery {
  @ViewChild(TermsAndConditionsComponent) component!: TermsAndConditionsComponent;
  sanitizedInput = '';
  traceSanitizer() {
    const sanitize = this.component.sanitizeHtml.bind(this.component);
    this.component.sanitizeHtml = content => { this.sanitizedInput = content ?? ''; return sanitize(content); };
  }
  document: TCDocument = {version: 1, mimeType: 'text/html', content: '<strong>Synthetic terms</strong><a href="javascript:alert(1)">Link</a><script>ignored</script>'};
  constructor(public translations: RpxTranslationService) {}
  html() { this.document = {version: 1, mimeType: 'text/html', content: '<strong>Synthetic terms</strong><a href="javascript:alert(1)">Link</a><script>ignored</script>'}; }
  plain() { this.document = {version: 1, mimeType: 'text/plain', content: '<strong>Synthetic text</strong>'}; }
  unsupported() { this.document = {version: 1, mimeType: 'application/unknown', content: 'synthetic'}; }
}
export function startTermsDisplayGallery() {
  return bootstrapApplication(TermsDisplayGallery, {providers: [importProvidersFrom(RpxTranslationModule.forRoot({baseUrl: '/translations', debounceTimeMs: 20, validity: {days: 1}, testMode: false}))]});
}
