import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as compatibility from '../scripts/check-compatibility.mjs';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifySourceHashes } from './fixtures/compatibility/verify-source-contract.mjs';
import { createHash } from 'node:crypto';
import { checkInstallResult, validateManifest, hostDependencies, checkMatrixReport, validateHostProfile, hostManifest, hostInstallSettings, hostLockBytes, checkLockedTelemetry } from '../scripts/check-compatibility.mjs';

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
  return { artifactSha256: 'a'.repeat(64), unresolvedDecisions: [], profiles: ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'].map((id) => ({ id, nativeStatus: 0, immutableNativeStatus: 0, cleanInstall: true, immutableInstall: true, identity: true, hostLockSource: null, lockedTelemetryVerified: null })) };
}
test('all five complete native profiles and accepted decisions are required', () => {
  checkMatrixReport(completeReport());
  const reordered = completeReport();
  reordered.profiles.reverse();
  checkMatrixReport(reordered);
  const duplicated = completeReport();
  duplicated.profiles[1] = duplicated.profiles[0];
  assert.throws(() => checkMatrixReport(duplicated), /profile/);
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


test('the refreshed MC profile preserves current telemetry, proxy, webpack and host resolution selections', () => {
  const profile = fixture('profiles.json').profiles.find((entry) => entry.id === 'rpx-xui-webapp');
  assert.equal(profile.gitHead, '67cda3e943a69fd57a692189941863b1c6d5c3f9');
  assert.equal(profile.actual_requirements.applicationinsights, '^3.17.0');
  assert.equal(profile.locked_peer_versions.applicationinsights, '3.17.0');
  assert.equal(profile.actual_requirements['global-agent'], '^4.1.3');
  assert.equal(profile.locked_peer_versions['global-agent'], '4.1.7');
  assert.equal(profile.locked_toolchain.webpack, '5.112.0');
  assert.equal(profile.host_resolutions['@opentelemetry/core'], '^2.12.0');
  assert.equal(profile.host_resolutions.webpack, '5.112.0');
  const dependencies = hostDependencies(manifest, profile);
  assert.equal(dependencies.applicationinsights, '3.17.0');
  assert.equal(dependencies['global-agent'], '4.1.7');
  assert.equal(dependencies.webpack, '5.112.0');
  assert.equal(dependencies.marked, '18.1.3');
  assert.equal(profile.manager, '4.17.1');
  assert.equal(profile.install_settings.npmMinimalAgeGate, 0);
  assert.equal(profile.install_settings.enableScripts, true);
  assert.deepEqual(profile.install_settings.approvedGitRepositories, ['**']);
  assert.equal(hostInstallSettings(profile, '/cache', '/global').enableScripts, true);
});

test('standalone MC API retains declared runtime dependencies and explicit inherited-lock provenance', () => {
  const profile = fixture('profiles.json').standalone_mc_api;
  assert.equal(profile.gitHead, '67cda3e943a69fd57a692189941863b1c6d5c3f9');
  assert.deepEqual(profile.actual_requirements, { applicationinsights: '^3.17.0', express: '^5.2.1' });
  assert.deepEqual(profile.locked_peer_versions, { applicationinsights: '3.17.0', express: '5.3.0' });
  assert.equal(profile.lock_source, 'yarn.lock (root); no api/yarn.lock exists');
  assert.equal(profile.manager, '4.7.0');
  assert.deepEqual(profile.install_settings, {});
  const dependencies = hostDependencies(manifest, profile);
  assert.equal(dependencies.applicationinsights, '3.17.0');
  assert.equal(dependencies.express, '5.3.0');
});


test('only frozen source-owned MC resolutions enter the generated root and peer errors still block', () => {
  const profiles = fixture('profiles.json');
  const source = fixture('source-contract.json');
  const mc = profiles.profiles.find((profile) => profile.id === 'rpx-xui-webapp');
  validateHostProfile(mc, source);
  const generated = hostManifest(manifest, mc);
  assert.deepEqual(generated.resolutions, source.profiles[mc.id].host_resolutions);
  assert.equal(generated.dependencies.webpack, '5.112.0');
  assert.equal(generated.dependencies.applicationinsights, '3.17.0');
  assert.equal(generated.dependencies.marked, '18.1.3');
  for (const change of [
    { host_resolutions: { ...mc.host_resolutions, '@angular/core': '20.3.35' } },
    { host_resolutions: { ...mc.host_resolutions, '@opentelemetry/core': '^2.8.0' } },
    { resolutions: { '@angular/core': '20.3.35' } },
    { overrides: { '@angular/core': '20.3.35' } },
  ]) assert.throws(() => validateHostProfile({ ...mc, ...change }, source), /resolution|override/i);
  for (const code of ['YN0002', 'YN0060', 'YN0086']) {
    assert.throws(() => checkInstallResult({ status: 0, stdout: code, stderr: '' }), /peer/);
  }
  assert.throws(() => validateHostProfile({ ...mc, install_settings: { ...mc.install_settings, packageExtensions: { 'mutable-div@*': { peerDependencies: { '@angular/core': '*' } } } } }, source), /install setting/i);
  validateHostProfile(profiles.standalone_mc_api, source);
  assert.equal(hostManifest(manifest, profiles.standalone_mc_api).resolutions, undefined);
  assert.throws(() => validateHostProfile({ id: 'core', host_resolutions: { express: '5.3.0' } }, source));
});


test('MC root seeds the exact committed host lock before resolving prospective additions', () => {
  const profile = fixture('profiles.json').profiles.find((entry) => entry.id === 'rpx-xui-webapp');
  const source = fixture('source-contract.json');
  assert.equal(profile.lock_source_url, 'https://raw.githubusercontent.com/hmcts/rpx-xui-webapp/67cda3e943a69fd57a692189941863b1c6d5c3f9/yarn.lock');
  assert.equal(profile.lock_sha256, source.sources['rpx-xui-webapp'].files['yarn.lock']);
  assert.equal(profile.host_resolutions['@opentelemetry/core'], '^2.12.0');
});


test('host lock bytes and configuration must match the frozen committed source', async () => {
  const source = fixture('source-contract.json');
  const profile = fixture('profiles.json').profiles.find((entry) => entry.id === 'rpx-xui-webapp');
  validateHostProfile(profile, source);
  for (const change of [{ lock_source_url: 'https://example.invalid/other.lock' }, { lock_sha256: 'a'.repeat(64) }]) {
    assert.throws(() => validateHostProfile({ ...profile, ...change }, source), /lock/i);
  }
  const bytes = Buffer.from('frozen host lock');
  const frozen = { lock_source_url: profile.lock_source_url, lock_sha256: createHash('sha256').update(bytes).digest('hex') };
  const fetcher = async () => new Response(bytes);
  assert.deepEqual(await hostLockBytes(frozen, fetcher), bytes);
  await assert.rejects(hostLockBytes({ ...frozen, lock_sha256: 'b'.repeat(64) }, fetcher), /lock bytes/i);
  assert.equal(await hostLockBytes({}), null);
});

test('every installed telemetry descriptor stays within frozen source versions', () => {
  const expected = { '@opentelemetry/core': ['2.12.0'] };
  const exact = '"@opentelemetry/core@npm:^2.12.0":\n  version: 2.12.0\n';
  assert.deepEqual(checkLockedTelemetry(exact, expected), expected);
  assert.throws(() => checkLockedTelemetry(exact.replace('version: 2.12.0', 'version: 2.12.1'), expected), /drift/i);
  assert.throws(() => checkLockedTelemetry(exact + '"@opentelemetry/core@npm:^1":\n  version: 1.30.0\n', expected), /drift/i);
  assert.throws(() => checkLockedTelemetry(exact + '"@opentelemetry/unapproved@npm:^1":\n  version: 1.0.0\n', expected), /drift/i);
  const skipped = completeReport();
  skipped.profiles[1].hostLockSource = 'frozen lock';
  skipped.profiles[1].lockedTelemetryVerified = false;
  assert.throws(() => checkMatrixReport(skipped), /telemetry lock/i);
});


test('complete decisions are validated against the actual candidate before acceptance', () => {
  const expected = { sourceSha: 'a'.repeat(40), artifactSha256: 'b'.repeat(64) };
  const decisions = fixture('decisions.json');
  const accepted = { ...decisions[0], status: 'accepted', owner: 'owner', reviewer: 'reviewer', evidence: 'evidence', ...expected };
  const collection = [accepted, ...decisions.slice(1)];
  compatibility.validateDecisions(collection, expected);
  for (const field of ['owner', 'reviewer', 'evidence', 'sourceSha', 'artifactSha256']) {
    const bad = structuredClone(collection);
    delete bad[0][field];
    assert.throws(() => compatibility.validateDecisions(bad, expected));
  }
  for (const change of [{status: 'unknown'}, {sourceSha: 'c'.repeat(40)}, {artifactSha256: 'd'.repeat(64)}, {owner: '  '}]) {
    assert.throws(() => compatibility.validateDecisions([{...accepted, ...change}, ...decisions.slice(1)], expected));
  }
  compatibility.validateDecisions(decisions, expected);
  for (const incomplete of [[], decisions.slice(1), [...decisions, decisions[0]], [{ ...decisions[0], id: 'invented' }, ...decisions.slice(1)]]) {
    assert.throws(() => compatibility.validateDecisions(incomplete, expected));
  }
});


test('matrix CLI rejects invalid decisions and profiles before any host install', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'compatibility-cli-')));
  try {
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    mkdirSync(join(dir, 'tests/fixtures'), { recursive: true });
    mkdirSync(join(dir, 'dist/core-lib'), { recursive: true });
    mkdirSync(join(dir, '.yarn/releases'), { recursive: true });
    cpSync(new URL('../scripts/check-compatibility.mjs', import.meta.url), join(dir, 'scripts/check-compatibility.mjs'));
    cpSync(new URL('./fixtures/compatibility', import.meta.url), join(dir, 'tests/fixtures/compatibility'), { recursive: true });
    writeFileSync(join(dir, 'dist/core-lib/package.json'), '{}');
    writeFileSync(join(dir, '.yarn/releases/yarn-4.18.1.cjs'), "require('fs').writeFileSync(process.argv[process.argv.indexOf('--out') + 1], 'candidate');\n");
    const coreHash = createHash('sha256').update(readFileSync(join(dir, '.yarn/releases/yarn-4.18.1.cjs'))).digest('hex');
    const source = fixture('source-contract.json');
    source.sources.core.files['.yarn/releases/yarn-4.18.1.cjs'] = coreHash;
    source.profiles.core.manager_sha256 = coreHash;
    writeFileSync(join(dir, 'tests/fixtures/compatibility/source-contract.json'), JSON.stringify(source));
    const baseProfiles = fixture('profiles.json');
    baseProfiles.core.manager_sha256 = coreHash;
    writeFileSync(join(dir, 'tests/fixtures/compatibility/profiles.json'), JSON.stringify(baseProfiles));
    assert.equal(spawnSync('git', ['init', '-q', dir]).status, 0);
    assert.equal(spawnSync('git', ['-C', dir, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '--allow-empty', '-qm', 'fixture']).status, 0);
    const sourceSha = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    const artifactSha256 = createHash('sha256').update('candidate').digest('hex');
    const decisions = fixture('decisions.json');
    const accepted = { ...decisions[0], status: 'accepted', owner: 'owner', reviewer: 'reviewer', evidence: 'proof', sourceSha, artifactSha256 };
    const variants = ['owner', 'reviewer', 'evidence', 'sourceSha', 'artifactSha256'].map((field) => { const value = { ...accepted }; delete value[field]; return value; });
    variants.push({ ...accepted, status: 'unknown' }, { ...accepted, artifactSha256: 'd'.repeat(64) });
    for (const invalid of variants) {
      writeFileSync(join(dir, 'tests/fixtures/compatibility/decisions.json'), JSON.stringify([invalid, ...decisions.slice(1)]));
      const run = spawnSync(process.execPath, [join(dir, 'scripts/check-compatibility.mjs')], { encoding: 'utf8' });
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /decision/i);
      const report = JSON.parse(readFileSync(join(dir, 'test-results/compatibility/report.json'), 'utf8'));
      assert.equal(report.status, 'failed');
      assert.equal(report.profiles.length, 0);
      assert.equal(report.unresolvedDecisions.length, decisions.length);
    }
    writeFileSync(join(dir, 'tests/fixtures/compatibility/decisions.json'), JSON.stringify(decisions));
    for (let index = 0; index < 5; index++) {
      const changed = structuredClone(baseProfiles);
      const matrix = [changed.core, ...changed.profiles, changed.standalone_mc_api];
      matrix[index].manager = '0.0.0';
      writeFileSync(join(dir, 'tests/fixtures/compatibility/profiles.json'), JSON.stringify(changed));
      const run = spawnSync(process.execPath, [join(dir, 'scripts/check-compatibility.mjs')], { encoding: 'utf8' });
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /manager|contract/i);
      const report = JSON.parse(readFileSync(join(dir, 'test-results/compatibility/report.json'), 'utf8'));
      assert.equal(report.status, 'failed');
      assert.equal(report.profiles.length, 0);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('every constructed profile rejects drift from its complete source contract', () => {
  const source = fixture('source-contract.json');
  const profiles = compatibility.constructProfiles(fixture('profiles.json'), source);
  assert.equal(profiles.length, 5);
  for (const profile of profiles) {
    validateHostProfile(profile, source);
    const missing = structuredClone(source);
    delete missing.profiles[profile.id];
    assert.throws(() => validateHostProfile(profile, missing), /contract/i);
    for (const field of ['gitHead', 'manager', 'manager_sha256', 'manifest_packageManager', 'engine', 'builder_family', 'actual_requirements', 'locked_peer_versions', 'locked_toolchain', 'install_settings', 'host_resolutions', 'scope']) {
      const changed = structuredClone(profile);
      if (changed[field] && typeof changed[field] === 'object') changed[field].unapproved = 'changed';
      else changed[field] = 'changed';
      assert.throws(() => validateHostProfile(changed, source), undefined, `${profile.id}: ${field}`);
    }
    for (const field of ['actual_requirements', 'locked_peer_versions', 'locked_toolchain', 'install_settings', 'host_resolutions']) {
      const changed = structuredClone(profile);
      const first = Object.keys(changed[field] ?? {})[0];
      if (first) {
        changed[field][first] = 'altered';
        assert.throws(() => validateHostProfile(changed, source), undefined, `${profile.id}: changed ${field}.${first}`);
        delete changed[field][first];
        assert.throws(() => validateHostProfile(changed, source), undefined, `${profile.id}: missing ${field}.${first}`);
      }
    }
    assert.throws(() => validateHostProfile({ ...profile, unexpected: 'setting' }, source));
    assert.throws(() => validateHostProfile({ ...profile, install_settings: { ...profile.install_settings, packageExtensions: { 'x@*': {} } } }, source));
    assert.throws(() => validateHostProfile({ ...profile, id: 'unknown' }, source));
    for (const field of ['manager_source_url', 'lock_source_url', 'lock_sha256']) {
      assert.throws(() => validateHostProfile({ ...profile, [field]: 'changed' }, source));
    }
  }
  assert.throws(() => compatibility.constructProfiles({ ...fixture('profiles.json'), profiles: [profiles[1], profiles[1]] }, source), /profile/i);
  const changedCore = fixture('profiles.json');
  changedCore.core.id = 'unknown';
  assert.throws(() => compatibility.constructProfiles(changedCore, source), /profile/i);
});

