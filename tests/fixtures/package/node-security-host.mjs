import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { csp, SECURITY_POLICY } from '@hmcts/rpx-xui-core-lib/node/server/security';

const require = createRequire(import.meta.url);
const express = createRequire(require.resolve('@hmcts/rpx-xui-core-lib/node/server/security'))('express');

/** @param {{ reportOnly?: boolean; policy?: import('@hmcts/rpx-xui-core-lib/node/server/security').CspOptions }} options */
export async function startCspHost({ reportOnly = false, policy = {} } = {}) {
  const previous = process.env.CSP_REPORT_ONLY;
  const app = express();
  app.use(csp({ defaultCsp: SECURITY_POLICY, extraScript: [], extraStyle: [], extraConnect: [], extraFont: [], extraImg: [], ...policy }));
  app.get('/', (_request, response) => {
    const nonce = response.locals.cspNonce;
    response.set('Cache-Control', 'no-store').type('html').send(`<!doctype html><html lang="en"><head><title>Local CSP contract</title>
      <style nonce="${nonce}">#trusted-style{color:rgb(0, 128, 0)}</style></head><body>
      <main><h1>Local CSP contract</h1><p id="trusted-style">Nonce style</p>
      <output id="trusted-script">pending</output><output id="untrusted-script">pending</output></main>
      <script nonce="${nonce}">window.cspViolations=[];document.addEventListener('securitypolicyviolation',event=>window.cspViolations.push({directive:event.effectiveDirective,blocked:event.blockedURI,disposition:event.disposition}));document.querySelector('#trusted-script').textContent='executed';</script>
      <script>document.querySelector('#untrusted-script').textContent='executed';</script>
      </body></html>`);
  });
  const server = createServer(app);
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', () => resolve(undefined)).once('error', reject));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing CSP fixture address');
  process.env.CSP_REPORT_ONLY = reportOnly ? 'true' : 'false';
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      try { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve(undefined))); }
      finally {
        if (previous === undefined) delete process.env.CSP_REPORT_ONLY;
        else process.env.CSP_REPORT_ONLY = previous;
      }
    },
  };
}
