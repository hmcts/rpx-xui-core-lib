import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { RoleGuard, RoleMatching } from '@hmcts/rpx-xui-core-lib/ui/role-guard';
import { RoleService } from '@hmcts/rpx-xui-core-lib/ui/role-state';

const roleState = new RoleService();

@Component({ standalone: true, template: '<h1>Staff route</h1>' })
class StaffPage {}

@Component({ standalone: true, template: '<h1>All roles route</h1>' })
class AllRolesPage {}

@Component({ standalone: true, template: '<h1>Role fallback page</h1>' })
class FallbackPage {}

@Component({
  selector: 'core-role-guard-gallery',
  standalone: true,
  imports: [RouterOutlet],
  template: `<main>
    <h1>Role route guard test host</h1>
    <button type="button" (click)="loadAdminRole()">Load staff-admin role</button>
    <button type="button" (click)="loadCaseworkerRole()">Load caseworker role</button>
    <button type="button" (click)="loadAllRoles()">Load both roles</button>
    <button type="button" (click)="open('staff')">Open staff route</button>
    <button type="button" (click)="open('all-roles')">Open all-roles route</button>
    <router-outlet />
  </main>`,
})
class RoleGuardGallery {
  public constructor(private readonly router: Router) {}

  public loadAdminRole(): void { roleState.roles = ['staff-admin']; }
  public loadCaseworkerRole(): void { roleState.roles = ['caseworker']; }
  public loadAllRoles(): void { roleState.roles = ['staff-admin', 'caseworker']; }

  public open(path: string): void {
    void this.router.navigateByUrl(`/role-guard/${path}`);
  }
}

@Component({
  selector: 'core-role-guard-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class RoleGuardRoot {}

const routes = [
  {
    path: 'role-guard',
    component: RoleGuardGallery,
    children: [
      { path: 'staff', component: StaffPage, canActivate: [RoleGuard], data: { needsRole: ['^staff-admin$'], noRoleMatchRedirect: '/role-guard/fallback' } },
      { path: 'all-roles', component: AllRolesPage, canActivate: [RoleGuard], data: { needsRole: ['^staff-admin$', '^caseworker$'], roleMatching: RoleMatching.ALL, noRoleMatchRedirect: '/role-guard/fallback' } },
      { path: 'fallback', component: FallbackPage },
    ],
  },
];

export function startRoleGuardGallery() {
  return bootstrapApplication(RoleGuardRoot, {
    providers: [provideRouter(routes), { provide: RoleService, useValue: roleState }],
  });
}
