import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import {
  HmctsMainWrapperModule,
  type HmctsMainWrapperActionButton,
  type HmctsMainWrapperBanner,
  type HmctsMainWrapperSummaryErrors,
} from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';

@Component({
  selector: 'core-hmcts-main-wrapper-host',
  imports: [HmctsMainWrapperModule, RouterOutlet],
  template: `<div id="core-hmcts-main-wrapper-host">
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <button type="button" (click)="backLink = undefined">Use event back action</button>
    <button type="button" (click)="showErrors()">Show errors</button>
    <button type="button" (click)="showWarningMessage = true">Show warning</button>
    <button type="button" (click)="clearOptionalContent()">Clear optional content</button>
    <xuilib-hmcts-main-wrapper
      [backLink]="backLink"
      [title]="title"
      [summaryErrors]="summaryErrors"
      [banner]="banner"
      [actionButtons]="actionButtons"
      [showWarningMessage]="showWarningMessage"
      (backEvent)="onBack()">
      <p>Projected wrapper content</p>
      <output data-testid="back-count">{{backCount}}</output>
      <output data-testid="action-count">{{actionCount}}</output>
    </xuilib-hmcts-main-wrapper>
    <router-outlet />
  </div>`,
})
class HmctsMainWrapperGallery {
  backLink: string | undefined = '/cases';
  title = 'Case list';
  summaryErrors: HmctsMainWrapperSummaryErrors = { header: 'There is a problem', isFromValid: true, items: [{ id: 'missing', message: 'Check your answers' }] };
  banner: HmctsMainWrapperBanner | undefined = { type: 'information', title: 'Information', message: 'Updates saved' };
  actionButtons: HmctsMainWrapperActionButton[] = [{ name: 'Refresh', class: 'custom-action', action: () => this.actionCount++ }];
  showWarningMessage = false;
  backCount = 0;
  actionCount = 0;

  constructor(public translations: RpxTranslationService) {}

  showErrors(): void {
    this.summaryErrors = { ...this.summaryErrors, isFromValid: false };
  }

  onBack(): void {
    this.backCount++;
  }

  clearOptionalContent(): void {
    this.backLink = undefined;
    this.title = '';
    this.summaryErrors = { ...this.summaryErrors, isFromValid: true, items: [] };
    this.banner = undefined;
    this.actionButtons = [];
  }
}

@Component({ selector: 'core-cases-destination', standalone: true, template: '<p>Cases route destination</p>' })
class CasesDestination {}

export function startHmctsMainWrapperGallery() {
  return bootstrapApplication(HmctsMainWrapperGallery, {
    providers: [
      importProvidersFrom(
        RouterModule.forRoot([{ path: 'cases', component: CasesDestination }]),
        RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
      ),
    ],
  });
}
