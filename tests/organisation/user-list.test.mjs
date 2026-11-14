import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserListComponent } from '@hmcts/rpx-xui-core-lib/ui/user-list';

test('user list retains the legacy 50-item page and emits the selected user', () => {
  const component = new UserListComponent();
  component.currentPageNumber = 2;
  component.pageTotalSize = 123;
  component.ngOnInit();
  assert.deepEqual(component.pagination, { itemsPerPage: 50, currentPage: 2, totalItems: 123 });
  const user = { fullName: 'Synthetic User', email: 'user@example.invalid' };
  const selected = [];
  component.userClick.subscribe(value => selected.push(value));
  component.onUserClick(user);
  assert.equal(selected[0], user);
});

test('user list updates the current page and emits the requested page', () => {
  const component = new UserListComponent();
  const pages = [];
  component.pageChange.subscribe(value => pages.push(value));
  component.emitPageClickEvent(3);
  assert.equal(component.currentPageNumber, 3);
  assert.deepEqual(pages, [3]);
});
