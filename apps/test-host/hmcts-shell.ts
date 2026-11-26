import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsErrorSummaryModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-error-summary';
import { HmctsSubNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-sub-navigation';

@Component({
  selector: 'core-hmcts-shell-host',
  imports: [HmctsErrorSummaryModule, HmctsSubNavigationModule],
  template: `<main>
    <h1>Case management</h1>
    <button type="button" (click)="showErrors()">Show errors</button>
    <button type="button" (click)="clearErrors()">Clear errors</button>
    <button type="button" (click)="showWarning()">Show warning</button>
    <xuilib-hmcts-sub-navigation [label]="'Case tasks'" [items]="navigationItems" />
    <xuilib-hmcts-error-summary [errorMessages]="errors" [header]="'There is a problem'" [showWarningMessage]="warning" />
    <label for="case-reference">Case reference</label>
    <input id="case-reference" />
    <label for="case:reference">Case reference with punctuation</label>
    <input id="case:reference" />
    <div id="missing-field"></div>
  </main>`,
})
class HmctsShellGallery {
  errors: Array<{ id: string; message: string }> = [];
  warning = false;
  readonly navigationItems = [
    { text: 'Open cases', href: '/cases/open', active: true, roundel: 3 },
    { text: 'Closed cases', href: '/cases/closed', active: false },
  ];

  showErrors(): void {
    this.warning = false;
    this.errors = [
      { id: 'case-reference', message: 'Enter the case reference' },
      { id: 'case:reference', message: 'Enter the second case reference' },
      { id: 'not-present', message: 'A field that is not on this page' },
    ];
  }

  clearErrors(): void {
    this.warning = false;
    this.errors = [];
  }

  showWarning(): void {
    this.warning = true;
    this.errors = [{ id: 'case-reference', message: 'A service notice is active' }];
  }
}

export function startHmctsShellGallery() {
  return bootstrapApplication(HmctsShellGallery, {
    providers: [
      importProvidersFrom(
        RouterModule.forRoot([{ path: 'hmcts-shell', component: HmctsShellGallery }]),
        RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
      ),
    ],
  });
}
