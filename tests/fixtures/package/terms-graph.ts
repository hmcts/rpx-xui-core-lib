import type { TCDocument } from '@hmcts/rpx-xui-core-lib/terms/models';
export const getVersion = (terms: TCDocument): number => terms.version;
