import type { Pagination } from '@hmcts/rpx-xui-core-lib/ui/pagination';

// Shape used by Manage Org's user table.
export const page: Pagination = { itemsPerPage: 50, currentPage: 0, totalItems: 12 };
// @ts-expect-error All three legacy pagination fields remain required.
export const incomplete: Pagination = { currentPage: 0, totalItems: 12 };
// @ts-expect-error Page indexes remain numeric.
export const invalid: Pagination = { itemsPerPage: 50, currentPage: '0', totalItems: 12 };
