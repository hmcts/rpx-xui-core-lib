import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, InjectionToken } from '@angular/core';
import { defer, of, Subject, throwError } from 'rxjs';
import { FindAPersonService, PersonRole, RoleCategory } from '@hmcts/rpx-xui-core-lib/ui/find-person';

const asHttp = fake => /** @type {import('@angular/common/http').HttpClient} */ (/** @type {unknown} */ (fake));
const storage = getItem => ({ getItem, setItem() {}, removeItem() {}, clear() {} });

function fixture(userDetails = null) {
  const calls = [];
  const http = { post(url, body) { const response = new Subject(); calls.push({ url, body, response }); return response.asObservable(); } };
  return { service: new FindAPersonService(asHttp(http), storage(() => userDetails)), calls };
}
const options = assignedUser => ({ searchTerm: '', userRole: PersonRole.ALL, services: ['SYNTHETIC'], assignedUser });
const people = [
  { idamId: 'a', firstName: 'Alex', lastName: 'A', email: 'a@example.test', roleCategories: [] },
  { idamId: 'b', firstName: 'Blair', lastName: 'B', email: 'b@example.test', roleCategories: [] },
];

test('find-person overlapping caseworker requests retain their own assigned-user filters', () => {
  const { service, calls } = fixture(); const received = [];
  service.findCaseworkers(options('a')).subscribe(value => received.push(value.map(person => person.id)));
  service.findCaseworkers(options('b')).subscribe(value => received.push(value.map(person => person.id)));
  assert.deepEqual(calls.map(call => call.url), ['/workallocation/caseworker/getUsersByServiceName', '/workallocation/caseworker/getUsersByServiceName']);
  assert.deepEqual(calls[0].body, { services: ['SYNTHETIC'], term: '' });
  calls[0].response.next(people); calls[1].response.next(people);
  assert.deepEqual(received, [['b'], ['a']]);
});

test('find-person preserves public mapping state and role precedence', () => {
  const { service } = fixture(); service.userId = 'b'; service.assignedUser = 'a';
  const workers = [{...people[0], roleCategories: [RoleCategory.ADMIN, RoleCategory.CTSC]}, people[1]];
  assert.deepEqual(service.mapCaseworkers(workers, RoleCategory.CTSC).map(person => [person.id, person.domain]), [['a', PersonRole.ADMIN], ['b', PersonRole.LEGAL_OPERATIONS]]);
  assert.deepEqual(service.searchInCaseworkers(workers, options('ignored')).map(person => person.id), ['b']);
});

test('find-person preserves empty results and forwards request failures', () => {
  const { service, calls } = fixture(); let result; service.findCaseworkers(options([])).subscribe(value => result = value);
  calls[0].response.next(null); assert.deepEqual(result, []);
  const error = new Error('synthetic lookup failure');
  const failed = new FindAPersonService(asHttp({ post: () => throwError(() => error) }), storage(() => null));
  let observed; failed.findCaseworkers(options([])).subscribe({ error: value => observed = value }); assert.equal(observed, error);
});

test('find-person explicit injection alias shares a service and child override stays distinct', () => {
  const token = new InjectionToken('synthetic-legacy-find-person'); const { service } = fixture();
  const parent = Injector.create({ providers: [{ provide: FindAPersonService, useValue: service }, { provide: token, useExisting: FindAPersonService }] });
  const child = Injector.create({ parent, providers: [] }); const replacement = fixture().service;
  const override = Injector.create({ parent, providers: [{ provide: token, useValue: replacement }] });
  assert.equal(child.get(token), service); assert.equal(override.get(token), replacement); assert.equal(override.get(FindAPersonService), service);
  override.destroy(); child.destroy(); parent.destroy();
});

test('find-person snapshots an assigned-user array before a judicial response', () => {
  const { service, calls } = fixture(); const assigned = ['a']; let received;
  service.find(options(assigned)).subscribe(value => received = value.map(person => person.id));
  assigned[0] = 'b'; calls[0].response.next([{id:'a'}, {id:'b'}]);
  assert.deepEqual(received, ['b']);
});

test('find-person snapshots role, search term, current user and assigned array for each delayed response', () => {
  let currentUser = JSON.stringify({ uid: 'a' }); const calls = [];
  const service = new FindAPersonService(asHttp({ post(url, body) { const response = new Subject(); calls.push({url,body,response}); return response; } }), storage(() => currentUser));
  const request = { searchTerm: 'alex', userRole: PersonRole.ADMIN, services: ['SYNTHETIC'], assignedUser: ['b'] };
  let first; let second;
  service.findCaseworkers(request).subscribe(value => first = value.map(person => person.id));
  currentUser = JSON.stringify({ id: 'b', uid: 'ignored' });
  service.findCaseworkers(options('a')).subscribe(value => second = value.map(person => person.id));
  request.searchTerm = 'blair'; request.userRole = PersonRole.CTSC; request.assignedUser[0] = 'a';
  calls[1].response.next(people); calls[0].response.next(people);
  assert.deepEqual(first, ['a']); assert.deepEqual(second, ['b']);
  assert.equal(service.userId, 'b');
});

