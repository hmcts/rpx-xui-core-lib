import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import proxy from '../apps/test-host/local-translations.mjs';

test('local translations preserve a UTF-8 phrase split between request chunks', async (t) => {
  const request = new IncomingMessage(new Socket());
  t.after(() => request.destroy());
  request.url = '/translations/cy';
  request.method = 'POST';
  const response = new ServerResponse(request);
  let responseBody = '';
  response.end = function (body) { responseBody = body; return this; };
  const body = Buffer.from(JSON.stringify({ phrases: ['café'] }));
  const split = body.indexOf(Buffer.from('é')) + 1;

  const pending = proxy['/translations'].bypass(request, response);
  request.push(body.subarray(0, split));
  // Let the handler consume the first chunk before the remaining UTF-8 byte arrives.
  await setImmediate();
  request.push(body.subarray(split));
  request.push(null);
  await pending;

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(responseBody), { translations: { café: 'café' } });
});

test('local translations preserve mapped phrases and unknown values', async (t) => {
  const request = new IncomingMessage(new Socket());
  t.after(() => request.destroy());
  request.url = '/translations/cy';
  request.method = 'POST';
  const response = new ServerResponse(request);
  let responseBody = '';
  response.end = function (body) { responseBody = body; return this; };
  const pending = proxy['/translations'].bypass(request, response);
  request.push(JSON.stringify({ phrases: ['Saved', 'Case name', 'TODAY', 'unknown'] }));
  request.push(null);
  await pending;
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(responseBody), { translations: { Saved: 'Wedi cadw', 'Case name': 'Enw achos', TODAY: 'HEDDIW', unknown: 'unknown' } });
});
