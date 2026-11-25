import '@angular/compiler';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { FilterService } from '@hmcts/rpx-xui-core-lib/ui/filter-state';

const ownerHash = 'a'.repeat(64);
const otherOwnerHash = 'b'.repeat(64);
const setting = { id: 'test-filter', fields: [{ name: 'types-of-work', value: ['applications'] }] };
const ownedSetting = { ...setting, ownerHash };
const storageGlobals = ['localStorage', 'sessionStorage', 'window'];
const previousGlobals = storageGlobals.map(name => Object.getOwnPropertyDescriptor(globalThis, name));

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
    clear: () => { values.clear(); }
  };
}

function setUserDetails(details) {
  sessionStorage.setItem('userDetails', JSON.stringify(details));
}

beforeEach(() => {
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  Object.defineProperties(globalThis, {
    localStorage: { configurable: true, value: localStorage },
    sessionStorage: { configurable: true, value: sessionStorage },
    window: { configurable: true, value: { localStorage, sessionStorage } }
  });
  setUserDetails({ id: 'synthetic-user', filterOwnerHash: ownerHash });
});

afterEach(() => {
  for (const [index, name] of storageGlobals.entries()) {
    const descriptor = previousGlobals[index];
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test('local persistence replaces stale ownership and strips the raw ID from a copy', () => {
  const input = Object.freeze({ ...setting, idamId: 'legacy-user', ownerHash: otherOwnerHash });
  sessionStorage.setItem(setting.id, JSON.stringify(setting));

  const service = new FilterService();
  service.persist(input, 'local');

  assert.deepEqual(JSON.parse(localStorage.getItem(setting.id)), ownedSetting);
  assert.equal(sessionStorage.getItem(setting.id), null);
  assert.deepEqual(service.get(setting.id), ownedSetting);
  assert.deepEqual(input, { ...setting, idamId: 'legacy-user', ownerHash: otherOwnerHash });
});

test('a fresh service restores matching local ownership across tabs', () => {
  new FilterService().persist(setting, 'local');
  sessionStorage.clear();
  setUserDetails({ filterOwnerHash: ownerHash });

  assert.deepEqual(new FilterService().get(setting.id), ownedSetting);
});

test('a matching local setting takes precedence over stale session data', () => {
  localStorage.setItem(setting.id, JSON.stringify(ownedSetting));
  sessionStorage.setItem(setting.id, JSON.stringify({ ...setting, fields: [] }));

  assert.deepEqual(new FilterService().get(setting.id), ownedSetting);
  assert.equal(sessionStorage.getItem(setting.id), null);
});

test('a mismatched local owner is removed and the session setting survives', () => {
  localStorage.setItem(setting.id, JSON.stringify({ ...setting, ownerHash: otherOwnerHash, fields: [] }));
  sessionStorage.setItem(setting.id, JSON.stringify(setting));

  assert.deepEqual(new FilterService().get(setting.id), setting);
  assert.equal(localStorage.getItem(setting.id), null);
  assert.deepEqual(JSON.parse(sessionStorage.getItem(setting.id)), setting);
});

test('cached local settings become unavailable when the owner changes', () => {
  const service = new FilterService();
  service.persist(setting, 'local');
  setUserDetails({ filterOwnerHash: otherOwnerHash });

  assert.equal(service.get(setting.id), null);
});

test('a second user can save their own filter after rejecting the first owner', () => {
  new FilterService().persist(setting, 'local');
  sessionStorage.clear();
  setUserDetails({ filterOwnerHash: otherOwnerHash });

  const service = new FilterService();
  assert.equal(service.get(setting.id), null);
  assert.equal(localStorage.getItem(setting.id), null);

  const secondSetting = { ...setting, fields: [{ name: 'types-of-work', value: ['routine'] }] };
  service.persist(secondSetting, 'local');
  assert.deepEqual(new FilterService().get(setting.id), { ...secondSetting, ownerHash: otherOwnerHash });

  setUserDetails({ filterOwnerHash: ownerHash });
  assert.equal(service.get(setting.id), null);
});

test('local restore removes settings with a legacy raw ID or no ownership metadata', () => {
  for (const unowned of [setting, { ...setting, idamId: 'synthetic-user' }]) {
    localStorage.setItem(setting.id, JSON.stringify(unowned));
    assert.equal(new FilterService().get(setting.id), null);
    assert.equal(localStorage.getItem(setting.id), null);
  }
});

test('an owned local selection is removed if no current owner is available', () => {
  localStorage.setItem(setting.id, JSON.stringify(ownedSetting));
  sessionStorage.removeItem('userDetails');

  assert.equal(new FilterService().get(setting.id), null);
  assert.equal(localStorage.getItem(setting.id), null);
});

test('local writes fall back to session without a supplied owner hash', () => {
  setUserDetails({ id: 'synthetic-user' });
  localStorage.setItem(setting.id, JSON.stringify(ownedSetting));
  const input = { ...ownedSetting, idamId: 'legacy-user' };
  const service = new FilterService();
  service.persist(input, 'local');

  assert.equal(localStorage.getItem(setting.id), null);
  assert.deepEqual(JSON.parse(sessionStorage.getItem(setting.id)), setting);
  assert.deepEqual(service.get(setting.id), setting);
  assert.deepEqual(input, { ...ownedSetting, idamId: 'legacy-user' });
});

test('session writes remove colliding local data and survive only during that session', () => {
  localStorage.setItem(setting.id, JSON.stringify(ownedSetting));
  const legacySetting = { ...setting, idamId: 'legacy-user' };
  new FilterService().persist(legacySetting, 'session');

  assert.equal(localStorage.getItem(setting.id), null);
  assert.deepEqual(JSON.parse(sessionStorage.getItem(setting.id)), setting);
  assert.deepEqual(new FilterService().get(setting.id), setting);
  sessionStorage.clear();
  assert.equal(new FilterService().get(setting.id), null);
});

test('streams replay restored state, publish changes per ID and emit null on clear', t => {
  const events = [];
  const otherEvents = [];
  localStorage.setItem(setting.id, JSON.stringify(ownedSetting));
  const service = new FilterService();
  const subscription = service.getStream(setting.id).subscribe(value => events.push(value));
  const otherSubscription = service.getStream('other-filter').subscribe(value => otherEvents.push(value));
  t.after(() => {
    subscription.unsubscribe();
    otherSubscription.unsubscribe();
  });

  const update = { ...setting, fields: [], reset: true };
  service.persist(update, 'memory');
  assert.deepEqual(service.get(setting.id), update);
  assert.deepEqual(JSON.parse(localStorage.getItem(setting.id)), ownedSetting);
  assert.equal(sessionStorage.getItem(setting.id), null);
  sessionStorage.setItem(setting.id, JSON.stringify(setting));

  service.clearSessionAndLocalPersistance(setting.id);
  assert.deepEqual(events, [ownedSetting, update, null]);
  assert.deepEqual(otherEvents, [null]);
  assert.equal(service.get(setting.id), null);
  assert.equal(localStorage.getItem(setting.id), null);
  assert.equal(sessionStorage.getItem(setting.id), null);
});

test('malformed JSON still throws and leaves stored data untouched', () => {
  const service = new FilterService();
  localStorage.setItem(setting.id, '{');
  assert.throws(() => service.get(setting.id), SyntaxError);
  assert.equal(localStorage.getItem(setting.id), '{');

  localStorage.removeItem(setting.id);
  sessionStorage.setItem(setting.id, '{');
  assert.throws(() => service.get(setting.id), SyntaxError);
  assert.equal(sessionStorage.getItem(setting.id), '{');

  sessionStorage.setItem('userDetails', '{');
  assert.throws(() => service.persist(setting, 'local'), SyntaxError);
  assert.equal(localStorage.getItem(setting.id), null);
});

test('getUserId retains ID-first and UID-fallback behavior', () => {
  const service = new FilterService();
  setUserDetails({ id: 'synthetic-id', uid: 'synthetic-uid' });
  assert.equal(service.getUserId(), 'synthetic-id');
  setUserDetails({ uid: 'synthetic-uid' });
  assert.equal(service.getUserId(), 'synthetic-uid');
  sessionStorage.removeItem('userDetails');
  assert.equal(service.getUserId(), undefined);
});

test('initial-setting and error notification state retain their public defaults', () => {
  const service = new FilterService();
  assert.equal(service.isInitialSetting, false);
  assert.equal(service.givenErrors.value, null);

  const errors = [{ name: 'types-of-work', error: 'Select a type of work' }];
  service.givenErrors.next(errors);
  service.persist(setting, 'memory');
  service.clearSessionAndLocalPersistance(setting.id);

  assert.equal(service.givenErrors.value, errors);
  assert.equal(service.isInitialSetting, false);
});

test('the browser package graph contains filter state and its low-level runtime dependencies', () => {
  const fixture = fileURLToPath(new URL('../fixtures/package/filter-state-graph.mjs', import.meta.url));
  const { metafile } = buildSync({
    entryPoints: [fixture],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    preserveSymlinks: true,
    metafile: true,
    write: false
  });
  const packageInputs = Object.keys(metafile.inputs).filter(input => input.includes('node_modules/'));
  const coreInputs = packageInputs.filter(input => input.includes('/@hmcts/rpx-xui-core-lib/'));
  assert.deepEqual(coreInputs.map(input => input.split('/').at(-1)), ['hmcts-rpx-xui-core-lib-ui-filter-state.mjs']);
  assert.deepEqual(
    packageInputs.filter(input => !coreInputs.includes(input) && !/node_modules\/(?:@angular\/core|rxjs|tslib)\//.test(input)),
    []
  );
});
