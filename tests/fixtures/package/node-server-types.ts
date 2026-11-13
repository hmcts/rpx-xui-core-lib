import type { XuiNodeOptions } from '@hmcts/rpx-xui-core-lib/node/server';
type PublishedRequest = import('express-serve-static-core').Request;
type PublishedSession = import('express-session').Session;
const options: XuiNodeOptions | undefined = undefined;
const isRefresh: PublishedRequest['isRefresh'] = true;
const passport: PublishedSession['passport'] = { user: 'consumer-defined' };
void [options, isRefresh, passport];
