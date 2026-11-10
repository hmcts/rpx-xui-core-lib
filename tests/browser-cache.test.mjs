import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { cachedTranslations } from './browser/i18n/cache.mjs';

test('the browser cache probe closes an empty database before waiting for its schema', async () => {
  let closed = false;
  let transactions = 0;
  const database = {
    objectStoreNames: { contains: () => false },
    close() { closed = true; },
    transaction() { transactions += 1; throw new Error('NotFoundError: translations store missing'); },
  };
  const request = { result: database, onsuccess() { throw new Error('Database was not opened'); } };
  const page = {
    evaluate(callback) {
      return runInNewContext(`(${callback.toString()})()`, { indexedDB: { open: () => request }, Error });
    },
  };
  const pending = cachedTranslations(page);
  assert.doesNotThrow(() => request.onsuccess());
  assert.equal(closed, true);
  assert.equal(transactions, 0);
  assert.equal(JSON.stringify(await pending), '[]');
});


for (const stage of ['open', 'read']) {
  for (const missingReason of [false, true]) {
    test(`the browser cache probe rejects ${stage} failures as Errors with ${missingReason ? 'a missing' : 'the original'} cause`, async () => {
      const failure = missingReason ? null : new DOMException('Synthetic cache failure', 'UnknownError');
      let closed = false;
      const read = { error: failure, onerror() { throw new Error('Read callback was not registered'); } };
      const database = {
        objectStoreNames: { contains: () => true },
        close() { closed = true; },
        transaction: () => ({ objectStore: () => ({ getAll: () => read }) }),
      };
      const request = {
        error: failure, result: database,
        onerror() { throw new Error('Open callback was not registered'); },
        onsuccess() { throw new Error('Success callback was not registered'); },
      };
      const page = {
        evaluate(callback) {
          return runInNewContext(`(${callback.toString()})()`, { indexedDB: { open: () => request }, Error });
        },
      };
      const pending = cachedTranslations(page);
      if (stage === 'open') {
        request.onerror();
      } else {
        request.onsuccess();
        read.onerror();
      }
      await assert.rejects(pending, (error) => {
        assert.ok(error instanceof Error);
        assert.equal(error.name, 'Error');
        assert.equal(error.message, `Failed to ${stage} translation cache: ${failure?.message ?? 'Unknown IndexedDB error'}`);
        assert.equal(error.cause, failure);
        return true;
      });
      assert.equal(closed, stage === 'read');
    });
  }
}
