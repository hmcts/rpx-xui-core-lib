import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { BadgeColour, ContactDetailsModule, type ContactDetailsDataModel } from '@hmcts/rpx-xui-core-lib/ui/contact-details';

@Component({
  selector: 'core-contact-host',
  imports: [ContactDetailsModule],
  template: `<main>
    <h1>Contact details diagnostic</h1>
    <h2>Contact options</h2>
    <button type="button" (click)="show()">Show contact</button>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <button type="button" (click)="clear()">Clear contact</button>
    <button type="button" (click)="partial()">Partial contact</button>
    <xuilib-contact-details [data]="data" />
  </main>`,
})
class ContactGallery {
  data!: ContactDetailsDataModel;
  constructor(public translations: RpxTranslationService) {}
  clear() { this.data = undefined!; }
  partial() { this.data = { title: 'Help desk', badgeColour: BadgeColour.BADGE_BLUE, badgeText: 'Open', openingTimes: 'Monday to Friday' }; }
  show() {
    this.data = { title: 'Help desk', badgeColour: BadgeColour.BADGE_BLUE, badgeText: 'Open', email: 'help@example.test', phone: '0300 123 4567', openingTimes: 'Monday to Friday', contactDetails: { name: 'Support site', contactLink: 'https://example.test/help' } };
  }
}

export function startContactGallery() {
  return bootstrapApplication(ContactGallery, {
    providers: [importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }))],
  });
}
