import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { expireCachedTranslation, readCache } from './cache-upgrade/cache.mjs';

const probes = /** @type {[string, typeof readCache][]} */ ([['read', readCache], ['expire', expireCachedTranslation]]);
for (const [name, probe] of probes) {
  test(`${name} cache probe reports a synchronous transaction failure and closes the database`, async () => {
    let closed = false;
    const failure = new Error('Missing translations store');
    const request = { result: { close() { closed = true; }, transaction() { throw failure; } }, onsuccess() {} };
    const page = { evaluate(callback) { return runInNewContext(`(${callback.toString()})()`, { indexedDB: { open: () => request }, Error }); } };
    const pending = probe(page);
    const rejection = assert.rejects(pending, (error) => error instanceof Error && error.cause === failure);
    assert.doesNotThrow(() => request.onsuccess());
    assert.equal(closed, true);
    await rejection;
  });

  test(`${name} cache probe reports an open error even when IndexedDB omits its cause`, async () => {
    const request = { error: null, onerror() {} };
    const page = { evaluate(callback) { return runInNewContext(`(${callback.toString()})()`, { indexedDB: { open: () => request }, Error }); } };
    const pending = probe(page);
    request.onerror();
    await assert.rejects(pending, (error) => error instanceof Error && /open translation cache/i.test(error.message));
  });
}
