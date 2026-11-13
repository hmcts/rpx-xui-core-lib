import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { csp, getContentSecurityPolicy, SECURITY_POLICY } from '@hmcts/rpx-xui-core-lib/node/server/security';
import { startCspHost } from './node-security-host.mjs';

const require = createRequire(import.meta.url);
const previousPubSub = process.env.WEBPUBSUB_URL;
process.env.WEBPUBSUB_URL = 'wss://synthetic-webpubsub.test';
/** @type {typeof import('./node-security-config.cjs').policies} */
let policies;
try { ({ policies } = require('./node-security-config.cjs')); }
finally {
  if (previousPubSub === undefined) delete process.env.WEBPUBSUB_URL;
  else process.env.WEBPUBSUB_URL = previousPubSub;
}
const sentinel = {};
assert.equal(getContentSecurityPolicy({ contentSecurityPolicy: policy => { assert.equal(policy, SECURITY_POLICY); return sentinel; } }), sentinel);
assert.equal(typeof csp, 'function');
assert.equal(require('@hmcts/rpx-xui-core-lib/node').SECURITY_POLICY, SECURITY_POLICY, 'Security entries must share the existing policy object');
for (const [name, policy] of Object.entries(policies)) {
  const host = await startCspHost({ policy: { defaultCsp: SECURITY_POLICY, ...policy } });
  try {
    const first = await fetch(host.url, { signal: AbortSignal.timeout(5000) });
    assert.equal(first.status, 200, name);
    const html = await first.text();
    const renderedNonce = html.match(/<script nonce="([^"]+)"/)?.[1];
    assert.ok(renderedNonce, 'The server must render a nonce');
    const header = first.headers.get('content-security-policy');
    assert.ok(header?.includes(`'nonce-${renderedNonce}'`), 'CSP header must contain rendered nonce');
    const directives = new Map(header.split(';').map(part => { const [key, ...values] = part.trim().split(/\s+/); return [key, values]; }));
    for (const [option, directive] of [['extraScript', 'script-src'], ['extraStyle', 'style-src'], ['extraConnect', 'connect-src'], ['extraFont', 'font-src'], ['extraImg', 'img-src']]) {
      for (const source of policy[option] ?? []) assert.ok(directives.get(directive)?.includes(source), `${name} must retain configured ${directive} sources`);
    }
    const second = await fetch(host.url, { signal: AbortSignal.timeout(5000) });
    const secondNonce = (await second.text()).match(/<script nonce="([^"]+)"/)?.[1];
    assert.notEqual(renderedNonce, secondNonce, 'Sequential requests must have different response nonces');
    assert.ok(header.includes('https://*.google-analytics.com'), `${name} must retain legacy policy sources`);
  } finally { await host.close(); }
}
const host = await startCspHost({ policy: { defaultCsp: { directives: { scriptSrc: ['https://base-script.test'] } }, extraScript: ['https://extra-script.test'] } });
try {
  const response = await fetch(host.url, { signal: AbortSignal.timeout(5000) });
  const header = response.headers.get('content-security-policy');
  assert.ok(header?.includes('https://base-script.test'), 'CSP merge must retain default script sources');
  assert.ok(header?.includes('https://extra-script.test'), 'CSP merge must retain additional script sources');
} finally { await host.close(); }
console.log('Packed CSP middleware preserves MC, MO and AO option shapes and response contracts');
