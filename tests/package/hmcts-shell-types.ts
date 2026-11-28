import type { EventEmitter } from '@angular/core';
import {
  HmctsMainWrapperComponent,
  HmctsMainWrapperModule,
  type HmctsBannerInfo,
  type HmctsMainWrapperActionButton,
  type HmctsMainWrapperSummaryErrors,
} from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import { HmctsPrimaryNavigationComponent, HmctsPrimaryNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';

const summaryErrors: HmctsMainWrapperSummaryErrors = {
  header: 'There is a problem',
  isFromValid: false,
  items: [{ id: 'organisation-name', message: 'Enter a name' }],
};
const actionButtons: HmctsMainWrapperActionButton[] = [{ name: 'Continue', class: 'govuk-button--primary', action: () => ({}) }];
const banner: HmctsBannerInfo = { type: 'success', message: 'Saved' };
const wrapper = new HmctsMainWrapperComponent();
wrapper.backLink = '/organisations';
wrapper.summaryErrors = summaryErrors;
wrapper.actionButtons = actionButtons;
wrapper.banner = banner;
const backEvent: EventEmitter<void> = wrapper.backEvent;
const hasBackLink: boolean = wrapper.hasBackLink;

const navigation = new HmctsPrimaryNavigationComponent();
navigation.userLoggedIn = true;
const isUserLoggedIn: boolean | null | undefined = navigation.isUserLoggedIn;
navigation.label = 'Service navigation';
navigation.items = [{ active: true, href: '/organisations', text: 'Organisations' }];
navigation.isBrandedHeader = false;

export type HmctsShellPublicContract = [
  typeof HmctsMainWrapperModule,
  typeof HmctsPrimaryNavigationModule,
  EventEmitter<void>,
  boolean,
  boolean | null | undefined,
];
export const hmctsShellContract: HmctsShellPublicContract = [HmctsMainWrapperModule, HmctsPrimaryNavigationModule, backEvent, hasBackLink, isUserLoggedIn];
