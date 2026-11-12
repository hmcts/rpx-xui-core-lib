import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InjectionToken, Injector } from '@angular/core';
import { RoleService, RoleMatching, matchRoles } from '@hmcts/rpx-xui-core-lib/ui/role-state';

test('role state suppresses its initial null and emits each assigned array without copying',t=>{
  const roles=new RoleService();assert.equal(roles.pRoles.value,null);
  const values=[];const sub=roles.roles$.subscribe(value=>values.push(value));t.after(()=>sub.unsubscribe());assert.deepEqual(values,[]);
  const first=['role-a'];roles.roles=first;roles.roles=[];assert.strictEqual(values[0],first);assert.deepEqual(values,[['role-a'],[]]);sub.unsubscribe();roles.roles=['later'];assert.equal(values.length,2);
});

test('both bridge directions reuse the chosen state in root and unshadowed child injectors',t=>{
  const legacy=new InjectionToken('synthetic-legacy-role');
  for(const direction of ['core-to-legacy','legacy-to-core']){
    const instance=new RoleService();const providers=direction==='core-to-legacy'?[{provide:legacy,useValue:instance},{provide:RoleService,useExisting:legacy}]:[{provide:RoleService,useValue:instance},{provide:legacy,useExisting:RoleService}];
    const root=Injector.create({providers});const child=Injector.create({parent:root,providers:[]});t.after(()=>{child.destroy();root.destroy()});assert.strictEqual(root.get(legacy),instance);assert.strictEqual(root.get(RoleService),instance);assert.strictEqual(child.get(legacy),instance);assert.strictEqual(child.get(RoleService),instance);
    const values=[];const sub=child.get(RoleService).roles$.subscribe(value=>values.push(value));t.after(()=>sub.unsubscribe());root.get(legacy).roles=['shared'];assert.deepEqual(values,[['shared']]);
  }
});

test('a child role provider intentionally shadows root state and must be accounted for during cutover',t=>{
  const root=Injector.create({providers:[RoleService]});const child=Injector.create({parent:root,providers:[RoleService]});t.after(()=>{child.destroy();root.destroy()});const rootState=root.get(RoleService),childState=child.get(RoleService);assert.notStrictEqual(rootState,childState);rootState.roles=['root'];assert.equal(childState.pRoles.value,null);
});

test('role matching preserves source ALL, ANY and default regex behavior', () => {
  assert.equal(matchRoles(['role-a', 'role-b'], ['^role-a$', '^role-b$'], RoleMatching.ALL), true);
  assert.equal(matchRoles(['role-a'], ['^role-a$', '^role-b$'], RoleMatching.ALL), false);
  assert.equal(matchRoles(['role-a'], ['^missing$', '^role-a$'], RoleMatching.ANY), true);
  assert.equal(matchRoles(['role-a'], ['^missing$', '^role-a$'], undefined), true);
  assert.equal(matchRoles(['role-a'], [], RoleMatching.ALL), true);
  assert.equal(matchRoles(['role-a'], [], RoleMatching.ANY), false);
  assert.equal(matchRoles([], ['.*'], RoleMatching.ANY), false);
});

test('role matching preserves invalid regex and short-circuit behavior', () => {
  assert.throws(() => matchRoles(['role-a'], ['['], RoleMatching.ALL), SyntaxError);
  assert.throws(() => matchRoles(['role-a'], ['['], RoleMatching.ANY), SyntaxError);
  assert.equal(matchRoles(['role-a'], ['^role-a$', '['], RoleMatching.ANY), true);
  assert.equal(matchRoles(['role-a'], ['^missing$', '['], RoleMatching.ALL), false);
  assert.throws(() => matchRoles(['role-a'], undefined, RoleMatching.ANY), TypeError);
});
