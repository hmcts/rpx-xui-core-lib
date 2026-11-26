import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { probeLoading } from '../editor/selective-loading-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../dist/core-lib');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const entries = [
  { name: 'feature-toggle', symbol: 'FeatureToggleService', imports: ['@angular/core'], forbidden: ['launchdarkly-js-client-sdk'] },
  { name: 'launch-darkly', symbol: 'LaunchDarklyService', imports: ['@angular/core', 'rxjs', 'launchdarkly-js-client-sdk'], forbidden: ['@ng-idle/core', '@ng-idle/keepalive'] },
  { name: 'google-analytics', symbol: 'GoogleAnalyticsService', imports: ['@angular/core', '@angular/router', '@angular/platform-browser'], forbidden: ['@ng-idle/core', '@ng-idle/keepalive'] },
  { name: 'google-tag-manager', symbol: 'GoogleTagManagerService', imports: ['@angular/core', '@angular/router', '@angular/platform-browser'], forbidden: ['@ng-idle/core', '@ng-idle/keepalive'] },
  { name: 'manage-session', symbol: 'ManageSessionServices', imports: ['@angular/core', '@ng-idle/core', '@ng-idle/keepalive', 'rxjs'], forbidden: ['@angular/router', '@hmcts/media-viewer', '@hmcts/ccpay-web-component'] },
  { name: 'timeout-notifications', symbol: 'TimeoutNotificationsService', imports: ['@angular/core', '@ng-idle/core', '@ng-idle/keepalive', 'rxjs'], forbidden: ['@angular/router', '@hmcts/media-viewer', '@hmcts/ccpay-web-component'] },
];

for (const entry of entries) {
  test(`${entry.name} is a public selective package entry`, async () => {
    const key = `./ui/${entry.name}`;
    assert.equal(typeof manifest.exports[key]?.types, 'string');
    assert.equal(typeof manifest.exports[key]?.default, 'string');

    const bundle = `hmcts-rpx-xui-core-lib-ui-${entry.name}.mjs`;
    const graph = await probeLoading(root, `fesm2022/${bundle}`, entry.symbol);
    for (const dependency of entry.imports) assert.ok(graph.externalImports.includes(dependency), `${key} must retain ${dependency} as an external runtime peer`);
    for (const dependency of entry.forbidden) assert.ok(!graph.externalImports.includes(dependency), `${key} must not load ${dependency}`);
    assert.equal(graph.mediaViewer, false);
    assert.equal(graph.payment, false);
  });
}

test('idle runtime packages are optional package peers', () => {
  assert.equal(manifest.peerDependencies['@ng-idle/core'], '16.0.0');
  assert.equal(manifest.peerDependencies['@ng-idle/keepalive'], '16.0.0');
  assert.deepEqual(manifest.peerDependenciesMeta['@ng-idle/core'], { optional: true });
  assert.deepEqual(manifest.peerDependenciesMeta['@ng-idle/keepalive'], { optional: true });
  assert.equal(manifest.peerDependencies['launchdarkly-js-client-sdk'], '^3.8.1');
  assert.deepEqual(manifest.peerDependenciesMeta['launchdarkly-js-client-sdk'], { optional: true });
});
