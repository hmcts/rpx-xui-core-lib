import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsMainWrapperModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import { HmctsPrimaryNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';
import { HmctsIdentityBarModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-identity-bar';
import { GovTableModule } from '@hmcts/rpx-xui-core-lib/ui/gov-table';
import { LetModule } from '@hmcts/rpx-xui-core-lib/ui/let';

@Component({ selector: 'core-shell-destination', template: '<p data-testid="destination">Routed destination</p>' })
class ShellDestination {}
@Component({ selector: 'core-test-host', imports: [HmctsMainWrapperModule, HmctsPrimaryNavigationModule, HmctsIdentityBarModule, GovTableModule, LetModule, RouterOutlet], template: `
<aside aria-label="Gallery controls"><button (click)="loggedIn = !loggedIn" type="button">Toggle login</button><button (click)="showErrors = !showErrors" type="button">Toggle errors</button><button (click)="letValue = letValue === 0 ? false : 0" type="button">Toggle Let value</button></aside>
<xuilib-hmcts-primary-navigation [userLoggedIn]="loggedIn" label="Synthetic services" [items]="items" />
<xuilib-hmcts-identity-bar [content]="identity" />
<xuilib-hmcts-main-wrapper title="CommonLib shell migration" [backLink]="backLink" (backEvent)="backs = backs + 1" [banner]="banner" [actionButtons]="actions" [summaryErrors]="showErrors ? errors : null">
<p>Projected content</p><input id="synthetic-field" aria-label="Synthetic field" />
<output data-testid="back-events">{{backs}}</output><output data-testid="actions">{{actionCount}}</output>
<p *xuilibLet="letValue; let value" data-testid="let-value">{{value}}</p>
<xuilib-gov-uk-table caption="Synthetic cases" [columnConfig]="columns" [rows]="rows" />
<xuilib-gov-uk-table caption="Date headers" [columnConfig]="dateColumns" [rows]="rows" />
<router-outlet /></xuilib-hmcts-main-wrapper>` })
class CommonShellGallery {
  loggedIn = true;
  showErrors = false;
  letValue: number | boolean = 0;
  identity = { name: 'Synthetic organisation' };
  banner = { type: 'success' as const, message: 'Synthetic saved message' };
  items = [{ active: true, href: '/common-shell/home', text: '<strong>Home</strong>' }, { active: false, href: '/common-shell/next', text: 'Next' }, { active: false, href: '/common-shell/safe', text: '<img alt="" src=x onerror="window.coreShellInjected=true">Safe' }];
  backLink = new URLSearchParams(window.location.search).has('routed') ? '/common-shell/previous' : undefined;
  backs = 0;
  actionCount = 0;
  actions = [{ name: 'Save action', class: 'govuk-button--secondary', action: () => { this.actionCount += 1; return {}; } }];
  errors = { header: 'Check the form', isFromValid: false, items: [{ id: 'synthetic-field', message: 'Synthetic field is required' }] };
  columns = [{ header: 'Case', key: 'name', type: 'link' }, { header: 'Created', key: 'date', type: 'date' }];
  dateColumns = [{ header: 'Created', key: 'date', type: 'date' }];
  rows = [{ name: 'Synthetic case', date: new Date('2026-11-27T12:00:00Z'), routerLink: '/common-shell/case' }, { name: 'Unlinked case', date: new Date('2026-11-26T12:00:00Z') }];
}
export function startCommonShellGallery() {
  return bootstrapApplication(CommonShellGallery, { providers: [provideRouter([{ path: '**', component: ShellDestination }]), importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))] });
}
