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
      return runInNewContext(`(${callback.toString()})()`, { indexedDB: { open: () => request } });
    },
  };
  const pending = cachedTranslations(page);
  assert.doesNotThrow(() => request.onsuccess());
  assert.equal(closed, true);
  assert.equal(transactions, 0);
  assert.equal(JSON.stringify(await pending), '[]');
});
