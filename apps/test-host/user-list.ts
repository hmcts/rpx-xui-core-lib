import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { UserListModule } from '@hmcts/rpx-xui-core-lib/ui/user-list';
import type { User } from '@hmcts/rpx-xui-core-lib/ui/user-details';

@Component({ selector:'core-test-host', imports:[UserListModule], template:`<main><h1>User list diagnostic</h1>
<xuilib-user-list [users]="users" [currentPageNumber]="page" [pageTotalSize]="users.length" (pageChange)="page = $event" (userClick)="selected = $event.fullName ?? ''" />
<output data-testid="page">{{page}}</output><output data-testid="selected">{{selected}}</output></main>` })
class UserListGallery {
  readonly users: User[] = Array.from({length:55}, (_, index) => ({ fullName:`Synthetic User ${index + 1}`, email:`user${index + 1}@example.invalid`, status:'Active' }));
  page = 1;
  selected = '';
}
export function startUserListGallery() {
  return bootstrapApplication(UserListGallery, {providers:[provideRouter([{path:'user-list',component:UserListGallery}]), importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:20,validity:{days:1},testMode:false}))]});
}