test('host configuration cannot override runner-owned isolation settings', () => {
  const settings = hostInstallSettings({ install_settings: { nodeLinker: 'pnp', enableGlobalCache: true, cacheFolder: '/other', globalFolder: '/other', enableTelemetry: true } }, '/cache', '/global');
  assert.deepEqual(settings, { nodeLinker: 'node-modules', enableGlobalCache: false, cacheFolder: '/cache', globalFolder: '/global', enableTelemetry: false });
});


test('source verification rejects changed committed object bytes and manager evidence', () => {
  const source = fixture('source-contract.json');
  const bytes = Buffer.from('source');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const contract = { sources: { sample: { gitHead: 'a'.repeat(40), files: { 'package.json': digest } } }, harness: { standalone_api_manager: { sha256: digest } } };
  verifySourceHashes(contract, () => bytes, bytes);
  assert.throws(() => verifySourceHashes(contract, () => Buffer.from('changed'), bytes), /hash/i);
  assert.throws(() => verifySourceHashes(contract, () => bytes, Buffer.from('changed')), /hash/i);
  const changed = structuredClone(source);
  changed.sources['rpx-xui-webapp'].files['.yarn/releases/yarn-4.17.1.cjs'] = 'a'.repeat(64);
  assert.throws(() => validateHostProfile(fixture('profiles.json').profiles[0], changed), /hash/i);
  changed.harness.standalone_api_manager.sha256 = 'b'.repeat(64);
  assert.throws(() => validateHostProfile(fixture('profiles.json').standalone_mc_api, changed), /hash/i);
});

test('the local core manager bytes must match the pinned source hash', () => {
  const bytes = Buffer.from('manager');
  const expected = createHash('sha256').update(bytes).digest('hex');
  compatibility.checkManagerBytes(bytes, expected);
  assert.throws(() => compatibility.checkManagerBytes(Buffer.from('changed'), expected), /manager.*hash/i);
});
