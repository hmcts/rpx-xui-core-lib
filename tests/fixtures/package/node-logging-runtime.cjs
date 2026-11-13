const assert = require('node:assert/strict');
const { getLogger } = require('@hmcts/rpx-xui-core-lib/node/server/logging');

(async () => {
  const logger = getLogger('consumer:logging');
  assert.equal(typeof logger.info, 'function');
  logger.info('synthetic logging contract');
  await new Promise(resolve => setImmediate(resolve));
  const loaded = Object.keys(require.cache).map(path => path.replaceAll('\\', '/'));
  assert.ok(!loaded.some(path => /\/node\/server\/(?:auth|session|security)\//.test(path)), 'Logger entry must not load authentication, session or security code');
  assert.ok(!loaded.some(path => /\/node_modules\/(?:passport|redis|connect-redis|openid-client|otplib|helmet|@angular)\//.test(path)), 'Logger entry must not load unrelated runtime dependencies');
  assert.equal(getLogger, require('@hmcts/rpx-xui-core-lib/node/server').getLogger);
})().catch(error => { console.error(error); process.exitCode = 1; });
