import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie';
import { CookieBannerComponent } from '@hmcts/rpx-xui-core-lib/ui/cookie-banner';

/** @typedef {{ enable(): void; enableSessionReplay(enabled: boolean): void }} TestDynatraceRum */
/** @typedef {{ value?: string; enableDynatrace?: boolean; dtrum?: TestDynatraceRum; browserAvailable?: boolean }} BannerOptions */

/** @extends {CookieService} */
class TestCookieService extends CookieService {
  /** @type {Map<string, string>} */
  values;
  /** @type {Array<{ key: string; value: string; expires?: string }>} */
  writes;

  /** @param {Map<string, string>} values @param {Array<{ key: string; value: string; expires?: string }>} writes */
  constructor(values, writes) {
    super({ cookie: '' });
    this.values = values;
    this.writes = writes;
  }

  /** @param {string} key */
  checkCookie(key) { return this.values.has(key); }
  /** @param {string} key */
  getCookie(key) { return this.values.get(key) ?? ''; }
  /** @param {string} key @param {string} value @param {string} [expires] */
  setCookie(key, value, expires) { this.values.set(key, value); this.writes.push({ key, value, expires }); }
}

/** @param {BannerOptions} [options] */
function createBanner({ value, enableDynatrace = false, dtrum, browserAvailable = true } = {}) {
  const values = new Map(value === undefined ? [] : [['analytics-consent', value]]);
  const writes = [];
  const reloads = [];
  const acceptance = [];
  const rejection = [];
  const cookieService = new TestCookieService(values, writes);
  const window = { location: { reload: () => reloads.push(true) }, ...(dtrum === undefined ? {} : { dtrum }) };
  const document = /** @type {Document} */ (/** @type {unknown} */ ({ defaultView: browserAvailable ? window : null }));
  const banner = new CookieBannerComponent(cookieService, document);
  banner.identifier = 'analytics-consent';
  banner.appName = 'Case service';
  banner.enableDynatrace = enableDynatrace;
  banner.acceptanceNotifier.subscribe(() => acceptance.push(true));
  banner.rejectionNotifier.subscribe(() => rejection.push(true));
  return { banner, values, writes, reloads, acceptance, rejection };
}

test('cookie banner shows the consent prompt and reports rejection when no consent exists', () => {
  const { banner, acceptance, rejection } = createBanner();

  banner.ngOnInit();

  assert.equal(banner.isCookieBannerVisible, true);
  assert.deepEqual(acceptance, []);
  assert.deepEqual(rejection, [true]);
});

test('cookie banner hides the prompt and reports accepted consent from the stored value', () => {
  const calls = [];
  const dtrum = { enable: () => calls.push('enable'), enableSessionReplay: enabled => calls.push(['replay', enabled]) };
  const { banner, acceptance, rejection } = createBanner({ value: 'true', enableDynatrace: true, dtrum });

  banner.ngOnInit();

  assert.equal(banner.isCookieBannerVisible, false);
  assert.deepEqual(acceptance, [true]);
  assert.deepEqual(rejection, []);
  assert.deepEqual(calls, ['enable', ['replay', true]]);
});

test('accepting consent stores true for one year, reports acceptance and reloads the page', t => {
  const now = new Date('2026-11-25T12:34:56.789Z');
  t.mock.timers.enable({ apis: ['Date'], now });
  const expectedExpiry = new Date(now.getTime() + 31536000000).toUTCString();
  const { banner, values, writes, reloads, acceptance } = createBanner();

  banner.ngOnInit();
  banner.acceptCookie();

  assert.equal(values.get('analytics-consent'), 'true');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'analytics-consent');
  assert.equal(writes[0].expires, expectedExpiry);
  assert.deepEqual(acceptance, [true]);
  assert.deepEqual(reloads, [true]);
});

test('rejecting consent stores false, reports rejection and reloads the page', () => {
  const { banner, values, writes, reloads, rejection } = createBanner();

  banner.ngOnInit();
  banner.rejectCookie();

  assert.equal(values.get('analytics-consent'), 'false');
  assert.equal(writes[0].value, 'false');
  assert.deepEqual(rejection, [true, true]);
  assert.deepEqual(reloads, [true]);
});

test('stored acceptance does not enable Dynatrace unless the host opts in', () => {
  const calls = [];
  const dtrum = { enable: () => calls.push('enable'), enableSessionReplay: () => calls.push('replay') };
  const { banner, acceptance } = createBanner({ value: 'true', dtrum });

  banner.ngOnInit();

  assert.deepEqual(calls, []);
  assert.deepEqual(acceptance, [true]);
});

test('cookie banner remains safe without a browser window during server rendering', () => {
  const { banner, values, reloads, acceptance } = createBanner({ value: 'true', enableDynatrace: true, browserAvailable: false });

  banner.ngOnInit();
  banner.acceptCookie();

  assert.equal(values.get('analytics-consent'), 'true');
  assert.deepEqual(acceptance, [true, true]);
  assert.deepEqual(reloads, []);
});
