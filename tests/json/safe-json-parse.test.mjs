import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeJsonParse } from '@hmcts/rpx-xui-core-lib/util/json';

test('safeJsonParse preserves valid JSON values including primitives', () => {
  assert.deepEqual(safeJsonParse('{"ok":true}', null), { ok: true });
  assert.equal(safeJsonParse('false', null), false);
  assert.equal(safeJsonParse('0', null), 0);
  assert.equal(safeJsonParse('"text"', null), 'text');
});

test('safeJsonParse returns the supplied fallback for missing and invalid input', () => {
  const fallback = { safe: true };
  assert.strictEqual(safeJsonParse(null, fallback), fallback);
  assert.strictEqual(safeJsonParse('', fallback), fallback);
  assert.strictEqual(safeJsonParse('{broken', fallback), fallback);
});

test('safeJsonParse logs a safe error name without the malformed input', () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...values) => logs.push(values);
  try {
    assert.equal(safeJsonParse('{"session": synthetic-private-sentinel}', null), null);
  } finally {
    console.error = originalError;
  }

  assert.equal(logs.length, 1);
  assert.equal(logs[0][0].message, 'safeJsonParse failed to parse JSON.');
  assert.equal(logs[0][0].context.errorName, 'SyntaxError');
  assert.doesNotMatch(JSON.stringify(logs), /synthetic-private-sentinel/);
});
