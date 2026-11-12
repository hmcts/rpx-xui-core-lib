import '@angular/compiler';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HtmlTemplatesHelper } from '@hmcts/rpx-xui-core-lib/ui/gov-input';

test('described-by preserves hint and invalid-state combinations', () => {
  const config = { id: 'synthetic', hint: 'hint' };
  assert.equal(HtmlTemplatesHelper.setDescribedBy(null, config), 'synthetic-hint');
  assert.equal(HtmlTemplatesHelper.setDescribedBy({isInvalid:false,messages:[]}, config), 'synthetic-hint');
  assert.equal(HtmlTemplatesHelper.setDescribedBy({isInvalid:true,messages:['error']}, config), 'synthetic-hint synthetic-error');
  assert.equal(HtmlTemplatesHelper.setDescribedBy({isInvalid:true,messages:['error']}, {id:'synthetic'}), 'synthetic-error');
  assert.equal(HtmlTemplatesHelper.setDescribedBy(null, {id:'synthetic'}), null);
});
