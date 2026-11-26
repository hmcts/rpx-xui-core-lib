import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PaginationComponent } from '@hmcts/rpx-xui-core-lib/ui/pagination';
import { PaginationComponent as CcdPaginationComponent } from '@hmcts/rpx-xui-core-lib/ui/ccd-pagination';
import { HmctsPaginationComponent as DirectHmctsPaginationComponent } from '@hmcts/rpx-xui-core-lib/ui/hmcts-pagination';
import { HmctsPaginationComponent as UserListHmctsPaginationComponent } from '@hmcts/rpx-xui-core-lib/ui/user-list';

test('CCD pagination preserves its Toolkit input defaults', () => {
  const pagination = new CcdPaginationComponent();

  assert.equal(pagination.maxSize, 7);
  assert.equal(pagination.previousLabel, 'Previous');
  assert.equal(pagination.nextLabel, 'Next');
  assert.equal(pagination.navigationLabel, 'Pagination');
  assert.equal(pagination.screenReaderPaginationLabel, 'Pagination');
  assert.equal(pagination.screenReaderPageLabel, 'page');
  assert.equal(pagination.screenReaderCurrentLabel, `You're on page`);
  assert.equal(pagination.directionLinks, true);
  assert.equal(pagination.autoHide, false);
  assert.equal(pagination.responsive, false);
});

test('CCD pagination coerces false string inputs to false', () => {
  const pagination = new CcdPaginationComponent();

  Reflect.set(pagination, 'directionLinks', 'false');
  Reflect.set(pagination, 'autoHide', 'false');
  Reflect.set(pagination, 'responsive', 'false');

  assert.equal(pagination.directionLinks, false);
  assert.equal(pagination.autoHide, false);
  assert.equal(pagination.responsive, false);
});

test('generic pagination retains the null payload on both public outputs', () => {
  const pagination = new PaginationComponent();
  assert.equal(pagination.navigationLabel, 'Pagination navigation');
  const events = [];
  pagination.previousPage.subscribe(value => events.push(['previous', value]));
  pagination.nextPage.subscribe(value => events.push(['next', value]));

  pagination.onPrevious();
  pagination.onNext();

  assert.deepEqual(events, [['previous', null], ['next', null]]);
});

test('user-list and standalone HMCTS pagination share one component identity', () => {
  assert.equal(UserListHmctsPaginationComponent, DirectHmctsPaginationComponent);
  assert.equal(new DirectHmctsPaginationComponent().navigationLabel, 'Pagination navigation');
});

test('both pagination entries allow a caller to distinguish navigation landmarks', () => {
  const generic = new PaginationComponent();
  const hmcts = new DirectHmctsPaginationComponent();
  generic.navigationLabel = 'Search results pagination';
  hmcts.navigationLabel = 'User list pagination';
  assert.equal(generic.navigationLabel, 'Search results pagination');
  assert.equal(hmcts.navigationLabel, 'User list pagination');
});
