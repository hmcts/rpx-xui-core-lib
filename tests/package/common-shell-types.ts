import type { HmctsMainWrapperComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import type { HmctsPrimaryNavigationComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';
import type { HmctsIdentityBarComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-identity-bar';
import { GovukTableColumnConfig } from '@hmcts/rpx-xui-core-lib/ui/gov-table';
import type { GovukTableComponent } from '@hmcts/rpx-xui-core-lib/ui/gov-table';
import type { LetContext, LetDirective } from '@hmcts/rpx-xui-core-lib/ui/let';
export function configure(wrapper: HmctsMainWrapperComponent, nav: HmctsPrimaryNavigationComponent, identity: HmctsIdentityBarComponent, table: GovukTableComponent, context: LetContext<number>, directive: LetDirective<number>): void {
  wrapper.backLink = undefined;
  wrapper.summaryErrors = null;
  wrapper.summaryErrors = { header: 'Check', isFromValid: false, items: [{ id: 'field', message: 'Required' }] };
  wrapper.actionButtons = [{ name: 'Save', class: 'extra', action: () => 42 }];
  wrapper.backEvent.subscribe((value: void) => { console.log(value); });
  nav.items = [{ text: 'Home', active: true, href: '/home' }];
  nav.userLoggedIn = null;
  identity.content = { name: 'Synthetic organisation', extra: true };
  table.columnConfig = [new GovukTableColumnConfig()];
  table.rows = [{ date: new Date(), extra: true }];
  context.$implicit = 42;
  directive.xuilibLet = 0;
  // @ts-expect-error Back routes retain their string contract.
  wrapper.backLink = 42;
  // @ts-expect-error Column keys remain strings.
  table.columnConfig = [{ header: 'Invalid', key: 42 }];
  // @ts-expect-error Let retains its caller-selected generic.
  directive.xuilibLet = 'invalid';
}
