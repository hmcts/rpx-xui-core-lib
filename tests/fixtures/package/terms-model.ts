import type { TCDocument } from '@hmcts/rpx-xui-core-lib/terms/models';

const terms: TCDocument = { version: 1, content: 'Synthetic terms', mimeType: 'text/plain' };
export const version: number = terms.version;
export const content: string = terms.content;
export const mimeType: string = terms.mimeType;
// @ts-expect-error Version is required.
const noVersion: TCDocument = { content: 'Synthetic', mimeType: 'text/plain' };
// @ts-expect-error Version must be numeric.
const badVersion: TCDocument = { version: '1', content: 'Synthetic', mimeType: 'text/plain' };
// @ts-expect-error Content is required.
const noContent: TCDocument = { version: 1, mimeType: 'text/plain' };
// @ts-expect-error Content must be text.
const badContent: TCDocument = { version: 1, content: 1, mimeType: 'text/plain' };
// @ts-expect-error MIME type is required.
const noMimeType: TCDocument = { version: 1, content: 'Synthetic' };
// @ts-expect-error MIME type must be text.
const badMimeType: TCDocument = { version: 1, content: 'Synthetic', mimeType: 1 };
void [noVersion, badVersion, noContent, badContent, noMimeType, badMimeType];
