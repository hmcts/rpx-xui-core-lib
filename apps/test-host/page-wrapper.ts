import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { PageWrapperModule } from '@hmcts/rpx-xui-core-lib/ui/page-wrapper';

@Component({
  selector: 'core-page-wrapper-host',
  imports: [PageWrapperModule, RouterOutlet],
  template: `<main id="core-page-wrapper-host">
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <button type="button" (click)="removeOptionalShellContent()">Remove optional shell content</button>
    <exui-page-wrapper [title]="title" [fnTitle]="functionalTitle" [backLink]="backLink">
      <p>Projected page content</p>
    </exui-page-wrapper>
    <router-outlet />
  </main>`,
})
class PageWrapperGallery {
  title = 'Case list';
  functionalTitle = 'Case management';
  backLink = '/cases';

  constructor(public translations: RpxTranslationService) {}

  removeOptionalShellContent(): void {
    this.title = '';
    this.functionalTitle = '';
    this.backLink = '';
  }
}

@Component({
  selector: 'core-cases-destination',
  standalone: true,
  template: '<p>Cases route destination</p>',
})
class CasesDestination {}

export function startPageWrapperGallery() {
  return bootstrapApplication(PageWrapperGallery, {
    providers: [
      importProvidersFrom(
        RouterModule.forRoot([{ path: 'cases', component: CasesDestination }]),
        RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
      ),
    ],
  });
}
