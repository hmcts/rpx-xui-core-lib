import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Subject } from 'rxjs';
import { ServiceMessagesComponent } from '@hmcts/rpx-xui-core-lib/ui/service-messages';

test('filters messages by role and date, and persists a dismissal', () => {
  const previousDocument = globalThis.document;
  const document = { cookie: '' };
  globalThis.document = /** @type {Document} */ (/** @type {unknown} */ (document));
  try {
    const updates = new Subject();
    const component = new ServiceMessagesComponent(/** @type {import("@hmcts/rpx-xui-core-lib/ui/feature-toggle").FeatureToggleService} */ (/** @type {unknown} */ ({ getValue: () => updates })));
    component.userRoles = ['caseworker'];
    component.featureToggleKey = 'service-banner';
    component.serviceMessageCookie = 'hidden';
    component.ngOnInit();
    const visible = { index: 1, roles: 'caseworker', message_en: 'Visible', message_cy: '', begin: '2000-01-01', end: '2999-01-01' };
    updates.next([visible, { ...visible, index: 2, roles: 'admin', message_en: 'Other role' }, { ...visible, index: 3, end: '2001-01-01', message_en: 'Expired' }]);
    assert.deepEqual(component.filteredMessages, [visible]);
    component.hideMessage(visible);
    assert.deepEqual(component.filteredMessages, []);
    assert.equal(document.cookie, 'hidden=%5B%22Visible%22%5D; path=/; SameSite=Lax');
  } finally {
    globalThis.document = previousDocument;
  }
});

test('releases the feature subscription when destroyed', () => {
  const updates = new Subject();
  const component = new ServiceMessagesComponent(/** @type {import("@hmcts/rpx-xui-core-lib/ui/feature-toggle").FeatureToggleService} */ (/** @type {unknown} */ ({ getValue: () => updates })));
  component.ngOnInit();
  assert.equal(updates.observers.length, 1);
  component.ngOnDestroy();
  assert.equal(updates.observers.length, 0);
});

test('a malformed dismissal cookie does not prevent messages from displaying', () => {
  const previousDocument = globalThis.document;
  try {
    for (const cookie of ['hidden=%not-json', 'hidden=%7B%7D', 'hidden=%5B123%5D']) {
      globalThis.document = /** @type {Document} */ (/** @type {unknown} */ ({ cookie }));
      const updates = new Subject();
      const component = new ServiceMessagesComponent(/** @type {import('@hmcts/rpx-xui-core-lib/ui/feature-toggle').FeatureToggleService} */ (/** @type {unknown} */ ({ getValue: () => updates })));
      component.userRoles = ['caseworker'];
      component.serviceMessageCookie = 'hidden';
      component.ngOnInit();
      updates.next([{ index: 1, roles: 'caseworker', message_en: 'Visible', message_cy: '' }]);
      assert.equal(component.filteredMessages.length, 1);
      component.ngOnDestroy();
    }
  } finally {
    globalThis.document = previousDocument;
  }
});

test('refresh replaces the previous feature stream', () => {
  const previousDocument = globalThis.document;
  globalThis.document = /** @type {Document} */ (/** @type {unknown} */ ({ cookie: '' }));
  try {
    const first = new Subject(); const second = new Subject(); let calls = 0;
    const component = new ServiceMessagesComponent(/** @type {import('@hmcts/rpx-xui-core-lib/ui/feature-toggle').FeatureToggleService} */ (/** @type {unknown} */ ({ getValue: () => ++calls === 1 ? first : second })));
    component.userRoles = ['caseworker']; component.serviceMessageCookie = 'hidden';
    component.ngOnInit(); component.getServiceMessages();
    assert.equal(first.observers.length, 0);
    const latest = { index: 1, roles: 'caseworker', message_en: 'Latest', message_cy: '' };
    second.next([latest]); first.next([{ ...latest, message_en: 'Stale' }]);
    assert.deepEqual(component.filteredMessages, [latest]);
    component.ngOnDestroy();
  } finally {
    globalThis.document = previousDocument;
  }
});

test('a single public message can display before roles load, but multiple messages require a role match', () => {
  const previousDocument = globalThis.document;
  globalThis.document = /** @type {Document} */ (/** @type {unknown} */ ({ cookie: '' }));
  try {
    const updates = new Subject();
    const component = new ServiceMessagesComponent(/** @type {import('@hmcts/rpx-xui-core-lib/ui/feature-toggle').FeatureToggleService} */ (/** @type {unknown} */ ({ getValue: () => updates })));
    component.serviceMessageCookie = 'hidden'; component.ngOnInit();
    const message = { index: 1, roles: '.+', message_en: 'Public', message_cy: '' };
    updates.next([message]); assert.deepEqual(component.filteredMessages, [message]);
    updates.next([message, { ...message, index: 2 }]); assert.deepEqual(component.filteredMessages, []);
    component.ngOnDestroy();
  } finally { globalThis.document = previousDocument; }
});

test('future and invalid dates are not displayed and invalid dates produce a warning', () => {
  const previousDocument = globalThis.document;
  globalThis.document = /** @type {Document} */ (/** @type {unknown} */ ({ cookie: '' }));
  try {
    const updates = new Subject();
    const component = new ServiceMessagesComponent(/** @type {import('@hmcts/rpx-xui-core-lib/ui/feature-toggle').FeatureToggleService} */ (/** @type {unknown} */ ({ getValue: () => updates })));
    component.userRoles = ['caseworker']; component.serviceMessageCookie = 'hidden'; component.ngOnInit();
    const message = { index: 1, roles: 'caseworker', message_en: 'Notice', message_cy: '' };
    updates.next([{ ...message, begin: '2999-01-01' }]); assert.deepEqual(component.filteredMessages, []);
    updates.next([{ ...message, begin: 'not-a-date' }]); assert.deepEqual(component.filteredMessages, []);
    assert.equal(component.isBannerError, true);
    assert.deepEqual(component.bannerErrorMsgs, [{ message: 'Invalid start date. Message index: 1', index: 1 }]);
    component.ngOnDestroy();
  } finally { globalThis.document = previousDocument; }
});
