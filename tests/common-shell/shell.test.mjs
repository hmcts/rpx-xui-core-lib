import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HmctsMainWrapperComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';
import { HmctsPrimaryNavigationComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';
import { HmctsIdentityBarComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-identity-bar';

test('main wrapper retains route and event-only Back visibility with its original void output', () => {
  const blank = new HmctsMainWrapperComponent();
  blank.ngOnInit();
  assert.equal(blank.hasBackLink, false);
  const routed = new HmctsMainWrapperComponent();
  routed.backLink = '/previous';
  routed.ngOnInit();
  assert.equal(routed.hasBackLink, true);
  const eventOnly = new HmctsMainWrapperComponent();
  const values = [];
  const subscription = eventOnly.backEvent.subscribe(value => values.push(value));
  eventOnly.ngOnInit();
  assert.equal(eventOnly.hasBackLink, true);
  eventOnly.onGoBack();
  assert.deepEqual(values, [undefined]);
  subscription.unsubscribe();
});

test('main wrapper retains banner identity and initialization-only Back calculation', () => {
  const wrapper = new HmctsMainWrapperComponent();
  const banner = /** @type {const} */ ({ type: 'success', message: 'Saved' });
  wrapper.summaryErrors = null;
  assert.equal(wrapper.summaryErrors, null);
  wrapper.banner = banner;
  assert.equal(wrapper.bannerData, banner);
  wrapper.ngOnInit();
  wrapper.backLink = '/later';
  assert.equal(wrapper.hasBackLink, false);
});

test('primary navigation preserves the caller login state and item objects', () => {
  const nav = new HmctsPrimaryNavigationComponent();
  const items = [{ active: true, href: '/home', text: 'Home' }];
  nav.items = items;
  nav.userLoggedIn = true;
  assert.equal(nav.isUserLoggedIn, true);
  assert.equal(nav.items, items);
  nav.userLoggedIn = false;
  assert.equal(nav.isUserLoggedIn, false);
});

test('identity bar preserves its name setter and legacy null-input failure', () => {
  const bar = new HmctsIdentityBarComponent();
  bar.content = { name: 'Synthetic organisation', ignored: 'field' };
  assert.equal(bar.value, 'Synthetic organisation');
  bar.content = { name: '' };
  assert.equal(bar.value, '');
  assert.throws(() => { bar.content = null; }, TypeError);
});
