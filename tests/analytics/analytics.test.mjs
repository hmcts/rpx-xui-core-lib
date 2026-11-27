import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { GoogleAnalyticsService } from '@hmcts/rpx-xui-core-lib/ui/google-analytics';
import { GoogleTagManagerService } from '@hmcts/rpx-xui-core-lib/ui/google-tag-manager';

function analyticsContext() {
  const scripts = [];
  const appendFailures = [];
  const dataLayer = [];
  const routeEvents = new Subject();
  const window = { dataLayer };
  const document = {
    createElement(name) {
      assert.equal(name, 'script');
      return {
        async: false,
        src: '',
        dataset: {},
        set innerHTML(value) { throw new Error(`inline script is forbidden: ${value}`); },
        set textContent(value) { throw new Error(`inline script is forbidden: ${value}`); }
      };
    },
    head: { appendChild: script => {
      if (appendFailures.length) throw appendFailures.shift();
      scripts.push(script);
    } }
  };
  const router = /** @type {import('@angular/router').Router} */ (/** @type {unknown} */ ({ events: routeEvents }));
  const title = { getTitle: () => 'Current case' };
  return { scripts, appendFailures, dataLayer, routeEvents, window, document, router, title };
}

test('Google Analytics initializes one external script and queues the original configuration without inline markup', () => {
  const context = analyticsContext();
  const service = new GoogleAnalyticsService(context.router, /** @type {import('@angular/platform-browser').Title} */ (/** @type {unknown} */ (context.title)), /** @type {Window} */ (/** @type {unknown} */ (context.window)), /** @type {Document} */ (/** @type {unknown} */ (context.document)));
  const key = 'G-12345</script><script>window.pwned=true</script>';

  service.init(key);

  assert.equal(service.googleAnalyticsKey, key);
  assert.equal(context.scripts.length, 1);
  assert.equal(context.scripts[0].async, true);
  assert.equal(context.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(key)}`);
  assert.deepEqual(context.dataLayer.map(entry => Array.from(entry).slice(0, 2)), [
    ['js', context.dataLayer[0][1]],
    ['config', key]
  ]);
  assert.ok(context.dataLayer[0][1] instanceof Date);
  assert.equal(context.dataLayer[1][2].send_page_view, false);
});

test('Google Analytics shim queues Arguments objects for initialization, events and navigation', () => {
  const context = analyticsContext();
  const service = new GoogleAnalyticsService(context.router, /** @type {import('@angular/platform-browser').Title} */ (/** @type {unknown} */ (context.title)), /** @type {Window} */ (/** @type {unknown} */ (context.window)), /** @type {Document} */ (/** @type {unknown} */ (context.document)));

  service.init('G-12345');
  service.event('case_opened', { caseId: 'case-1' });
  context.routeEvents.next(new NavigationEnd(1, '/case/1', '/case/1'));

  assert.equal(context.dataLayer.length, 4);
  for (const entry of context.dataLayer) {
    assert.equal(Array.isArray(entry), false);
    assert.equal(Object.prototype.toString.call(entry), '[object Arguments]');
  }
  assert.deepEqual(Array.from(context.dataLayer[0]), ['js', context.dataLayer[0][1]]);
  assert.ok(context.dataLayer[0][1] instanceof Date);
  assert.deepEqual(Array.from(context.dataLayer[1]), ['config', 'G-12345', { send_page_view: false }]);
  assert.deepEqual(Array.from(context.dataLayer[2]), ['event', 'case_opened', { caseId: 'case-1' }]);
  assert.deepEqual(Array.from(context.dataLayer[3]), ['config', 'G-12345', {
    page_path: '/case/1', page_title: 'Current case'
  }]);
});

test('Google Analytics events and navigation use the injected window and do not duplicate listeners on repeated init', () => {
  const context = analyticsContext();
  const calls = [];
  const originalGtag = (...args) => calls.push(args);
  context.window.gtag = originalGtag;
  const service = new GoogleAnalyticsService(context.router, /** @type {import('@angular/platform-browser').Title} */ (/** @type {unknown} */ (context.title)), /** @type {Window} */ (/** @type {unknown} */ (context.window)), /** @type {Document} */ (/** @type {unknown} */ (context.document)));

  service.init('G-12345');
  service.init('G-12345');
  service.event('case_opened', { caseId: 'case-1' });
  context.routeEvents.next(new NavigationEnd(1, '/case/1', '/case/1'));

  assert.equal(context.scripts.length, 1);
  assert.equal(service.googleAnalyticsKey, 'G-12345');
  assert.strictEqual(context.window.gtag, originalGtag);
  assert.equal(context.dataLayer.length, 0);
  assert.equal(calls.filter(([command, , params]) => command === 'config' && params?.page_path).length, 1);
  assert.deepEqual(calls.find(([command]) => command === 'event'), ['event', 'case_opened', { caseId: 'case-1' }]);
  assert.deepEqual(calls.filter(([command]) => command === 'config').at(-1), ['config', 'G-12345', {
    page_path: '/case/1', page_title: 'Current case'
  }]);
});

test('Google Tag Manager preserves initial, navigation, event and virtual page-view payloads with one script', () => {
  const context = analyticsContext();
  const service = new GoogleTagManagerService(context.router, /** @type {import('@angular/platform-browser').Title} */ (/** @type {unknown} */ (context.title)), /** @type {Window} */ (/** @type {unknown} */ (context.window)), /** @type {Document} */ (/** @type {unknown} */ (context.document)));

  service.init('GTM-12345');
  service.init('GTM-12345');
  context.routeEvents.next(new NavigationEnd(1, '/case/1', '/case/1'));
  service.event('case_opened', { caseId: 'case-1' });
  service.virtualPageView('virtual_page', '/case/1', 'Case details', { jurisdictionId: 'CIVIL' });

  assert.equal(context.scripts.length, 1);
  assert.equal(service.googleTagManagerKey, 'GTM-12345');
  assert.equal(context.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-12345');
  assert.deepEqual(context.dataLayer[0], { 'gtm.start': context.dataLayer[0]['gtm.start'], event: 'gtm.js' });
  assert.equal(typeof context.dataLayer[0]['gtm.start'], 'number');
  assert.deepEqual(context.dataLayer.slice(1), [
    { event: 'pageview', page: { path: '/case/1', title: 'Current case' } },
    { event: 'case_opened', caseId: 'case-1' },
    { event: 'virtual_page', page: { path: '/case/1', title: 'Case details' }, jurisdictionId: 'CIVIL' }
  ]);
});

test('analytics script insertion failures are reported, leave services retryable, and do not duplicate initialization', () => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const analytics = analyticsContext();
    analytics.appendFailures.push(new Error('analytics append blocked'));
    const googleAnalytics = new GoogleAnalyticsService(analytics.router, /** @type {import('@angular/platform-browser').Title} */ (/** @type {unknown} */ (analytics.title)), /** @type {Window} */ (/** @type {unknown} */ (analytics.window)), /** @type {Document} */ (/** @type {unknown} */ (analytics.document)));
    googleAnalytics.init('G-12345');
    googleAnalytics.init('G-12345');
    assert.equal(analytics.scripts.length, 1);
    assert.equal(analytics.dataLayer.filter(entry => Array.from(entry).includes('config')).length, 1);
    assert.equal(errors[0][0], 'Error appending google analytics');
    assert.match(errors[1][0].message, /analytics append blocked/);

    errors.length = 0;
    const tagManager = analyticsContext();
    tagManager.appendFailures.push(new Error('tag manager append blocked'));
    const googleTagManager = new GoogleTagManagerService(tagManager.router, /** @type {import('@angular/platform-browser').Title} */ (/** @type {unknown} */ (tagManager.title)), /** @type {Window} */ (/** @type {unknown} */ (tagManager.window)), /** @type {Document} */ (/** @type {unknown} */ (tagManager.document)));
    googleTagManager.init('GTM-12345');
    googleTagManager.init('GTM-12345');
    assert.equal(tagManager.scripts.length, 1);
    assert.equal(tagManager.dataLayer.filter(entry => entry.event === 'gtm.js').length, 1);
    assert.equal(errors[0][0], 'Error appending google tag manager');
    assert.match(errors[1][0].message, /tag manager append blocked/);
  } finally {
    console.error = originalError;
  }
});
