import '@hmcts/rpx-xui-core-lib/node/server/session';
type PublishedSession = import('express-session').Session;
const passport: PublishedSession['passport'] = { user: 'consumer-defined' };
void passport;
