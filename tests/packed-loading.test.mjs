import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { inspectLoadingGraph, assertPackedBytes, assertEagerDateFailure } from './packed-loading/graph.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'packed-loading-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entry = (file, source, code) => {
    writeFileSync(join(root, file), code);
    writeFileSync(join(root, file + '.map'), JSON.stringify({ sources: [source] }));
  };
  entry('main-a.js', 'node_modules/@hmcts/rpx-xui-core-lib/fesm2022/hmcts-rpx-xui-core-lib-forms-validation.mjs', 'import "./shared.js"; import("./date.js"); import("./session.js");');
  entry('shared.js', 'other.js', 'export const x = 1;');
  entry('date.js', 'node_modules/@hmcts/rpx-xui-core-lib/fesm2022/hmcts-rpx-xui-core-lib-case-editor-date.mjs', 'export const date = 1;');
  entry('session.js', 'node_modules/@hmcts/rpx-xui-core-lib/fesm2022/hmcts-rpx-xui-core-lib-case-session-error.mjs', 'export const session = 1;');
  return root;
}

test('loading graph rejects an eager date import and a missing source map', t => {
  const root = fixture(t);
  assert.deepEqual(inspectLoadingGraph(root).initial, ['main-a.js', 'shared.js']);
  writeFileSync(join(root, 'main-a.js'), 'import "./date.js";');
  assert.throws(() => inspectLoadingGraph(root), /Date entry must not/);
  rmSync(join(root, 'date.js.map'));
  assert.throws(() => inspectLoadingGraph(root), /ENOENT/);
});

test('packed identity rejects a mismatched installed entry', () => {
  assert.doesNotThrow(() => assertPackedBytes(Buffer.from('same'), Buffer.from('same')));
  assert.throws(() => assertPackedBytes(Buffer.from('changed'), Buffer.from('same')), /differ/);
});

test('loading host rejects a responding server from a different invocation', async t => {
  const { verifyLoadingHost } = await import('./packed-loading/setup.mjs');
  const server = createServer((_request, response) => response.end('old-invocation'));
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  const base = `http://127.0.0.1:${address.port}`;
  await verifyLoadingHost(base, 'old-invocation');
  await assert.rejects(verifyLoadingHost(base, 'new-invocation'), /identity mismatch/);
});

test('eager fault requires the date assertion rather than an unrelated session failure', () => {
  const make = message => ({ suites: [{ specs: [{ title: 'installed package keeps date and session pages lazy and usable', tests: [{ status: 'unexpected', results: [{ status: 'failed', error: { message } }] }] }] }] });
  assert.doesNotThrow(() => assertEagerDateFailure(make('Date chunk must not be requested before activation')));
  assert.throws(() => assertEagerDateFailure(make('Session chunk must not be requested before activation')), /Date chunk/);
  assert.throws(() => assertEagerDateFailure({ suites: [] }), /exactly one/);
});
