import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOCUMENT, Injector, InjectionToken } from '@angular/core';
import { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';

test('cookie setter preserves legacy expiry and SameSite formatting', () => {
  const document = {cookie: ''}; const service = new CookieService(document);
  service.setCookie('user', 'dummy', 'Mon 12th Jan 2024 12:00:00 GMT');
  assert.equal(document.cookie, 'user=dummy; expires=Mon 12th Jan 2024 12:00:00 GMT;SameSite=Strict');
  service.setCookie('user', 'dummy'); assert.equal(document.cookie, 'user=dummy;;SameSite=Strict');
});

test('cookie reads preserve exact-name, missing-key and equals-sign behavior', () => {
  const document = {cookie: 'user_extra=x; user=dummy=tail; empty='}; const service = new CookieService(document);
  assert.equal(service.getCookie('user'), 'dummy'); assert.equal(service.getCookie('empty'), '');
  assert.equal(service.checkCookie('user'), true); assert.equal(service.checkCookie('use'), false);
  assert.equal(service.checkCookie('missing'), false); assert.throws(() => service.getCookie('missing'), TypeError);
});

test('cookie deletion preserves provided path and domain and the legacy prefix match', () => {
  const writes=[]; const document = {get cookie() { return 'user_1=one; user_2=two; username=three; other=four'; }, set cookie(value) { writes.push(value); }};
  const service = new CookieService(document); service.deleteCookieByPartialMatch('user', '/scope', 'example.test');
  assert.deepEqual(writes, ['user_1=; path=/scope; domain=example.test; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0','user_2=; path=/scope; domain=example.test; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0','username=; path=/scope; domain=example.test; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0']);
  writes.length=0; service.deleteCookieByPartialMatch('absent'); assert.deepEqual(writes, []);
  service.deleteCookie('user'); assert.equal(writes[0], 'user=; expires=Thu, 01 Jan 1970 00:00:01 GMT; max-age=0');
});

test('cookie service injects the provided document and supports explicit token aliasing', t => {
  const document = {cookie:'user=one'}; const legacy = new InjectionToken('synthetic-legacy-cookie');
  const root = Injector.create({providers:[CookieService,{provide:DOCUMENT,useValue:document},{provide:legacy,useExisting:CookieService}]});
  const child=Injector.create({parent:root,providers:[]}); t.after(()=>{child.destroy();root.destroy();});
  assert.strictEqual(root.get(legacy),child.get(CookieService));assert.equal(child.get(CookieService).getCookie('user'),'one');
});
