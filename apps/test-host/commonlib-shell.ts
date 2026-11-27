import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsMainWrapperModule, type HmctsBannerInfo } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import { HmctsPrimaryNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';

@Component({
  selector: 'core-commonlib-shell-host',
  imports: [HmctsMainWrapperModule, HmctsPrimaryNavigationModule, RouterOutlet],
  template: `<div>
    <button type="button" (click)="toggleLogin()">Toggle login</button>
    <button type="button" (click)="setExplicitNavigationLabel()">Set navigation label</button>
    <button type="button" (click)="useRouteBack()">Use route Back</button>
    <button type="button" (click)="showErrors()">Show errors</button>
    <button type="button" (click)="showValidSummary()">Set valid summary</button>
    <button type="button" (click)="showBanner()">Show banner</button>
    <button type="button" (click)="toggleWarning()">Toggle warning</button>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <p>Back events: {{ backEvents }}</p>
    <p>Action events: {{ actionEvents }}</p>
    <xuilib-hmcts-primary-navigation [userLoggedIn]="loggedIn" [label]="navigationLabel"
      [items]="navigationItems" [isBrandedHeader]="true" />
    <xuilib-hmcts-main-wrapper [backLink]="$any(backLink)" [title]="title" [summaryErrors]="$any(summaryErrors)"
      [banner]="$any(banner)" [actionButtons]="actionButtons" [showWarningMessage]="showWarning"
      (backEvent)="onBack()">
      <label for="case-reference">Case reference</label>
      <input id="case-reference" />
      <p>Projected organisation page</p>
    </xuilib-hmcts-main-wrapper>
    <router-outlet />
  </div>`,
})
class CommonLibShellGallery {
  loggedIn = false;
  navigationLabel = '';
  readonly navigationItems = [
    { text: '<strong>Open applications</strong>', href: '/open', active: true },
    { text: 'Closed applications', href: '/closed', active: false },
  ];
  backLink: string | undefined;
  title = 'Case list';
  summaryErrors: { header: string; isFromValid: boolean; items: { id: string; message: string }[] } | undefined;
  banner: HmctsBannerInfo | undefined;
  showWarning = false;
  backEvents = 0;
  actionEvents = 0;
  readonly actionButtons = [{ name: 'Archive', class: 'hmcts-button--secondary', action: () => { this.actionEvents += 1; } }];

  constructor(public readonly translations: RpxTranslationService) {}

  toggleLogin(): void { this.loggedIn = !this.loggedIn; }
  setExplicitNavigationLabel(): void { this.navigationLabel = 'Organisation navigation'; }
  useRouteBack(): void { this.backLink = '/cases'; }
  onBack(): void { this.backEvents += 1; }
  showErrors(): void { this.summaryErrors = { header: 'There is a problem', isFromValid: false, items: [{ id: 'case-reference', message: 'Enter a case reference' }] }; }
  showValidSummary(): void { this.summaryErrors = { header: 'There is a problem', isFromValid: true, items: [{ id: 'case-reference', message: 'Enter a case reference' }] }; }
  showBanner(): void { this.banner = { type: 'information', message: 'Organisation saved', title: 'Saved', showMessageIcon: true, messageBoldText: true }; }
  toggleWarning(): void { this.showWarning = !this.showWarning; }
}

@Component({ selector: 'core-commonlib-shell-destination', standalone: true, template: '<p>Navigation destination</p>' })
class NavigationDestination {}

@Component({
  selector: 'core-commonlib-shell-no-back-host',
  imports: [HmctsMainWrapperModule],
  template: `<button type="button" (click)="backLink = '/cases'">Set route Back</button>
    <xuilib-hmcts-main-wrapper [backLink]="backLink!" title="No Back">No Back route or event</xuilib-hmcts-main-wrapper>`,
})
class NoBackGallery {
  backLink: string | undefined;
}

export function startCommonlibShellGallery() {
  const root = window.location.pathname === '/commonlib-shell-no-back' ? NoBackGallery : CommonLibShellGallery;
  return bootstrapApplication(root, {
    providers: [importProvidersFrom(
      RouterModule.forRoot([
        { path: 'cases', component: NavigationDestination },
        { path: 'open', component: NavigationDestination },
        { path: 'closed', component: NavigationDestination },
      ]),
      RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
    )],
  });
}
