import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { checkInstallResult, validateManifest, hostDependencies, checkMatrixReport } from '../scripts/check-compatibility.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/compatibility/${name}`, import.meta.url), 'utf8'));
const manifest = fixture('prospective-package.json');
const ledger = fixture('dependency-ledger.json');

test('the complete prospective manifest classifies each required module without duplicated implementations', () => {
  validateManifest(manifest, ledger);
});
for (const code of ['YN0002', 'YN0060', 'YN0086']) {
  test(`a zero-exit native Yarn install still fails for ${code}`, () => {
    assert.throws(() => checkInstallResult({ status: 0, stdout: `{"displayName":"${code}"}`, stderr: '' }), /peer/);
  });
}
test('a failed or missing native Yarn process cannot pass', () => {
  for (const status of [1, null]) assert.throws(() => checkInstallResult({ status, stdout: '', stderr: 'failed' }), /install/);
});
test('a complete warning-free native Yarn result passes', () => {
  checkInstallResult({ status: 0, stdout: '{"displayName":"YN0000"}', stderr: '' });
});
test('required peers cannot be marked optional or silently overridden', () => {
  for (const change of [{ peerDependenciesMeta: { helmet: { optional: true } } }, { resolutions: { helmet: '8.1.0' } }]) {
    assert.throws(() => validateManifest({ ...manifest, ...change }, ledger), /optional|override/);
  }
});
test('a missing required public type provider fails the manifest check', () => {
  const broken = structuredClone(manifest);
  delete broken.dependencies['@types/express-serve-static-core'];
  assert.throws(() => validateManifest(broken, ledger), /classif|provider/);
});
test('actual host requirements retain their real conflicting versions', () => {
  const dependencies = hostDependencies(manifest, { actual_requirements: { 'zone.js': '0.16.3', 'ngx-editor': '19.1.1' }, locked_toolchain: { typescript: '5.9.2' } });
  assert.equal(dependencies['zone.js'], '0.16.3');
  assert.equal(dependencies['ngx-editor'], '19.1.1');
  assert.equal(dependencies.typescript, '5.9.2');
  assert.equal(dependencies.helmet, '8.1.0');
});

test('an unowned prospective dependency cannot evade the closure ledger', () => {
  assert.throws(() => validateManifest({ ...manifest, dependencies: { ...manifest.dependencies, 'unowned-module': '1.0.0' } }, ledger), /Unclassified/);
});

function completeReport() {
  return { artifactSha256: 'a'.repeat(64), unresolvedDecisions: [], profiles: ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'].map((id) => ({ id, nativeStatus: 0, immutableNativeStatus: 0, cleanInstall: true, immutableInstall: true, identity: true })) };
}
test('all five complete native profiles and accepted decisions are required', () => {
  checkMatrixReport(completeReport());
  const missing = completeReport();
  missing.profiles.splice(1, 1);
  assert.throws(() => checkMatrixReport(missing), /profile/);
});
test('native failures or unresolved decisions cannot produce accepted support', () => {
  const unresolved = completeReport();
  unresolved.unresolvedDecisions.push({ id: 'external-release' });
  assert.throws(() => checkMatrixReport(unresolved), /decision/);
  const failure = completeReport();
  failure.profiles[0].nativeStatus = 1;
  assert.throws(() => checkMatrixReport(failure), /native/);
});
test('missing artifact bytes and skipped identity probes reject the matrix', () => {
  const noArtifact = completeReport();
  noArtifact.artifactSha256 = '';
  assert.throws(() => checkMatrixReport(noArtifact), /artifact/);
  const skipped = completeReport();
  skipped.profiles[2].identity = false;
  assert.throws(() => checkMatrixReport(skipped), /identity/);
});

test('the frozen MC profile preserves its declared and locked marked requirement over the provider default', () => {
  const profile = fixture('profiles.json').profiles.find((entry) => entry.id === 'rpx-xui-webapp');
  assert.equal(profile.actual_requirements.marked, '^18.0.5');
  assert.equal(profile.locked_peer_versions.marked, '18.1.3');
  assert.equal(hostDependencies(manifest, profile, { marked: '16.4.2' }).marked, '18.1.3');
});
