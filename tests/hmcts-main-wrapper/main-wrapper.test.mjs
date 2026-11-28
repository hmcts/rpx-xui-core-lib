import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HmctsMainWrapperComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-main-wrapper';

test('main wrapper shows a back action for a route or subscribed event and emits the event', () => {
  const route = new HmctsMainWrapperComponent();
  route.backLink = '/cases';
  route.ngOnInit();
  assert.equal(route.hasBackLink, true);

  const eventOnly = new HmctsMainWrapperComponent();
  let events = 0;
  eventOnly.backEvent.subscribe(() => events++);
  eventOnly.ngOnInit();
  assert.equal(eventOnly.hasBackLink, true);
  eventOnly.onGoBack();
  assert.equal(events, 1);

  const noBackAction = new HmctsMainWrapperComponent();
  noBackAction.ngOnInit();
  assert.equal(noBackAction.hasBackLink, false);
});
