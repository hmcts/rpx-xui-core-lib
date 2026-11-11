import { test } from 'node:test';
import assert from 'node:assert/strict';
import '@angular/compiler';
import { LoadingService } from '@hmcts/rpx-xui-core-lib/ui/loading-state';

test('overlapping operations remain active until both identical-clock tokens are released', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { performance: { now: () => 100 } } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window'); });
  const service = new LoadingService();
  const values = [];
  const subscription = service.isLoading.subscribe(value => values.push(value));
  t.after(() => subscription.unsubscribe());
  const first = service.register();
  const second = service.register();
  assert.notEqual(first, second);
  assert.deepEqual(values, [false, true]);
  service.unregister(first);
  assert.deepEqual(values, [false, true]);
  service.unregister(second);
  assert.deepEqual(values, [false, true, false]);
});

test('releasing one same-clock operation does not stop another', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { performance: { now: () => 100 } } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window'); });
  const service = new LoadingService();
  const values = [];
  const subscription = service.isLoading.subscribe(value => values.push(value));
  t.after(() => subscription.unsubscribe());
  const first = service.register();
  service.register();
  service.unregister(first);
  assert.deepEqual(values, [false, true]);
});

test('a stale release cannot remove a newer operation registered at the same time', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { performance: { now: () => 100 } } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window'); });
  const service = new LoadingService();
  const values = [];
  const subscription = service.isLoading.subscribe(value => values.push(value));
  t.after(() => subscription.unsubscribe());
  const stale = service.register();
  service.unregister(stale);
  const current = service.register();
  service.unregister(stale);
  assert.deepEqual(values, [false, true, false, true]);
  service.unregister(current);
  assert.deepEqual(values, [false, true, false, true, false]);
});

test('unknown releases, late subscriptions and separate service instances preserve observable state', t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { performance: { now: () => 100 } } });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else Reflect.deleteProperty(globalThis, 'window'); });
  const first = new LoadingService();
  const second = new LoadingService();
  const firstValues = [];
  const secondValues = [];
  const a = first.isLoading.subscribe(value => firstValues.push(value));
  const b = second.isLoading.subscribe(value => secondValues.push(value));
  t.after(() => { a.unsubscribe(); b.unsubscribe(); });
  const token = first.register();
  first.unregister('unknown');
  const late = [];
  const c = first.isLoading.subscribe(value => late.push(value));
  t.after(() => c.unsubscribe());
  assert.deepEqual(late, [true]);
  assert.deepEqual(firstValues, [false, true]);
  assert.deepEqual(secondValues, [false]);
  first.unregister(token);
  first.unregister(token);
  assert.deepEqual(firstValues, [false, true, false]);
  assert.deepEqual(late, [true, false]);
  assert.deepEqual(secondValues, [false]);
});
