import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InjectionToken, Injector, TemplateRef, ViewContainerRef } from '@angular/core';
import { of, firstValueFrom } from 'rxjs';
import { FeatureToggleService, AnonymousFeatureUser, LoggedInFeatureUser } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';

test('unconfigured feature service fails explicitly for all operations', () => {
  const service = new FeatureToggleService();
  for (const run of [() => service.initialize({ anonymous: true }, 'id'), () => service.isEnabled('flag'), () => service.getValue('flag', false), () => service.getValueOnce('flag', false)]) {
    assert.throws(run, { message: 'Not implemented' });
  }
  assert.throws(() => service.getValueSync('flag', false), { message: 'Not implemented flag:false' });
  assert.deepEqual(Object.keys(new AnonymousFeatureUser()), []);
  assert.deepEqual(Object.keys(new LoggedInFeatureUser()), []);
});

test('both alias directions use one provided feature service across parent and unshadowed child', async t => {
  const legacy = new InjectionToken('synthetic-legacy-feature-toggle');
  for (const direction of ['core-to-legacy', 'legacy-to-core']) {
    const seen = [];
    const instance = { initialize: (user, id) => seen.push([user, id]), isEnabled: () => of(true), getValue: () => of('live'), getValueOnce: () => of('once'), getValueSync: () => 'sync' };
    const providers = direction === 'core-to-legacy' ? [{provide: legacy, useValue: instance}, {provide: FeatureToggleService, useExisting: legacy}] : [{provide: FeatureToggleService, useValue: instance}, {provide: legacy, useExisting: FeatureToggleService}];
    const root = Injector.create({providers}); const child = Injector.create({parent: root, providers: []});
    t.after(() => {child.destroy();root.destroy();});
    assert.strictEqual(root.get(legacy), child.get(FeatureToggleService));
    assert.strictEqual(child.get(legacy), root.get(FeatureToggleService));
    child.get(FeatureToggleService).initialize({anonymous: true}, 'client');
    assert.deepEqual(seen, [[{anonymous: true}, 'client']]);
    assert.equal(await firstValueFrom(child.get(legacy).isEnabled('flag')), true);
    assert.equal(await firstValueFrom(child.get(FeatureToggleService).getValue('flag', 'default')), 'live');
    assert.equal(await firstValueFrom(child.get(FeatureToggleService).getValueOnce('flag', 'default')), 'once');
    assert.equal(child.get(legacy).getValueSync('flag', 'default'), 'sync');
  }
});

test('child provider shadowing creates a distinct feature service', t => {
  const parentService = {}; const childService = {};
  const root = Injector.create({providers: [{provide: FeatureToggleService, useValue: parentService}]});
  const child = Injector.create({parent: root, providers: [{provide: FeatureToggleService, useValue: childService}]});
  t.after(() => {child.destroy();root.destroy();});
  assert.strictEqual(root.get(FeatureToggleService), parentService);
  assert.strictEqual(child.get(FeatureToggleService), childService);
});

/**
 * @param {typeof import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive').FeatureToggleDirective} Directive
 * @param {{isEnabled: (name: string) => import('rxjs').Observable<boolean>}} feature
 * @param {{length: number, clear: () => void, createEmbeddedView: () => void}} views
 */
function makeDirective(Directive, feature, views) {
  const injector = Injector.create({ providers: [
    { provide: FeatureToggleService, useValue: feature },
    { provide: ViewContainerRef, useValue: views },
    { provide: TemplateRef, useValue: {} }
  ] });
  return new Directive(injector.get(FeatureToggleService), injector.get(ViewContainerRef), injector.get(TemplateRef));
}

test('directive releases the previous and final feature subscriptions', async () => {
  const { Subject } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const a = new Subject(); const b = new Subject();
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  const directive = makeDirective(FeatureToggleDirective, {isEnabled: name => name === 'a' ? a : b}, views);
  directive.xuilibFeatureToggle = 'a';
  assert.equal(a.observers.length, 1); a.next(true); a.next(true); assert.equal(views.length, 1);
  directive.xuilibFeatureToggle = 'b';
  assert.equal(a.observers.length, 0); assert.equal(b.observers.length, 1); assert.equal(views.length, 0);
  b.next(true); a.next(false); assert.equal(views.length, 1);
  directive.ngOnDestroy(); assert.equal(b.observers.length, 0);
});

test('directive releases the previous feature and clears its view if the next provider throws', async () => {
  const { Subject } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const a = new Subject(); const failure = new Error('synthetic provider failure');
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  const directive = makeDirective(FeatureToggleDirective, {isEnabled: name => { if (name === 'b') throw failure; return a; }}, views);
  directive.xuilibFeatureToggle = 'a'; a.next(true); assert.equal(views.length, 1);
  assert.throws(() => { directive.xuilibFeatureToggle = 'b'; }, error => error === failure);
  assert.equal(a.observers.length, 0); assert.equal(views.length, 0);
  a.next(true); assert.equal(views.length, 0); directive.ngOnDestroy();
});

