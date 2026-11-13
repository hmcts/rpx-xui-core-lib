import { getLogger, type XuiLogger } from '@hmcts/rpx-xui-core-lib/node/server/logging';
const logger: XuiLogger = getLogger('consumer:logging');
logger.info('synthetic logging contract');
