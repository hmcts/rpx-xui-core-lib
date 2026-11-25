import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FeatureToggleService } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';

@Injectable({ providedIn: 'root' })
export class FeatureToggleGuard {
  public constructor(
    private readonly featureToggleService: FeatureToggleService,
    private readonly router: Router
  ) {}

  public canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return combineLatest((route.data.needsFeaturesEnabled as string[]).map(
      feature => this.featureToggleService.getValueOnce<boolean>(feature, true)
    )).pipe(
      map(featureStatuses => featureStatuses.every(status => status)),
      map(enabled => enabled === (route.data.expectFeatureEnabled !== false)
        ? true
        : this.router.parseUrl(route.data.featureDisabledRedirect as string))
    );
  }
}
