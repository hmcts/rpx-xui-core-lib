import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, InjectionToken } from '@angular/core';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';

function installStorage(t, storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else delete globalThis.sessionStorage;
  });
}

test('storage forwards set, get, remove and clear with exact values', t => {
  const data = new Map();
  const calls = [];
  installStorage(t, {
    getItem(key) { calls.push(['get', key]); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { calls.push(['set', key, value]); data.set(key, value); },
    removeItem(key) { calls.push(['remove', key]); data.delete(key); },
    clear() { calls.push(['clear']); data.clear(); }
  });
  const service = new SessionStorageService();
  service.setItem('synthetic', 'value');
  assert.equal(service.getItem('synthetic', true), 'value');
  assert.equal(service.getItem('synthetic'), null);
  service.removeItem('absent');
  service.clear();
  assert.deepEqual(calls, [['set', 'synthetic', 'value'], ['get', 'synthetic'], ['remove', 'synthetic'], ['get', 'synthetic'], ['remove', 'absent'], ['clear']]);
});

test('storage propagates read failures without removing data', t => {
  let removed = false;
  const failure = new Error('synthetic storage failure');
  installStorage(t, { getItem() { throw failure; }, removeItem() { removed = true; } });
  assert.throws(() => new SessionStorageService().getItem('synthetic', true), error => error === failure);
  assert.equal(removed, false);
});

test('storage supports one DI instance with a synthetic token alias', t => {
  const token = new InjectionToken('synthetic-storage-token');
  const parent = Injector.create({ providers: [SessionStorageService, { provide: token, useExisting: SessionStorageService }] });
  const child = Injector.create({ parent, providers: [] });
  t.after(() => { child.destroy(); parent.destroy(); });
  assert.equal(parent.get(token), child.get(SessionStorageService));
});
