import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsMainWrapperModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import { HmctsPrimaryNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';
import { HmctsSubNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-sub-navigation';

@Component({
  selector: 'core-hmcts-shell-host',
  imports: [HmctsMainWrapperModule, HmctsPrimaryNavigationModule, HmctsSubNavigationModule],
  template: `<div id="core-hmcts-shell-host">
    <button type="button" (click)="showErrors()">Show errors</button>
    <button type="button" (click)="showErrors()">Show wrapper errors</button>
    <button type="button" (click)="clearErrors()">Clear errors</button>
    <button type="button" (click)="showWarning()">Show warning</button>
    <button type="button" (click)="showBanner()">Show wrapper banner</button>
    <button type="button" (click)="enableRouteBackLink()">Enable route back link</button>
    <button type="button" (click)="signOut()">Sign out</button>
    <button type="button" (click)="signIn()">Sign in</button>
    <button type="button" (click)="toggleBrandedHeader()">Toggle branded header</button>
    <button type="button" (click)="clearNavigationLabel()">Clear navigation label</button>
    <xuilib-hmcts-primary-navigation
      [userLoggedIn]="userLoggedIn"
      [label]="navigationLabel"
      [items]="primaryNavigationItems"
      [isBrandedHeader]="brandedHeader" />
    <xuilib-hmcts-sub-navigation [label]="'Case tasks'" [items]="navigationItems" />
    <xuilib-hmcts-main-wrapper
      [backLink]="backLink"
      [title]="'Case management'"
      [summaryErrors]="summaryErrors"
      [banner]="banner"
      [actionButtons]="actionButtons"
      [showWarningMessage]="warning"
      (backEvent)="onBack()">
      <label for="case-reference">Case reference</label>
      <input id="case-reference" />
      <label for="case:reference">Case reference with punctuation</label>
      <input id="case:reference" />
      <label for="organisation-name">Organisation name</label>
      <input id="organisation-name" />
      <p>Wrapper projected content</p>
    </xuilib-hmcts-main-wrapper>
    <p>Back events: {{ backEvents }}</p>
    <p>Action events: {{ actionEvents }}</p>
  </div>`,
})
class HmctsShellGallery {
  summaryErrors = { header: 'There is a problem', isFromValid: false, items: [] as Array<{ id: string; message: string }> };
  warning = false;
  userLoggedIn = true;
  navigationLabel: string | undefined = 'Service navigation';
  brandedHeader = false;
  backLink: string | undefined;
  banner: { type: 'warning' | 'success' | 'information'; message: string } | undefined;
  backEvents = 0;
  actionEvents = 0;
  readonly actionButtons = [{ name: 'Review details', class: '', action: () => { this.actionEvents += 1; return {}; } }];
  readonly navigationItems = [
    { text: 'Open cases', href: '/cases/open', active: true, roundel: 3 },
    { text: 'Closed cases', href: '/cases/closed', active: false },
  ];
  readonly primaryNavigationItems = [
    { text: 'Organisations', href: '/organisations', active: true },
    { text: 'Users', href: '/users', active: false },
  ];

  showErrors(): void {
    this.warning = false;
    this.banner = undefined;
    this.summaryErrors = { header: 'There is a problem', isFromValid: false, items: [
      { id: 'case-reference', message: 'Enter the case reference' },
      { id: 'case:reference', message: 'Enter the second case reference' },
      { id: 'not-present', message: 'A field that is not on this page' },
      { id: 'organisation-name', message: 'Enter the organisation name' },
    ] };
  }

  clearErrors(): void {
    this.warning = false;
    this.banner = undefined;
    this.summaryErrors = { header: 'There is a problem', isFromValid: false, items: [] };
  }

  showWarning(): void {
    this.warning = true;
    this.summaryErrors = { header: 'There is a problem', isFromValid: false, items: [{ id: 'case-reference', message: 'A service notice is active' }] };
  }

  showBanner(): void {
    this.banner = { type: 'success', message: 'Organisation updated' };
  }

  enableRouteBackLink(): void {
    this.backLink = '/hmcts-shell';
  }

  onBack(): void {
    this.backEvents += 1;
  }

  signOut(): void {
    this.userLoggedIn = false;
  }

  signIn(): void {
    this.userLoggedIn = true;
  }

  toggleBrandedHeader(): void {
    this.brandedHeader = !this.brandedHeader;
  }

  clearNavigationLabel(): void {
    this.navigationLabel = '';
  }
}

export function startHmctsShellGallery() {
  return bootstrapApplication(HmctsShellGallery, {
    providers: [
      importProvidersFrom(
        RouterModule.forRoot([
          { path: 'hmcts-shell', component: HmctsShellGallery },
          { path: 'cases', component: HmctsShellGallery },
          { path: 'organisations', component: HmctsShellGallery },
          { path: 'users', component: HmctsShellGallery },
        ]),
        RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
      ),
    ],
  });
}
