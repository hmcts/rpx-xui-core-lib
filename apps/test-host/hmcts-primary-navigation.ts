import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouterModule, RouterOutlet } from '@angular/router';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { HmctsPrimaryNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';

@Component({
  selector: 'core-hmcts-primary-navigation-host',
  imports: [HmctsPrimaryNavigationModule, RouterOutlet],
  template: `<div id="core-hmcts-primary-navigation-host">
    <button type="button" (click)="userLoggedIn = !userLoggedIn">Toggle login</button>
    <button type="button" (click)="isBrandedHeader = !isBrandedHeader">Toggle branded header</button>
    <button type="button" (click)="translations.language = 'cy'">Cymraeg</button>
    <xuilib-hmcts-primary-navigation
      [userLoggedIn]="userLoggedIn"
      [label]="label"
      [items]="items"
      [isBrandedHeader]="isBrandedHeader" />
    <router-outlet />
  </div>`,
})
class HmctsPrimaryNavigationGallery {
  userLoggedIn = true;
  label = '';
  isBrandedHeader = false;
  items = [
    { active: true, href: '/cases', text: 'Back' },
    { active: false, href: '/profile', text: 'Profile' },
  ];

  constructor(public translations: RpxTranslationService) {}
}

@Component({ selector: 'core-primary-navigation-destination', standalone: true, template: '<p>Primary navigation destination</p>' })
class PrimaryNavigationDestination {}

export function startHmctsPrimaryNavigationGallery() {
  return bootstrapApplication(HmctsPrimaryNavigationGallery, {
    providers: [
      importProvidersFrom(
        RouterModule.forRoot([
          { path: 'cases', component: PrimaryNavigationDestination },
          { path: 'profile', component: PrimaryNavigationDestination },
        ]),
        RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false }),
      ),
    ],
  });
}
