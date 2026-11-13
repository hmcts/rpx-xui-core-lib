import type { FilterConfigOption } from '@hmcts/rpx-xui-core-lib/ui/search-location';

export function getValues(options: FilterConfigOption[], values: unknown[]): string[] {
  return options.reduce((acc: string[], option, index) => values[index] ? [...acc, option.key] : acc, []);
}
