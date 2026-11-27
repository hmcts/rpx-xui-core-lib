import { HmctsMainWrapperComponent, HmctsMainWrapperModule, type HmctsBannerInfo } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import { HmctsPrimaryNavigationComponent, HmctsPrimaryNavigationModule } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';

const banner: HmctsBannerInfo = { message: 'Saved', type: 'success', title: 'Complete', showMessageIcon: true, messageBoldText: true };
const wrapper = new HmctsMainWrapperComponent();
wrapper.backLink = '/cases';
wrapper.title = 'Case list';
wrapper.summaryErrors = { header: 'There is a problem', isFromValid: false, items: [{ id: 'case-reference', message: 'Enter a reference' }] };
wrapper.banner = banner;
wrapper.actionButtons = [{ name: 'Archive', class: 'secondary', action: () => ({}) }];
wrapper.showWarningMessage = false;

const navigation = new HmctsPrimaryNavigationComponent();
navigation.userLoggedIn = true;
navigation.label = '';
navigation.items = [{ active: true, href: '/open', text: 'Open cases' }];
navigation.isBrandedHeader = true;

void HmctsMainWrapperModule;
void HmctsPrimaryNavigationModule;
void wrapper;
void navigation;

// @ts-expect-error Banner types retain the source union.
const invalidBanner: HmctsBannerInfo = { message: 'Saved', type: 'error' };
void invalidBanner;

// The public error-message type remains as permissive as the CommonLib input.
wrapper.summaryErrors = { header: 'Legacy error payload', isFromValid: false, items: [{ id: 'field', message: 42 }] };
