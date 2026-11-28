import type {
  HmctsMainWrapperActionButton,
  HmctsBannerInfo,
  HmctsMainWrapperComponent,
  HmctsMainWrapperSummaryErrors,
} from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';

const action: HmctsMainWrapperActionButton = { name: 'Refresh', class: 'custom', action: () => undefined };
const banner: HmctsBannerInfo = { type: 'information', message: 'Saved', showMessageIcon: true };
const summary: HmctsMainWrapperSummaryErrors = { header: 'Problem', isFromValid: false, items: [{ id: 'name', message: 'Required' }] };
const component: Pick<HmctsMainWrapperComponent, 'backLink' | 'title' | 'summaryErrors' | 'banner' | 'actionButtons' | 'showWarningMessage'> = {
  backLink: '/cases', title: 'Case list', summaryErrors: summary, banner, actionButtons: [action], showWarningMessage: false,
};

void component;
