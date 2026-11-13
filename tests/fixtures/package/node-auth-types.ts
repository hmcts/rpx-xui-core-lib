import '@hmcts/rpx-xui-core-lib/node/server/auth';
type PublishedRequest = import('express-serve-static-core').Request;
type PublishedSession = import('express-session').Session;
const isRefresh: PublishedRequest['isRefresh'] = true;
const passport: PublishedSession['passport'] = { user: 'consumer-defined' };
void [isRefresh, passport];
