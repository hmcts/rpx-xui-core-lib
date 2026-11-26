import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstValueFrom } from 'rxjs';
import { RoleGuard, RoleMatching } from '@hmcts/rpx-xui-core-lib/ui/role-guard';
import { RoleMatching as StateRoleMatching, RoleService } from '@hmcts/rpx-xui-core-lib/ui/role-state';

const route = data => /** @type {import('@angular/router').ActivatedRouteSnapshot} */ (/** @type {unknown} */ ({ data }));

test('role guard waits for role state before allowing a matching route', async () => {
  const roles = new RoleService();
  const router = /** @type {import('@angular/router').Router} */ (/** @type {unknown} */ ({ parseUrl: path => ({ path }) }));
  const guard = new RoleGuard(roles, router);
  let settled = false;
  const result = firstValueFrom(guard.canActivate(route({ needsRole: ['^staff$'] }))).then(value => {
    settled = true;
    return value;
  });

  await Promise.resolve();
  assert.equal(settled, false);
  roles.roles = ['staff'];
  assert.equal(await result, true);
});

test('role guard preserves ALL and default ANY matching and redirects denied routes', async () => {
  const roles = new RoleService();
  const redirects = [];
  const router = /** @type {import('@angular/router').Router} */ (/** @type {unknown} */ ({ parseUrl: path => { redirects.push(path); return { path }; } }));
  const guard = new RoleGuard(roles, router);
  roles.roles = ['staff-admin', 'caseworker'];

  assert.equal(await firstValueFrom(guard.canActivate(route({ needsRole: ['staff-admin', 'caseworker'], roleMatching: RoleMatching.ALL }))), true);
  assert.equal(await firstValueFrom(guard.canActivate(route({ needsRole: ['missing', 'caseworker'] }))), true);
  assert.deepEqual(await firstValueFrom(guard.canActivate(route({ needsRole: ['missing'], noRoleMatchRedirect: '/unauthorised' }))), { path: '/unauthorised' });
  assert.deepEqual(redirects, ['/unauthorised']);
});

test('role guard reuses the RoleMatching enum exported by role-state', () => {
  assert.strictEqual(RoleMatching, StateRoleMatching);
});
