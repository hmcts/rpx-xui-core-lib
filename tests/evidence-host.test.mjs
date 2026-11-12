import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { verifyHostIdentity } from './evidence-host/setup.mjs';

const expected = { invocationId: 'synthetic-unique-invocation', sourceSha: 'source', sourceSnapshot: 'snapshot' };
test('requires matching invocation and source from the actual responding host', async t => {
  let current = expected;
  const server = createServer((_request, response) => response.end(JSON.stringify(current)));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  const base = `http://127.0.0.1:${address.port}`;
  await verifyHostIdentity(base, expected);
  current = { ...expected, invocationId: 'different-checkout' };
  await assert.rejects(verifyHostIdentity(base, expected), /identity mismatch/);
  current = { ...expected, sourceSnapshot: 'different-source' };
  await assert.rejects(verifyHostIdentity(base, expected), /identity mismatch/);
});

test('an unrelated SPA returning 200 cannot pass host identity', async t => {
  const server = createServer((_request, response) => response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Other app</title>'));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  await assert.rejects(verifyHostIdentity(`http://127.0.0.1:${address.port}`, expected));
});
