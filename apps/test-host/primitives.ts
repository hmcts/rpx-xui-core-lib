import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { BannerModule } from '@hmcts/rpx-xui-core-lib/ui/banner';
import { FormLabelModule } from '@hmcts/rpx-xui-core-lib/ui/form-label';

@Component({
  selector: 'core-primitives-host',
  imports: [BannerModule, FormLabelModule],
  template: `<main>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <button type="button" (click)="heading = !heading">Toggle label heading</button>
    <button type="button" (click)="showBanner = !showBanner">Toggle banner</button>
    <xuilib-hmcts-banner [message]="showBanner ? 'Saved' : ''" type="success" title="Update" [showMessageIcon]="true" [messageBoldText]="true" />
    <xuilib-gov-label [config]="{label:'Case name', name:'caseName', id:'caseName', isPageHeading:heading, classes:'govuk-label--m', optional:'yes'}" />
    <input id="caseName" />
  </main>`,
})
class PrimitivesGallery {
  heading = true;
  showBanner = true;
  constructor(public translations: RpxTranslationService) {}
}
export function startPrimitivesGallery() {
  return bootstrapApplication(PrimitivesGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
