import { afterNextRender, Component, importProvidersFrom, Injectable } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SharedCase } from '@hmcts/rpx-xui-core-lib/case/sharing';
import { ShareCaseModule } from '@hmcts/rpx-xui-core-lib/case/share-case';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
// GOV.UK Frontend 5 does not ship TypeScript declarations for this entry.
// @ts-expect-error No declaration is provided by the installed package.
import { initAll } from 'govuk-frontend';

@Component({
  selector: 'core-test-host',
  imports: [ShareCaseModule, RouterOutlet],
  template: `<main>
    <xuilib-share-case title="Share cases" [addUserLabel]="label" confirmLink="/confirmation" [users]="users" [shareCases$]="store.cases" [removeUserFromCaseToggleOn]="true" [showRemoveUsers]="true" (synchronizeStore)="sync($event)" />
    <router-outlet />
  </main>`
})
class ShareCaseGallery {
  readonly label = new URLSearchParams(window.location.search).get('label') ?? 'Find a person';
  constructor(public readonly store: ShareCaseFixtureState) { afterNextRender(() => { document.body.classList.add('govuk-frontend-supported'); initAll(); }); }
  get users() { return this.store.users; }
  sync(cases: SharedCase[]) { this.store.cases.next(cases); }
}

@Injectable({ providedIn: 'root' })
class ShareCaseFixtureState {
  readonly users = [
    { idamId: 'one', firstName: 'Alex', lastName: 'Example', email: 'alex@example.invalid' },
    { idamId: 'two', firstName: 'Sam', lastName: 'Example', email: 'sam@example.invalid' }
  ];
  readonly cases = new BehaviorSubject<SharedCase[]>([{ caseId: 'case-one', caseTitle: 'Synthetic case', sharedWith: [this.users[0]] }]);
}

@Component({
  imports: [ShareCaseModule],
  template: `<h2>Confirm sharing</h2><xuilib-share-case-confirm [shareCases$]="store.cases" changeLink="/share-case" />`
})
class ShareCaseConfirmation {
  constructor(public readonly store: ShareCaseFixtureState) {}
}

export function startShareCaseGallery() {
  return bootstrapApplication(ShareCaseGallery, { providers: [provideRouter([{ path: 'confirmation', component: ShareCaseConfirmation }]), importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
}
