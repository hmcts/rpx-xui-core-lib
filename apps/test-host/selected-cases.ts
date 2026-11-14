import { afterNextRender, Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SharedCase } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';
import { SelectedCaseModule } from '@hmcts/rpx-xui-core-lib/case/selected-case';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
// GOV.UK Frontend 5 does not ship TypeScript declarations for this entry.
// @ts-expect-error No declaration is provided by the installed package.
import { initAll } from 'govuk-frontend';

@Component({
  selector: 'core-test-host',
  imports: [SelectedCaseModule],
  template: `<main><h1>Selected cases</h1>
    <h2>Current cases</h2>
    <div class="govuk-accordion" data-module="govuk-accordion" id="accordion-with-summary-sections">
      <xuilib-selected-case-list [removeUserFromCaseToggleOn]="true" (synchronizeStore)="sync($event)" />
    </div>
    <h2>Confirmation</h2>
    <xuilib-selected-case-list [toConfirm]="true" changeLink="/selected-cases" />
  </main>`
})
class SelectedCasesGallery {
  constructor(private readonly state: CaseSharingStateService) {
    afterNextRender(() => { document.body.classList.add('govuk-frontend-supported'); initAll(); });
    const user = { idamId: 'one', firstName: 'Alex', lastName: 'Example', email: 'alex@example.invalid' };
    const cases: SharedCase[] = [{ caseId: 'case-one', caseTitle: 'Synthetic case', sharedWith: [user] }];
    if (new URLSearchParams(window.location.search).has('two')) cases.push({ caseId: 'case-two', caseTitle: 'Second case', sharedWith: [user] });
    state.setCases(cases);
  }
  sync(cases: SharedCase[]) { this.state.setCases(cases); }
}

export function startSelectedCasesGallery() {
  return bootstrapApplication(SelectedCasesGallery, { providers: [provideRouter([]), importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
}
