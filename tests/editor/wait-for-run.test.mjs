import assert from 'node:assert/strict';
import { test } from 'node:test';
import { waitForRun } from './wait-for-run.mjs';

test('retains a browser startup error when the test harness cannot start', async () => {
  const timeout = new Error('timed out');
  const page = { waitForFunction: async () => { throw timeout; } };
  await assert.rejects(waitForRun(page, ['module export missing']), { message: 'Editor test page failed: module export missing', cause: timeout });
  await assert.rejects(waitForRun(page, []), error => error === timeout);
});

test('passes through a completed test run', async () => {
  let called = false;
  await waitForRun({ waitForFunction: async () => { called = true; } }, []);
  assert.equal(called, true);
});