test('find-person retains prior user ID if session details are absent', () => {
  const { service, calls } = fixture(); service.userId = 'a'; let result;
  service.findCaseworkers({ ...options([]), userRole: PersonRole.ADMIN }).subscribe(value => result = value.map(person => person.id));
  calls[0].response.next(people); assert.deepEqual(result, ['a']);
});

test('find-person asynchronous mapping dispatches through public overrides', () => {
  const calls = [];
  class CustomService extends FindAPersonService {
    mapped = 0;
    searched = 0;
    mapCaseworkers(workers, role) { this.mapped++; return super.mapCaseworkers(workers, role); }
    searchInCaseworkers(workers, request) { this.searched++; return super.searchInCaseworkers(workers, request); }
  }
  const service = new CustomService(asHttp({ post() { const response = new Subject(); calls.push(response); return response; } }), storage(() => null));
  service.findCaseworkers(options([])).subscribe(); calls[0].next(people);
  assert.equal(service.searched, 1); assert.equal(service.mapped, 1);
});

test('find-person nested response restores outer context and retains public mutations', () => {
  const calls = []; const seen = []; let nested = false;
  class CustomService extends FindAPersonService {
    searchInCaseworkers(workers, request) {
      seen.push(this.assignedUser);
      if (!nested) { nested = true; calls[1].next(people); this.userId = 'mutated'; }
      return super.searchInCaseworkers(workers, request);
    }
  }
  const service = new CustomService(asHttp({ post() { const result = new Subject(); calls.push(result); return result; } }), storage(() => null));
  const results = []; service.findCaseworkers(options('a')).subscribe(value => results.push(['first', value.map(person => person.id)]));
  service.findCaseworkers(options('b')).subscribe(value => results.push(['second', value.map(person => person.id)]));
  calls[0].next(people);
  assert.deepEqual(results, [['second', ['a']], ['first', ['b']]]);
  assert.deepEqual(seen, ['b', 'b']); assert.equal(service.userId, 'mutated'); assert.equal(service.assignedUser, 'b');
  assert.deepEqual(service.searchInCaseworkers(people, options([])).map(person => person.id), ['a']);
});

test('find-person exception unwinds request context before a direct mapping call', () => {
  const calls = []; const error = new Error('synthetic mapping failure');
  class ThrowingService extends FindAPersonService {
    searchInCaseworkers(workers, request) { if (request.searchTerm === 'throw') throw error; return super.searchInCaseworkers(workers, request); }
  }
  const service = new ThrowingService(asHttp({ post() { const result = new Subject(); calls.push(result); return result; } }), storage(() => null));
  let observed; service.findCaseworkers({ ...options('a'), searchTerm: 'throw' }).subscribe({ error: value => observed = value });
  service.assignedUser = 'b'; calls[0].next(people);
  assert.equal(observed, error);
  assert.deepEqual(service.searchInCaseworkers(people, options([])).map(person => person.id), ['a']);
});

test('find-person synchronous responses leave public mapping state intact', () => {
  const service = new FindAPersonService(asHttp({ post: () => of(people) }), storage(() => null));
  let result;
  service.findCaseworkers(options('a')).subscribe(value => result = value.map(person => person.id));
  assert.deepEqual(result, ['b']);
  assert.equal(service.assignedUser, 'a');
  service.assignedUser = 'b';
  assert.deepEqual(service.searchInCaseworkers(people, options([])).map(person => person.id), ['a']);
});

test('find-person repeated cold subscriptions retain their request snapshot', () => {
  let subscriptions = 0;
  const service = new FindAPersonService(asHttp({ post: () => defer(() => { subscriptions++; return of(people); }) }), storage(() => null));
  const lookup = service.findCaseworkers(options('a'));
  service.findCaseworkers(options('b'));
  const results = [];
  lookup.subscribe(value => results.push(value.map(person => person.id)));
  lookup.subscribe(value => results.push(value.map(person => person.id)));
  assert.equal(subscriptions, 2);
  assert.deepEqual(results, [['b'], ['b']]);
  assert.equal(service.assignedUser, 'b');
});

test('judicial search forwards its request and response', () => {
  const { service, calls } = fixture();
  let result;
  service.searchJudicial('alex', 'SYNTHETIC').subscribe(value => result = value);
  assert.equal(calls[0].url, 'api/prd/judicial/getJudicialUsersSearch');
  assert.deepEqual(calls[0].body, { searchString: 'alex', serviceCode: 'SYNTHETIC' });
  const response = [{ id: 'synthetic-judge' }];
  calls[0].response.next(response);
  assert.equal(result, response);
});
