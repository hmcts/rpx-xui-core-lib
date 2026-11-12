import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, InjectionToken } from '@angular/core';
import { CaseSharingStateService } from '@hmcts/rpx-xui-core-lib/case/sharing-state';
const person = { email: 'synthetic@example.invalid', firstName: 'Synthetic', lastName: 'User', idamId: 'synthetic-id' };
/** @param {string} id @param {Partial<import('@hmcts/rpx-xui-core-lib/case/sharing').SharedCase> & {ignored?: string}} [extra] */
const base = (id, extra = {}) => ({ caseId: id, caseTitle: 'Synthetic', ...extra });

test('case sharing initializes and copies selected cases while preserving nested references', () => {
  const service = new CaseSharingStateService(); const events = []; const subscription = service.state.subscribe(value => events.push(value));
  const original = base('one', { sharedWith: [person], ignored: 'discarded' }); service.setCases([original]);
  assert.equal(events.length, 2); assert.notEqual(service.getCases()[0], original); assert.equal(service.getCases()[0].sharedWith, original.sharedWith); assert.equal('ignored' in service.getCases()[0], false); subscription.unsubscribe();
});

test('case sharing emits deduplicated pending shares and host must synchronize emitted state', () => {
  const service = new CaseSharingStateService();
  service.setCases([base('one'), base('two')]);
  const events = [];
  const subscription = service.state.subscribe(value => events.push(value));
  const first = service.requestShare(person);
  assert.equal(events.length, 2);
  assert.equal(events[1], first);
  assert.deepEqual(first.map(item => item.pendingShares), [[person], [person]]);
  assert.equal(service.getCases()[0].pendingShares.length, 0);
  service.setCases(first);
  const second = service.requestShare(person);
  assert.equal(events.length, 4);
  assert.equal(events[3], second);
  assert.deepEqual(second.map(item => item.pendingShares), [[person], [person]]);
  subscription.unsubscribe();
});

test('case sharing unshares and cancels only the selected case', () => {
  const service = new CaseSharingStateService(); service.setCases([base('one',{sharedWith:[person]}),base('two',{sharedWith:[person]})]);
  const changed = service.requestUnshare(person,'one'); assert.deepEqual(changed[0].pendingUnshares,[person]); assert.equal(changed[1].pendingUnshares,undefined);
  service.setCases(changed); /** @type {import('@hmcts/rpx-xui-core-lib/case/sharing').SharedCase[][]} */ const emissions = []; const sub=service.state.subscribe(value=>emissions.push(value)); service.requestCancel('one',person); const latest = emissions.at(-1); assert.ok(latest); assert.deepEqual(latest[0].pendingUnshares,[]); assert.equal(latest[1].pendingUnshares,undefined);sub.unsubscribe();
});

test('case sharing removes a case only when more than one exists', () => {
  const service=new CaseSharingStateService();service.setCases([base('one'),base('two')]);service.removeCase('one');assert.deepEqual(service.getCases().map(item=>item.caseId),['two']);service.removeCase('two');assert.deepEqual(service.getCases().map(item=>item.caseId),['two']);
});

test('case sharing DI supports one instance with a synthetic alias', t => {
  const token=new InjectionToken('synthetic-sharing-token');const root=Injector.create({providers:[CaseSharingStateService,{provide:token,useExisting:CaseSharingStateService}]});const child=Injector.create({parent:root,providers:[]});t.after(()=>{child.destroy();root.destroy()});assert.equal(root.get(token),child.get(CaseSharingStateService));
});

test('case sharing removal mutates the same array and distinct state does not emit again', () => {
  const service = new CaseSharingStateService(); const events = []; const sub = service.state.subscribe(value => events.push(value));
  service.setCases([base('one'),base('two')]); const prior = service.getCases(); service.removeCase('one');
  assert.equal(service.getCases(),prior); assert.equal(events.length,2); assert.deepEqual(prior.map(item=>item.caseId),['two']); sub.unsubscribe();
});

test('case sharing pending additions and access use email while unshare uses user id', () => {
  const service = new CaseSharingStateService(); const differentEmail = {...person,email:'other@example.invalid'};
  service.setCases([base('one',{sharedWith:[person]})]);
  assert.equal(service.userHasAccess(service.getCases()[0],differentEmail),false);
  assert.deepEqual(service.requestUnshare(differentEmail,'one')[0].pendingUnshares,[differentEmail]);
});


test('case sharing removes a pending share by user id only for the requested case', () => {
  const service = new CaseSharingStateService();
  const changedEmail = { ...person, email: 'other@example.invalid' };
  service.setCases([base('one', { pendingShares: [person] }), base('two', { pendingShares: [person] })]);
  const result = service.requestUnshare(changedEmail, 'one');
  assert.deepEqual(result[0].pendingShares, []);
  assert.deepEqual(result[1].pendingShares, [person]);
});

test('case sharing cancels pending unshare by email and emits the updated state', () => {
  const service = new CaseSharingStateService();
  service.setCases([base('one', { pendingUnshares: [person] })]);
  const events = [];
  const subscription = service.state.subscribe(value => events.push(value));
  service.requestCancel('one', person);
  assert.equal(events.length, 2);
  assert.deepEqual(events[1][0].pendingUnshares, []);
  subscription.unsubscribe();
});
