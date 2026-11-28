import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HmctsPrimaryNavigationComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-primary-navigation';

test('primary navigation preserves the logged-in visibility input', () => {
  const navigation = new HmctsPrimaryNavigationComponent();
  navigation.userLoggedIn = true;
  assert.equal(navigation.isUserLoggedIn, true);
  navigation.userLoggedIn = false;
  assert.equal(navigation.isUserLoggedIn, false);
});
