import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { UserDetailsModule, type User } from '@hmcts/rpx-xui-core-lib/ui/user-details';

@Component({selector:'core-test-host', imports:[UserDetailsModule], template:`<main>
  <h1>User details diagnostic</h1>
  <button type="button" (click)="pending()">Pending user</button>
  <button type="button" (click)="active()">Active user</button>
  <xuilib-user-details [user]="user" [showSuspendUserButton]="true" (reinvite)="record('reinvite', $event)" (suspendUserEvent)="record('suspend', $event)" />
  <output data-testid="event">{{ event }}</output>
</main>`})
class UserDetailsGallery {
  user: User = { fullName: 'Synthetic User', email: 'user@example.invalid', roles: ['pui-caa'] };
  event = '';
  pending() { this.user = { ...this.user, resendInvite: true }; }
  active() { this.user = { ...this.user, resendInvite: false }; }
  record(action: string, user: User) { this.event = `${action}:${user.email}`; }
}
export function startUserDetailsGallery() {
  return bootstrapApplication(UserDetailsGallery, { providers: [provideRouter([{path:'user-details', component:UserDetailsGallery}]), importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations', debounceTimeMs:20, validity:{days:1}, testMode:false}))] });
}
