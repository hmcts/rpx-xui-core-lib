import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DocumentInterruptSource, WindowInterruptSource } from '@ng-idle/core';
import { Subject } from 'rxjs';
import { ManageSessionServices } from '@hmcts/rpx-xui-core-lib/ui/manage-session';
import { TimeoutNotificationsService } from '@hmcts/rpx-xui-core-lib/ui/timeout-notifications';

function idleContext() {
  const calls = [];
  const idle = {
    onIdleEnd: new Subject(),
    onTimeout: new Subject(),
    onTimeoutWarning: new Subject(),
    onIdleStart: new Subject(),
    setIdleName: value => calls.push(['setIdleName', value]),
    setTimeout: value => calls.push(['setTimeout', value]),
    setInterrupts: value => calls.push(['setInterrupts', value]),
    setIdle: value => calls.push(['setIdle', value]),
    watch: () => calls.push(['watch']),
    stop: () => calls.push(['stop']),
    clearInterrupts: () => calls.push(['clearInterrupts'])
  };
  const keepalive = {
    onPing: new Subject(),
    interval: value => calls.push(['interval', value])
  };
  return { calls, idle, keepalive };
}

function createServices(context) {
  return {
    manager: new ManageSessionServices(/** @type {import('@ng-idle/core').Idle} */ (/** @type {unknown} */ (context.idle)), /** @type {import('@ng-idle/keepalive').Keepalive} */ (/** @type {unknown} */ (context.keepalive))),
    notifications: new TimeoutNotificationsService(/** @type {import('@ng-idle/core').Idle} */ (/** @type {unknown} */ (context.idle)), /** @type {import('@ng-idle/keepalive').Keepalive} */ (/** @type {unknown} */ (context.keepalive)))
  };
}

function interruptEvents(interrupt) {
  return /** @type {{ events: string }} */ (/** @type {unknown} */ (interrupt)).events;
}

test('Manage Session retains the calculated idle schedule and interrupt contract', () => {
  const context = idleContext();
  const service = createServices(context).manager;
  const config = {
    timeout: 120,
    idleMilliseconds: 900_000,
    keepAliveInSeconds: 300,
    idleServiceName: 'idleSession'
  };

  service.init(config);

  assert.deepEqual(context.calls.filter(([name]) => name !== 'setInterrupts'), [
    ['setIdleName', 'idleSession'],
    ['setTimeout', 120],
    ['interval', 300],
    ['setIdle', 780],
    ['watch']
  ]);
  const [interrupt] = context.calls.find(([name]) => name === 'setInterrupts')[1];
  assert.ok(interrupt instanceof DocumentInterruptSource);
  assert.equal(interruptEvents(interrupt), 'mousedown keydown DOMMouseScroll mousewheel touchstart touchmove scroll');
});

test('Manage Session emits existing modal, signout and keepalive state values', async () => {
  const context = idleContext();
  const service = createServices(context).manager;
  const states = [];
  service.appStateChanges().subscribe(value => states.push(value));
  service.init({ timeout: 60, idleMilliseconds: 120_000, keepAliveInSeconds: 600 });

  context.idle.onTimeoutWarning.next(61);
  context.idle.onTimeoutWarning.next(61);
  context.idle.onTimeoutWarning.next(60);
  context.idle.onTimeout.next();
  context.keepalive.onPing.next();
  context.idle.onIdleEnd.next();
  await new Promise(resolve => setTimeout(resolve, 275));

  assert.deepEqual(states, [
    { type: 'modal', countdown: '2 minutes', isVisible: true },
    { type: 'modal', countdown: '60 seconds', isVisible: true },
    { type: 'signout' },
    { type: 'keepalive' },
    { type: 'modal', countdown: undefined, isVisible: false }
  ]);
});

test('Timeout Notifications converts milliseconds and retains its idle, keepalive and event contracts', () => {
  const context = idleContext();
  const service = createServices(context).notifications;
  const config = {
    idleServiceName: 'idleSession',
    idleModalDisplayTime: 60_000,
    totalIdleTime: 900_000,
    keepAliveInSeconds: 120
  };

  assert.equal(service.millisecondsToSeconds(1_500), 1.5);
  service.initialise(config);
  service.reset();

  assert.deepEqual(context.calls.filter(([name]) => name !== 'setInterrupts'), [
    ['setIdleName', 'idleSession'],
    ['setTimeout', 60],
    ['interval', 120],
    ['setIdle', 840],
    ['watch'],
    ['watch']
  ]);
  const interrupts = context.calls.find(([name]) => name === 'setInterrupts')[1];
  assert.equal(interrupts.length, 2);
  assert.ok(interrupts[0] instanceof DocumentInterruptSource);
  assert.ok(interrupts[1] instanceof WindowInterruptSource);
  assert.equal(interruptEvents(interrupts[0]), 'mousedown keydown DOMMouseScroll mousewheel touchstart touchmove scroll');
  assert.equal(interruptEvents(interrupts[1]), 'mousedown keydown DOMMouseScroll mousewheel touchstart touchmove scroll');
});

test('Timeout Notifications defaults keepalive, deduplicates countdowns and closes all sources', () => {
  const context = idleContext();
  const service = createServices(context).notifications;
  const events = [];
  service.notificationOnChange().subscribe(value => events.push(value));
  service.initialise({ idleModalDisplayTime: 60_000, totalIdleTime: 900_000 });

  assert.equal(context.calls.find(([name]) => name === 'interval')[1], 600);
  context.idle.onTimeoutWarning.next(61);
  context.idle.onTimeoutWarning.next(61);
  context.idle.onTimeoutWarning.next(60);
  context.idle.onTimeout.next();
  context.keepalive.onPing.next();
  service.close();
  context.idle.onTimeout.next();
  context.keepalive.onPing.next();
  service.close();

  assert.deepEqual(events, [
    { eventType: 'countdown', readableCountdown: '2 minutes' },
    { eventType: 'countdown', readableCountdown: '60 seconds' },
    { eventType: 'sign-out' },
    { eventType: 'keep-alive' }
  ]);
  assert.equal(context.calls.filter(([name]) => name === 'stop').length, 2);
  assert.equal(context.calls.filter(([name]) => name === 'clearInterrupts').length, 2);
});
