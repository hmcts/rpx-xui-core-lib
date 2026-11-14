import { afterNextRender, Component, importProvidersFrom, Injectable, ViewEncapsulation } from '@angular/core';
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
  styleUrl: './sharing-gallery.scss',
  encapsulation: ViewEncapsulation.None,
  template: `<main>
    @if (store.delayed) { <button type="button" (click)="store.loadUsers()">Load users</button> }
    <xuilib-share-case title="Share cases" [addUserLabel]="label" confirmLink="/confirmation" [users]="users" [shareCases$]="store.cases" [removeUserFromCaseToggleOn]="true" [showRemoveUsers]="true" (synchronizeStore)="sync($event)" />
    @if (multiple) {
      <xuilib-share-case [idPrefix]="secondPrefix" title="Second share" addUserLabel="Second recipient" [users]="users" [shareCases$]="secondCases" />
    }
    <router-outlet />
  </main>`
})
class ShareCaseGallery {
  readonly multiple = new URLSearchParams(window.location.search).has('multiple');
  readonly secondPrefix = new URLSearchParams(window.location.search).get('prefix') ?? 'second-';
  readonly secondCases = new BehaviorSubject<SharedCase[]>([{ caseId: 'case-two', caseTitle: 'Second synthetic case', sharedWith: [] }]);
  readonly label = new URLSearchParams(window.location.search).get('label') ?? 'Find a person';
  constructor(public readonly store: ShareCaseFixtureState) { afterNextRender(() => { document.body.classList.add('govuk-frontend-supported'); initAll(); }); }
  get users() { return this.store.users; }
  sync(cases: SharedCase[]) { this.store.cases.next(cases); }
}

@Injectable({ providedIn: 'root' })
class ShareCaseFixtureState {
  readonly availableUsers = [
    { idamId: 'one', firstName: 'Alex', lastName: 'Example', email: 'alex@example.invalid' },
    { idamId: 'two', firstName: 'Sam', lastName: 'Example', email: 'sam@example.invalid' }
  ];
  readonly delayed = new URLSearchParams(window.location.search).has('delayed');
  users = this.delayed ? null as unknown as typeof this.availableUsers : this.availableUsers;
  readonly cases = new BehaviorSubject<SharedCase[]>([{ caseId: 'case-one', caseTitle: 'Synthetic case', sharedWith: [this.availableUsers[0]] }]);
  loadUsers() { this.users = this.availableUsers; }
}

@Component({
  imports: [ShareCaseModule],
  template: `<h2>Confirm sharing</h2><xuilib-share-case-confirm [shareCases$]="store.cases" changeLink="/share-case" />`
})
class ShareCaseConfirmation {
  constructor(public readonly store: ShareCaseFixtureState) {}
}

@Component({ template: '' })
class ShareCaseStart {}

export function startShareCaseGallery() {
  return bootstrapApplication(ShareCaseGallery, { providers: [provideRouter([{ path: 'share-case', component: ShareCaseStart }, { path: 'confirmation', component: ShareCaseConfirmation }]), importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
}
