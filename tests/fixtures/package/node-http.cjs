const assert = require('node:assert/strict');
const { createServer } = require('node:http');
require('@hmcts/rpx-xui-core-lib/node');
assert.ok(Object.keys(require.cache).every((path) => !/[/\\]node_modules[/\\]axios[/\\]/.test(path)), 'Lightweight Node entry loaded Axios');
const { createRequire } = require('node:module');
const axios = createRequire(require.resolve('@hmcts/rpx-xui-core-lib/node/http'))('axios');
const previousDefault = axios.defaults.headers.common['Content-Type'];
const { http } = require('@hmcts/rpx-xui-core-lib/node/http');
assert.equal(require('@hmcts/rpx-xui-core-lib/node/http').http, http);
assert.equal(axios.defaults.headers.common['Content-Type'], 'application/json');
assert.equal(http.defaults.headers.common['Content-Type'], previousDefault);
const originalDelete = http.delete;
const sentinel = new Proxy(originalDelete, {});
http.delete = sentinel;
assert.equal(require('@hmcts/rpx-xui-core-lib/node/http').http.delete, sentinel);
http.delete = originalDelete;

(async () => {
  const server = createServer((req, res) => {
    if (req.url === '/failure') { res.statusCode = 503; res.end(); return; }
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ body: JSON.parse(body), contentType: req.headers['content-type'] }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const result = await http.post(`${url}/echo`, { message: 'example' });
    assert.deepEqual(result.data.body, { message: 'example' });
    assert.match(result.data.contentType, /^application\/json/);
    await assert.rejects(http.get(`${url}/failure`), (error) => axios.isAxiosError(error) && /** @type {{ response?: { status?: number } }} */ (error).response?.status === 503);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve(undefined)));
  }
  console.log('Installed Node HTTP client preserves singleton, defaults, requests and failures');
})().catch((error) => { console.error(error); process.exitCode = 1; });
