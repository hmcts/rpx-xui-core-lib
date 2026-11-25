import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { FeatureToggleGuard } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle-guard';
import { FeatureToggleService } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle';

const globalSearchEnabled = new BehaviorSubject(true);
const refundsEnabled = new BehaviorSubject(true);
const newRegistrationEnabled = new BehaviorSubject(false);
const featureValues = new Map([
  ['feature-global-search', globalSearchEnabled],
  ['feature-refunds', refundsEnabled],
  ['new-register-org', newRegistrationEnabled],
]);

const featureToggleProvider = {
  getValueOnce: (key: string, defaultValue: boolean) => featureValues.get(key) ?? of(defaultValue),
};

@Component({ standalone: true, template: '<h1>Search cases</h1>' })
class SearchPage {}

@Component({ standalone: true, template: '<h1>Refunds</h1>' })
class RefundsPage {}

@Component({ standalone: true, template: '<h1>Registration landing page</h1>' })
class HomePage {}

@Component({ standalone: true, template: '<h1>Old registration</h1>' })
class OldRegistrationPage {}

@Component({ standalone: true, template: '<h1>New registration</h1>' })
class NewRegistrationPage {}

@Component({
  selector: 'core-feature-toggle-guard-gallery',
  standalone: true,
  imports: [RouterOutlet],
  template: `<main>
    <h1>Feature-toggle route guard test host</h1>
    <button type="button" (click)="open('home')">Open home</button>
    <button type="button" (click)="open('search')">Open search</button>
    <button type="button" (click)="open('refunds')">Open refunds</button>
    <button type="button" (click)="globalSearchEnabled.next(false)">Disable global search</button>
    <button type="button" (click)="globalSearchEnabled.next(true)">Enable global search</button>
    <button type="button" (click)="open('register-old')">Open old registration</button>
    <button type="button" (click)="open('register-new')">Open new registration</button>
    <button type="button" (click)="newRegistrationEnabled.next(true)">Enable new registration</button>
    <button type="button" (click)="newRegistrationEnabled.next(false)">Disable new registration</button>
    <router-outlet />
  </main>`,
})
class FeatureToggleGuardGallery {
  readonly globalSearchEnabled = globalSearchEnabled;
  readonly newRegistrationEnabled = newRegistrationEnabled;

  public constructor(private readonly router: Router) {}

  public open(path: string): void {
    void this.router.navigateByUrl(`/feature-toggle-guard/${path}`);
  }
}

@Component({
  selector: 'core-feature-toggle-guard-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class FeatureToggleGuardRoot {}

const routes = [
  { path: '', pathMatch: 'full' as const, redirectTo: 'feature-toggle-guard' },
  {
    path: 'feature-toggle-guard',
    component: FeatureToggleGuardGallery,
    children: [
      { path: 'search', component: SearchPage, canActivate: [FeatureToggleGuard], data: { needsFeaturesEnabled: ['feature-global-search'], featureDisabledRedirect: '/feature-toggle-guard/home' } },
      { path: 'refunds', component: RefundsPage, canActivate: [FeatureToggleGuard], data: { needsFeaturesEnabled: ['feature-refunds'], featureDisabledRedirect: '/feature-toggle-guard/home' } },
      { path: 'home', component: HomePage },
      { path: 'register-old', component: OldRegistrationPage, canActivate: [FeatureToggleGuard], data: { needsFeaturesEnabled: ['new-register-org'], expectFeatureEnabled: false, featureDisabledRedirect: '/feature-toggle-guard/register-new' } },
      { path: 'register-new', component: NewRegistrationPage, canActivate: [FeatureToggleGuard], data: { needsFeaturesEnabled: ['new-register-org'], expectFeatureEnabled: true, featureDisabledRedirect: '/feature-toggle-guard/register-old' } },
    ],
  },
];

export function startFeatureToggleGuardGallery() {
  return bootstrapApplication(FeatureToggleGuardRoot, {
    providers: [provideRouter(routes), { provide: FeatureToggleService, useValue: featureToggleProvider }],
  });
}
