import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InjectionToken, Injector } from '@angular/core';
import { windowToken, windowProvider } from '@hmcts/rpx-xui-core-lib/browser/window';

test('window provider retains the source ReferenceError when no browser window exists', () => {
  assert.equal('window' in globalThis, false);
  assert.throws(windowProvider, ReferenceError);
});

test('window provider returns the exact browser global rather than a copy', t => {
  const hadWindow = Object.hasOwn(globalThis, 'window');
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => { if (hadWindow) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  const fake = { label:'synthetic-window' }; Object.defineProperty(globalThis, 'window', { value: fake, configurable: true });
  assert.strictEqual(windowProvider(), fake);
});

test('both alias directions share one supplied window across root and child injectors', t => {
  const legacy = new InjectionToken('synthetic-legacy-window'); const fake = {label:'synthetic-window'};
  for (const direction of ['core-to-legacy', 'legacy-to-core']) {
    const providers = direction === 'core-to-legacy' ? [{provide:legacy,useValue:fake},{provide:windowToken,useExisting:legacy}] : [{provide:windowToken,useValue:fake},{provide:legacy,useExisting:windowToken}];
    const root=Injector.create({providers}); const child=Injector.create({parent:root,providers:[]});
    t.after(()=>{child.destroy();root.destroy()});
    assert.strictEqual(root.get(windowToken),fake); assert.strictEqual(child.get(legacy),fake); assert.strictEqual(root.get(legacy),child.get(windowToken));
  }
});

test('a child injector override intentionally shadows the parent window token', t => {
  const parentWindow={label:'parent'},childWindow={label:'child'};
  const root=Injector.create({providers:[{provide:windowToken,useValue:parentWindow}]});
  const child=Injector.create({parent:root,providers:[{provide:windowToken,useValue:childWindow}]});t.after(()=>{child.destroy();root.destroy()});
  assert.strictEqual(root.get(windowToken),parentWindow);assert.strictEqual(child.get(windowToken),childWindow);
});
