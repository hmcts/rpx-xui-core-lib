import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TcConfirmComponent } from '@hmcts/rpx-xui-core-lib/terms/confirmation';

test('confirmation button emits the confirm event', () => {
  const component = new TcConfirmComponent();
  let eventCount = 0;
  component.confirm.subscribe(() => eventCount++);

  component.onClick();

  assert.equal(eventCount, 1);
});