test('directive does not retain previous content when the new observable errors', async () => {
  const { Subject, Observable, config } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const a = new Subject(); const failure = new Error('synthetic observable failure');
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  const directive = makeDirective(FeatureToggleDirective, {isEnabled: name => name === 'a' ? a : new Observable(subscriber => subscriber.error(failure))}, views);
  const previous = config.onUnhandledError;
  try {
    let report; const reported = new Promise(resolve => { report = resolve; }); config.onUnhandledError = report;
    directive.xuilibFeatureToggle = 'a'; a.next(true); assert.equal(views.length, 1);
    directive.xuilibFeatureToggle = 'b';
    assert.strictEqual(await reported, failure); assert.equal(a.observers.length, 0); assert.equal(views.length, 0);
    a.next(true); assert.equal(views.length, 0);
  } finally { directive.ngOnDestroy(); config.onUnhandledError = previous; }
});

test('directive clears enabled content if the active feature stream later errors', async () => {
  const { Subject, config } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const stream = new Subject(); const failure = new Error('synthetic stream failure');
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  const directive = makeDirective(FeatureToggleDirective, {isEnabled: () => stream}, views);
  const previous = config.onUnhandledError;
  try {
    let report; const reported = new Promise(resolve => { report = resolve; }); config.onUnhandledError = report;
    directive.xuilibFeatureToggle = 'a'; stream.next(true); assert.equal(views.length, 1);
    stream.error(failure);
    assert.strictEqual(await reported, failure); assert.equal(views.length, 0); assert.equal(stream.observers.length, 0);
  } finally { directive.ngOnDestroy(); config.onUnhandledError = previous; }
});

test('directive retains only the reentrant replacement subscription', async () => {
  const { BehaviorSubject } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const a = new BehaviorSubject(true); const b = new BehaviorSubject(true);
  let directive; let switched = false;
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; if (!switched) { switched = true; directive.xuilibFeatureToggle = 'b'; } } };
  directive = makeDirective(FeatureToggleDirective, {isEnabled: name => name === 'a' ? a : b}, views);
  directive.xuilibFeatureToggle = 'a';
  assert.equal(a.observers.length, 0); assert.equal(b.observers.length, 1); assert.equal(views.length, 1);
  directive.ngOnDestroy(); assert.equal(b.observers.length, 0);
});

test('directive stops a synchronous source when destroyed during rendering', async () => {
  const { Observable } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  let directive; let continued = false; let released = false;
  const stream = new Observable(subscriber => { subscriber.next(true); if (!subscriber.closed) { continued = true; subscriber.next(false); } return () => { released = true; }; });
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; directive.ngOnDestroy(); } };
  directive = makeDirective(FeatureToggleDirective, {isEnabled: () => stream}, views);
  directive.xuilibFeatureToggle = 'a';
  assert.equal(continued, false); assert.equal(released, true); assert.equal(views.length, 1);
});

test('directive ignores assignments after destruction and a reentrant provider switch', async () => {
  const { Subject } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const a = new Subject(); const b = new Subject(); let calls = 0; let directive;
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  const provider = {isEnabled(name) { calls += 1; if (name === 'a') { directive.xuilibFeatureToggle = 'b'; return a; } return b; }};
  directive = makeDirective(FeatureToggleDirective, provider, views); directive.xuilibFeatureToggle = 'a';
  assert.equal(a.observers.length, 0); assert.equal(b.observers.length, 1); b.next(true); assert.equal(views.length, 1);
  directive.ngOnDestroy(); assert.equal(b.observers.length, 0); directive.xuilibFeatureToggle = 'b'; assert.equal(calls, 2); assert.equal(b.observers.length, 0);
});

test('directive does not overwrite a replacement created by previous-source teardown', async () => {
  const { Observable, Subject } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const b = new Subject(); const c = new Subject(); let directive;
  const a = new Observable(() => () => { directive.xuilibFeatureToggle = 'b'; });
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  directive = makeDirective(FeatureToggleDirective, {isEnabled: name => ({a,b,c})[name]}, views);
  directive.xuilibFeatureToggle = 'a'; directive.xuilibFeatureToggle = 'c';
  assert.equal(b.observers.length, 1); assert.equal(c.observers.length, 0);
  directive.ngOnDestroy(); assert.equal(b.observers.length, 0);
});

test('directive does not resubscribe when teardown reenters during destruction', async () => {
  const { Observable, Subject } = await import('rxjs');
  const { FeatureToggleDirective } = await import('@hmcts/rpx-xui-core-lib/ui/feature-toggle-directive');
  const b = new Subject(); let directive;
  const a = new Observable(() => () => { directive.xuilibFeatureToggle = 'b'; });
  const views = { length: 0, clear() { this.length = 0; }, createEmbeddedView() { this.length += 1; } };
  directive = makeDirective(FeatureToggleDirective, {isEnabled: name => name === 'a' ? a : b}, views);
  directive.xuilibFeatureToggle = 'a'; directive.ngOnDestroy(); assert.equal(b.observers.length, 0);
});
