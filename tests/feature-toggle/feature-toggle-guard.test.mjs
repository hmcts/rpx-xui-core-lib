import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Subject, firstValueFrom, throwError } from 'rxjs';
import { FeatureToggleGuard } from '@hmcts/rpx-xui-core-lib/ui/feature-toggle-guard';

function createGuard(valuesByFeature) {
  const calls = [];
  const parsedUrls = [];
  const router = { parseUrl: value => { parsedUrls.push(value); return { redirectTo: value }; } };
  const service = { getValueOnce: (feature, defaultValue) => { calls.push([feature, defaultValue]); return valuesByFeature[feature]; } };
  const typedService = /** @type {ConstructorParameters<typeof FeatureToggleGuard>[0]} */ (/** @type {unknown} */ (service));
  const typedRouter = /** @type {ConstructorParameters<typeof FeatureToggleGuard>[1]} */ (/** @type {unknown} */ (router));
  return { guard: new FeatureToggleGuard(typedService, typedRouter), calls, parsedUrls };
}

/** @param {object} data */
function route(data) {
  return /** @type {import('@angular/router').ActivatedRouteSnapshot} */ (/** @type {unknown} */ ({ data }));
}

test('feature-toggle guard waits for every flag and supplies true as each default', () => {
  const first = new Subject();
  const second = new Subject();
  const { guard, calls } = createGuard({ first, second });
  const decisions = [];
  guard.canActivate(route({ needsFeaturesEnabled: ['first', 'second'], featureDisabledRedirect: '/home' })).subscribe(value => decisions.push(value));

  assert.deepEqual(calls, [['first', true], ['second', true]]);
  first.next(true);
  assert.deepEqual(decisions, []);
  second.next(true);
  assert.deepEqual(decisions, [true]);
});

test('feature-toggle guard redirects when any required flag is disabled', async () => {
  const first = new Subject();
  const { guard, parsedUrls } = createGuard({ first });
  const decision = firstValueFrom(guard.canActivate(route({ needsFeaturesEnabled: ['first'], featureDisabledRedirect: '/home' })));
  assert.deepEqual(parsedUrls, []);
  first.next(false);
  const result = await decision;
  assert.deepEqual(result, { redirectTo: '/home' });
  assert.deepEqual(parsedUrls, ['/home']);
});

test('literal false inverts the all-enabled rule; other values keep the default rule', async () => {
  const first = new Subject();
  const second = new Subject();
  const allowed = createGuard({ first, second });
  const routeData = { needsFeaturesEnabled: ['first', 'second'], expectFeatureEnabled: false, featureDisabledRedirect: '/new-registration' };
  const decision = firstValueFrom(allowed.guard.canActivate(route(routeData)));
  first.next(true);
  second.next(false);
  assert.equal(await decision, true);
  assert.deepEqual(allowed.parsedUrls, []);

  const enabled = new Subject();
  const enabledOnly = createGuard({ first: enabled });
  const redirect = firstValueFrom(enabledOnly.guard.canActivate(route({ ...routeData, needsFeaturesEnabled: ['first'] })));
  enabled.next(true);
  assert.deepEqual(await redirect, { redirectTo: '/new-registration' });

  const enabledByDefault = new Subject();
  const defaultRule = createGuard({ first: enabledByDefault });
  const defaultDecision = firstValueFrom(defaultRule.guard.canActivate(route({ ...routeData, needsFeaturesEnabled: ['first'], expectFeatureEnabled: 0 })));
  enabledByDefault.next(true);
  assert.equal(await defaultDecision, true);
});

test('feature-toggle guard propagates provider errors', async () => {
  const failure = new Error('synthetic provider failure');
  const { guard } = createGuard({ first: throwError(() => failure) });
  await assert.rejects(firstValueFrom(guard.canActivate(route({ needsFeaturesEnabled: ['first'], featureDisabledRedirect: '/home' }))), error => error === failure);
});

test('feature-toggle guard preserves missing and empty route metadata behavior', () => {
  const { guard } = createGuard({});
  assert.throws(() => guard.canActivate(route({})));

  let emitted = false;
  let completed = false;
  guard.canActivate(route({ needsFeaturesEnabled: [] })).subscribe({ next: () => { emitted = true; }, complete: () => { completed = true; } });
  assert.equal(emitted, false);
  assert.equal(completed, true);
});
