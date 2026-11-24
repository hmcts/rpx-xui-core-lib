import type * as State from '@hmcts/rpx-xui-core-lib/ui/filter-state';
import type * as SearchLocation from '@hmcts/rpx-xui-core-lib/ui/search-location';

type StateFieldTypes = [
  State.FilterPersistence, State.FilterFieldConfig, State.FilterConfigOption,
  State.FilterFieldOption, State.GroupOptions,
];
type SearchLocationFieldTypes = [
  SearchLocation.FilterPersistence, SearchLocation.FilterFieldConfig, SearchLocation.FilterConfigOption,
  SearchLocation.FilterFieldOption, SearchLocation.GroupOptions,
];

type Assert<T extends true> = T;
export type SharedFilterFieldTypes = Assert<StateFieldTypes extends SearchLocationFieldTypes
  ? SearchLocationFieldTypes extends StateFieldTypes ? true : false
  : false>;
