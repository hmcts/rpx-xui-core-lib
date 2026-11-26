import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RoleMatching, matchRoles } from '@hmcts/rpx-xui-core-lib/ui/role-state';
import { RoleService } from '@hmcts/rpx-xui-core-lib/ui/role-state';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard {
  public constructor(
    private readonly roleService: RoleService,
    private readonly router: Router
  ) {}

  public canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.roleService.roles$.pipe(
      map(roles => matchRoles(roles, route.data.needsRole as string[], route.data.roleMatching as RoleMatching)
        ? true
        : this.router.parseUrl(route.data.noRoleMatchRedirect as string))
    );
  }
}
