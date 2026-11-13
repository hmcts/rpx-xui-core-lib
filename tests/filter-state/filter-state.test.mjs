import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Injector, InjectionToken } from '@angular/core';
import { FilterService } from '@hmcts/rpx-xui-core-lib/ui/filter-state';

function setup(t) {
  const old = new Map(['window', 'localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const makeStorage = () => { const data = new Map(); return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), clear: () => data.clear() }; };
  const local = makeStorage(); const session = makeStorage();
  for (const [name, value] of Object.entries({ localStorage: local, sessionStorage: session, window: { localStorage: local, sessionStorage: session } })) Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => { for (const [name, descriptor] of old) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  return { local, session, service: new FilterService() };
}
const setting = () => ({ id: 'synthetic-filter', fields: [{ name: 'status', value: ['open'] }] });
const user = owner => JSON.stringify({ id: 'synthetic-id', filterOwnerHash: owner });

test('filter restores same-owner local before colliding session and removes session copy', t => {
  const {local, session, service} = setup(t); session.setItem('userDetails', user('synthetic-owner')); local.setItem('synthetic-filter', JSON.stringify({...setting(), ownerHash:'synthetic-owner'})); session.setItem('synthetic-filter', JSON.stringify({...setting(), reset:true}));
  assert.equal(service.get('synthetic-filter').reset, undefined); assert.equal(session.getItem('synthetic-filter'), null);
});
test('filter removes another owner local value and preserves session fallback', t => {
  const {local, session, service} = setup(t); session.setItem('userDetails', user('new-owner')); local.setItem('synthetic-filter', JSON.stringify({...setting(), ownerHash:'old-owner'})); session.setItem('synthetic-filter', JSON.stringify(setting()));
  assert.deepEqual(service.get('synthetic-filter'), setting()); assert.equal(local.getItem('synthetic-filter'), null);
});
test('filter persists owned values without raw id and falls back to session without owner', t => {
  const {local, session, service} = setup(t); session.setItem('userDetails', user('synthetic-owner')); const original = {...setting(), idamId:'synthetic-id'}; service.persist(original,'local');
  const stored = JSON.parse(local.getItem(original.id)); assert.equal(stored.ownerHash,'synthetic-owner'); assert.equal('idamId' in stored,false); assert.equal(original.idamId,'synthetic-id');
  session.removeItem('userDetails'); const second={...setting(),id:'other'}; service.persist(second,'local'); assert.equal(local.getItem('other'),null); assert.deepEqual(JSON.parse(session.getItem('other')),second);
});
test('filter memory precedence, stream and clear are isolated by id', t => {
  const {local, session, service}=setup(t); const events=[]; const subscription=service.getStream('synthetic-filter').subscribe(value=>events.push(value)); t.after(()=>subscription.unsubscribe());
  const chosen=setting(); service.persist(chosen,'memory'); session.setItem(chosen.id,JSON.stringify({...chosen,reset:true})); assert.deepEqual(service.get(chosen.id),chosen); local.setItem('other','untouched'); service.clearSessionAndLocalPersistance(chosen.id); assert.equal(service.get(chosen.id),null); assert.equal(local.getItem('other'),'untouched'); assert.deepEqual(events,[null,chosen,null]);
});
test('filter propagates malformed stored JSON and storage errors', t => {
  const {local, session, service}=setup(t); local.setItem('synthetic-filter','{bad'); assert.throws(()=>service.get('synthetic-filter'),SyntaxError); local.removeItem('synthetic-filter'); session.setItem('userDetails','{bad'); assert.throws(()=>service.persist(setting(),'local'),SyntaxError);
  local.setItem=()=>{throw new Error('synthetic storage failure')}; session.setItem('userDetails',user('owner')); assert.throws(()=>service.persist(setting(),'local'),/synthetic storage failure/);
});
test('filter supports one DI instance with a synthetic token alias', t => {
  const token=new InjectionToken('synthetic-filter-token'); const parent=Injector.create({providers:[FilterService,{provide:token,useExisting:FilterService}]}); const child=Injector.create({parent,providers:[]}); t.after(()=>{child.destroy();parent.destroy()}); assert.equal(child.get(FilterService),parent.get(token));
});

test('filter session value remains available after a same-tab owner change', t => {
  const { session, service } = setup(t);
  session.setItem('userDetails', user('first-owner'));
  service.persist(setting(), 'session');
  session.setItem('userDetails', user('second-owner'));
  assert.deepEqual(new FilterService().get('synthetic-filter'), setting());
});

test('filter memory owner must still match after a same-tab identity change', t => {
  const { session, service } = setup(t);
  session.setItem('userDetails', user('first-owner'));
  service.persist(setting(), 'local');
  session.setItem('userDetails', user('second-owner'));
  assert.equal(service.get('synthetic-filter'), null);
});

test('filter reads id before uid and returns undefined without user details', t => {
  const { session, service } = setup(t);
  assert.equal(service.getUserId(), undefined);
  session.setItem('userDetails', JSON.stringify({ id: 'id', uid: 'uid' }));
  assert.equal(service.getUserId(), 'id');
  session.setItem('userDetails', JSON.stringify({ uid: 'uid' }));
  assert.equal(service.getUserId(), 'uid');
});

test('filter switching persistence removes the stale copy from the other store', t => {
  const { local, session, service } = setup(t);
  session.setItem('userDetails', user('owner'));
  session.setItem('synthetic-filter', JSON.stringify({ ...setting(), reset: true }));
  service.persist(setting(), 'local');
  assert.equal(session.getItem('synthetic-filter'), null);
  assert.equal(JSON.parse(local.getItem('synthetic-filter')).ownerHash, 'owner');
  service.persist(setting(), 'session');
  assert.equal(local.getItem('synthetic-filter'), null);
  assert.deepEqual(JSON.parse(session.getItem('synthetic-filter')), setting());
});

test('filter rejects and removes another owner local value without a session fallback', t => {
  const { local, session, service } = setup(t);
  session.setItem('userDetails', user('new-owner'));
  local.setItem('synthetic-filter', JSON.stringify({ ...setting(), ownerHash: 'old-owner' }));
  assert.equal(service.get('synthetic-filter'), null);
  assert.equal(local.getItem('synthetic-filter'), null);
});

test('filter stream exposes inherited previous-owner replay after a same-tab owner change', t => {
  const { session, service } = setup(t);
  session.setItem('userDetails', user('first-owner'));
  const stream = service.getStream('synthetic-filter');
  service.persist(setting(), 'local');
  session.setItem('userDetails', user('second-owner'));
  assert.equal(service.get('synthetic-filter'), null);
  const values = [];
  const subscription = stream.subscribe(value => values.push(value));
  t.after(() => subscription.unsubscribe());
  assert.equal(values.length, 1);
  assert.equal(values[0].ownerHash, 'first-owner');
});

test('filter exposes inherited local eviction when the owner is unavailable', t => {
  const { local, session, service } = setup(t);
  local.setItem('synthetic-filter', JSON.stringify({ ...setting(), ownerHash: 'first-owner' }));
  assert.equal(service.get('synthetic-filter'), null);
  assert.equal(local.getItem('synthetic-filter'), null);
  session.setItem('userDetails', user('first-owner'));
  assert.equal(service.get('synthetic-filter'), null);
});
