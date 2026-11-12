import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { SessionStorageService } from '@hmcts/rpx-xui-core-lib/browser/session-storage';
import { TaskService } from '@hmcts/rpx-xui-core-lib/ui/task-data';

/** @param {Observable<unknown>} [response] */
function fixture(response = of([{ taskId: 1, taskName: 'synthetic' }])) {
  const values = new Map(); const requests = []; const reads = [];
  const storage = { getItem(key) { reads.push(key); return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); } };
  const http = { post(url, body) { requests.push({url, body}); return response; } };
  const injector = Injector.create({ providers: [TaskService, { provide: HttpClient, useValue: http }, { provide: SessionStorageService, useValue: storage }] });
  return { service: injector.get(TaskService), storage, values, requests, reads };
}

test('task names cache is scoped by service and cache hits do not call HTTP', async () => {
  const {service, values, requests, reads} = fixture();
  assert.deepEqual(await firstValueFrom(service.getTaskName('one')), [{ taskId: 1, taskName: 'synthetic' }]);
  assert.equal(values.get('one-taskNames'), JSON.stringify([{ taskId: 1, taskName: 'synthetic' }]));
  assert.deepEqual(await firstValueFrom(service.getTaskName('one')), [{ taskId: 1, taskName: 'synthetic' }]);
  await firstValueFrom(service.getTaskName('two'));
  assert.deepEqual(requests, [{url:'/workallocation/taskNames',body:{service:'one'}},{url:'/workallocation/taskNames',body:{service:'two'}}]);
  assert.equal(reads.filter(key => key === 'one-taskNames').length, 3);
});

test('task name malformed cache throws and storage errors propagate', () => {
  const {service, values, storage, requests} = fixture(); values.set('one-taskNames', '{invalid');
  assert.throws(() => service.getTaskName('one'), SyntaxError); assert.deepEqual(requests, []);
  storage.getItem = () => { throw new Error('synthetic storage failure'); };
  assert.throws(() => service.getTaskName('one'), /synthetic storage failure/);
});

test('task HTTP failure does not write cache and work types use exact request', async () => {
  const error = new Error('synthetic HTTP failure'); const failing=fixture(throwError(() => error));
  await assert.rejects(firstValueFrom(failing.service.getTaskName('one')), reason => reason === error);
  assert.equal(failing.values.has('one-taskNames'), false);
  const success=fixture(of([{key:'test',label:'Synthetic'}]));
  assert.deepEqual(await firstValueFrom(success.service.searchWorkTypes('term')), [{key:'test',label:'Synthetic'}]);
  assert.deepEqual(success.requests,[{url:'/workallocation/task/search-types-of-work',body:{searchTerm:'term'}}]);
});

test('task service DI uses the explicit shared storage instance', async t => {
  const reads = [];
  const storage = { getItem(key) { reads.push(key); return JSON.stringify([{ taskId: 7, taskName: 'synthetic' }]); }, setItem() { assert.fail('unexpected cache write'); } };
  const http = { post() { assert.fail('unexpected HTTP request'); } };
  const root = Injector.create({ providers: [TaskService, { provide: HttpClient, useValue: http }, { provide: SessionStorageService, useValue: storage }] });
  const child = Injector.create({ parent: root, providers: [] });
  t.after(() => { child.destroy(); root.destroy(); });
  assert.equal(child.get(TaskService), root.get(TaskService));
  assert.deepEqual(await firstValueFrom(child.get(TaskService).getTaskName('injected')), [{ taskId: 7, taskName: 'synthetic' }]);
  assert.deepEqual(reads, ['injected-taskNames', 'injected-taskNames']);
});


test('task names accept an empty cached array without requesting HTTP', async () => {
  const {service, values, requests} = fixture();
  values.set('one-taskNames', '[]');
  assert.deepEqual(await firstValueFrom(service.getTaskName('one')), []);
  assert.deepEqual(requests, []);
});

test('task names propagate cache write errors from HTTP response', async () => {
  const {service, storage} = fixture();
  const failure = new Error('synthetic write failure');
  storage.setItem = () => { throw failure; };
  await assert.rejects(firstValueFrom(service.getTaskName('one')), error => error === failure);
});

test('task name cancellation tears down the HTTP subscription without writing', () => {
  let cancelled = false;
  const {service, values} = fixture(new Observable(() => () => { cancelled = true; }));
  const subscription = service.getTaskName('one').subscribe();
  subscription.unsubscribe();
  assert.equal(cancelled, true);
  assert.equal(values.has('one-taskNames'), false);
});

test('task service sends and caches through the Angular HTTP testing backend', async t => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const injector = Injector.create({ providers: [provideHttpClientTesting(), { provide: HttpClient, useFactory: backend => new HttpClient(backend), deps: [HttpBackend] }, { provide: SessionStorageService, useValue: storage }, TaskService] });
  const http = injector.get(HttpTestingController);
  t.after(() => { http.verify(); injector.destroy(); });
  const pending = firstValueFrom(injector.get(TaskService).getTaskName('synthetic-service'));
  const request = http.expectOne('/workallocation/taskNames');
  assert.equal(request.request.method, 'POST');
  assert.deepEqual(request.request.body, { service: 'synthetic-service' });
  request.flush([{ taskId: 1, taskName: 'synthetic' }]);
  assert.deepEqual(await pending, [{ taskId: 1, taskName: 'synthetic' }]);
  assert.equal(values.get('synthetic-service-taskNames'), JSON.stringify([{ taskId: 1, taskName: 'synthetic' }]));
});
