import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BrowserService } from '@hmcts/rpx-xui-core-lib/browser/user-agent';

test('browser service classifies legacy browser user-agent strings', () => {
  const originalWindow = globalThis.window;
  const service = new BrowserService();
  const setUserAgent = userAgent => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { navigator: { userAgent } },
    });
  };

  try {
    setUserAgent('Mozilla/5.0 Firefox/115.0');
    assert.equal(service.isFirefox(), true);
    assert.equal(service.isSafari(), false);
    assert.equal(service.isIEOrEdge(), false);

    setUserAgent('Mozilla/5.0 Chrome/120.0 Safari/537.36');
    assert.equal(service.isFirefox(), false);
    assert.equal(service.isSafari(), false);
    assert.equal(service.isIEOrEdge(), false);

    setUserAgent('Mozilla/5.0 Version/17.0 Safari/605.1.15');
    assert.equal(service.isSafari(), true);
    assert.equal(service.isIEOrEdge(), false);

    setUserAgent('Mozilla/5.0 Edge/18.0');
    assert.equal(service.isIEOrEdge(), true);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  }
});
