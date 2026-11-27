import type { EventEmitter } from '@angular/core';
import type { MatTabChangeEvent } from '@angular/material/tabs';
import type { LetContext, LetDirective } from '@hmcts/rpx-xui-core-lib/ui/let';
import type { TabComponent, TabItem } from '@hmcts/rpx-xui-core-lib/ui/tabs';

type Assert<T extends true> = T;
type AssertFalse<T extends false> = T;
type IsAssignable<Source, Target> = [Source] extends [Target] ? true : false;
type IsEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;

export type CommonLibLetContract = [
  LetContext<string>,
  typeof LetDirective<string>,
];

export type CommonLibTabsContract = [
  TabComponent,
  TabItem,
  Assert<IsEqual<TabComponent['tabChange'], EventEmitter<MatTabChangeEvent>>>,
  Assert<IsAssignable<TabItem, { text: string }>>,
  AssertFalse<IsAssignable<{ text: number }, TabItem>>,
];
