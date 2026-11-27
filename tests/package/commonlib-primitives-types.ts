import { LetContext, LetDirective } from '@hmcts/rpx-xui-core-lib/ui/let';
import { TabComponent, TabItem } from '@hmcts/rpx-xui-core-lib/ui/tabs';

const context: LetContext<string> = { $implicit: 'selected', xuilibLet: 'selected' };
const directive: typeof LetDirective<string> = LetDirective;
const item: TabItem = { text: 'History' };
declare const tabs: TabComponent;

tabs.tabChange.subscribe(event => {
  const index: number = event.index;
  const label: string = event.tab.textLabel;
  void index;
  void label;
});

// @ts-expect-error tab labels are strings in the public contract
const invalidItem: TabItem = { text: 3 };
void context;
void directive;
void item;
void invalidItem;
