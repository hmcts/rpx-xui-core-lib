import type { HmctsPrimaryNavigationComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';

const component: Pick<HmctsPrimaryNavigationComponent, 'userLoggedIn' | 'label' | 'items' | 'isBrandedHeader'> = {
  userLoggedIn: true,
  label: 'Account navigation',
  items: [{ active: true, href: '/cases', text: 'Cases' }],
  isBrandedHeader: false,
};

void component;
