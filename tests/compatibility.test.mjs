import assert from 'node:assert/strict';
import yaml from 'js-yaml';
import { test } from 'node:test';
import * as compatibility from '../scripts/check-compatibility.mjs';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySourceHashes } from './fixtures/compatibility/verify-source-contract.mjs';
import * as sourceVerification from './fixtures/compatibility/verify-source-contract.mjs';
import { createHash } from 'node:crypto';
import { checkInstallResult, validateManifest, hostDependencies, checkMatrixReport, validateHostProfile, hostManifest, hostInstallSettings, hostLockBytes, checkLockedTelemetry, newPeerDiagnostics } from '../scripts/check-compatibility.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/compatibility/${name}`, import.meta.url), 'utf8'));
const manifest = fixture('prospective-package.json');
const ledger = fixture('dependency-ledger.json');

test('source identity cannot execute a Git replacement from PATH', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'core-untrusted-git-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const marker = join(directory, 'executed');
  writeFileSync(join(directory, 'git'), '#!/bin/sh\nprintf called > "$POISON_MARKER"\nprintf "poisoned\\n"\n', { mode: 0o755 });
  const root = fileURLToPath(new URL('../', import.meta.url));
  const module = new URL('../scripts/evidence-identity.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { currentIdentity } from ${JSON.stringify(module)}; console.log(JSON.stringify(currentIdentity(process.cwd())));`], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, PATH: directory, POISON_MARKER: marker, GITHUB_SHA: '', GITHUB_RUN_ID: '', GITHUB_RUN_ATTEMPT: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(marker), false, 'A caller-controlled Git executable was run');
  const actual = spawnSync('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  assert.equal(actual.status, 0, actual.stderr);
  assert.equal(JSON.parse(result.stdout).sourceSha, actual.stdout.trim());
});

test('source projections retain canonical UTF-16 dependency ordering', () => {
  const names = ['é-package', 'package-2', '.dot-package', 'Z-package', 'package-10', 'a-package'];
  const requested = Object.fromEntries(names.map(name => [name, '1.0.0']));
  const dependencies = { ...requested, '@angular-devkit/build-angular': '20.3.35', '@angular/cli': '20.3.35', '@angular/compiler': '20.3.35', '@angular/compiler-cli': '20.3.35', typescript: '5.9.3' };
  const projection = sourceVerification.deriveConsumerProjection(
    'rpx-xui-manage-organisations', 'source', { dependencies },
    Object.fromEntries(Object.entries(dependencies).map(([name, version]) => [`${name}@npm:${version}`, { version }])),
    { yarnPath: '.yarn/releases/yarn-4.18.1.cjs' },
    { projects: { host: { architect: { build: { builder: '@angular-devkit/build-angular:application' } } } } },
    { dependencies: requested, peerDependencies: {} }, {}, Buffer.from('manager')
  );
  assert.deepEqual(Object.keys(projection.actual_requirements), ['.dot-package', 'Z-package', 'a-package', 'package-10', 'package-2', 'é-package']);
});

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
    assert.throws(() => validateManifest({ ...manifest, ...change }, ledger), /optional|override|ledger/);
  }
});
test('a missing required public type provider fails the manifest check', () => {
  const broken = structuredClone(manifest);
  delete broken.dependencies['@types/express-serve-static-core'];
  assert.throws(() => validateManifest(broken, ledger), /classif|provider/);
});
test('actual host requirements retain their real conflicting versions', () => {
  const dependencies = hostDependencies(manifest, { id: 'rpx-xui-approve-org', actual_requirements: { 'zone.js': '0.16.3', 'ngx-editor': '19.1.1' }, locked_toolchain: { typescript: '5.9.2' } });
  assert.equal(dependencies['zone.js'], '0.16.3');
  assert.equal(dependencies['ngx-editor'], '19.1.1');
  assert.equal(dependencies.typescript, '5.9.2');
  assert.equal('@angular/upgrade' in dependencies, false);
  assert.equal('rxjs-compat' in dependencies, false);
});

test('the synthetic Core profile provides its own declared peer cohort', () => {
  const dependencies = hostDependencies(manifest, { id: 'core', actual_requirements: {}, locked_peer_versions: {}, locked_toolchain: {} });
  assert.equal(dependencies['@angular/upgrade'], manifest.peerDependencies['@angular/upgrade']);
});

test('the standalone API profile receives no undeclared UI test dependencies', () => {
  const profile = fixture('profiles.json').standalone_mc_api;
  const dependencies = hostDependencies(manifest, profile, fixture('peer-providers.json'));
  assert.equal('rpx-xui-translation' in dependencies, false);
  assert.equal('typescript' in dependencies, false);
  assert.equal('marked' in dependencies, false);
});

test('a consumer without a locked marked dependency does not receive the synthetic markdown provider', () => {
  const profile = fixture('profiles.json').profiles.find(entry => entry.id === 'rpx-xui-manage-organisations');
  assert.ok(profile.actual_requirements['ngx-markdown']);
  assert.equal('marked' in profile.locked_peer_versions, false);
  const dependencies = hostDependencies(manifest, profile, fixture('peer-providers.json'));
  assert.equal('marked' in dependencies, false);
});

test('an unowned prospective dependency cannot evade the closure ledger', () => {
  assert.throws(() => validateManifest({ ...manifest, dependencies: { ...manifest.dependencies, 'unowned-module': '1.0.0' } }, ledger), /Unclassified/);
});

function completeReport() {
  return { candidateSourceSha: 'c'.repeat(40), candidateWorktreeClean: true, artifactSha256: 'a'.repeat(64), unresolvedDecisions: [], profiles: ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'].map((id) => ({ id, nativeStatus: 0, immutableNativeStatus: 0, baselineNativeStatus: 0, baselineImmutableNativeStatus: 0, newPeerDiagnostics: [], cleanInstall: true, immutableInstall: true, translationIdentityRequired: true, identity: true, hostLockSource: null, lockedTelemetryVerified: null })) };
}
test('a completed compatibility report identifies the exact Core source commit', () => {
  const report = completeReport();
  checkMatrixReport(report);
  for (const candidateSourceSha of ['', 'unknown', 'C'.repeat(40)]) {
    assert.throws(() => checkMatrixReport({ ...report, candidateSourceSha }), /source SHA/i);
  }
  assert.throws(() => checkMatrixReport({ ...report, candidateWorktreeClean: false }), /worktree/i);
  assert.throws(() => checkMatrixReport({ ...report, candidateWorktreeClean: undefined }), /worktree/i);
});
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
  const newPeer = completeReport();
  newPeer.profiles[0].newPeerDiagnostics.push('Core adds a peer warning');
  assert.throws(() => checkMatrixReport(newPeer), /baseline|new peer/i);
  const missingBaseline = completeReport();
  delete missingBaseline.profiles[0].baselineNativeStatus;
  assert.throws(() => checkMatrixReport(missingBaseline), /baseline/i);
});

test('candidate peer diagnostics subtract normalized source-host warnings and ignore Yarn summaries', () => {
  const baseline = [
    { type: 'warning', name: 60, data: 'zone.js is incompatible (pOld123).' },
    { type: 'warning', name: 86, data: 'Some peer dependencies are incorrectly met.' },
  ].map((item) => JSON.stringify(item)).join('\n');
  const candidate = [
    { type: 'warning', name: 60, data: 'zone.js is incompatible (pNew456).' },
    { type: 'warning', name: 2, data: 'Core package requests an undeclared peer (pCore01).' },
    { type: 'warning', name: 86, data: 'Some peer dependencies are incorrectly met.' },
  ].map((item) => JSON.stringify(item)).join('\n');
  assert.deepEqual(newPeerDiagnostics(candidate, baseline), ['Core package requests an undeclared peer.']);
  assert.deepEqual(newPeerDiagnostics('', baseline), []);
});
test('missing artifact bytes and skipped identity probes reject the matrix', () => {
  const noArtifact = completeReport();
  noArtifact.artifactSha256 = '';
  assert.throws(() => checkMatrixReport(noArtifact), /artifact/);
  const skipped = completeReport();
  skipped.profiles[2].identity = false;
  assert.throws(() => checkMatrixReport(skipped), /identity/);
});
test('translation identity may be not applicable only when the profile has no translation requirement', () => {
  const report = completeReport();
  const api = report.profiles.find(profile => profile.id === 'mc-api-standalone');
  api.translationIdentityRequired = false;
  api.identity = null;
  checkMatrixReport(report);
  api.translationIdentityRequired = true;
  assert.throws(() => checkMatrixReport(report), /identity/);
});

test('the frozen MC profile preserves its declared and locked marked requirement over the provider default', () => {
  const profile = fixture('profiles.json').profiles.find((entry) => entry.id === 'rpx-xui-webapp');
  assert.equal(profile.actual_requirements.marked, '^18.0.5');
  assert.equal(profile.locked_peer_versions.marked, '18.1.3');
  assert.equal(hostDependencies(manifest, profile, { marked: '16.4.2' }).marked, '18.1.3');
});


test('the refreshed MC profile preserves current telemetry, proxy, webpack and host resolution selections', () => {
  const profile = fixture('profiles.json').profiles.find((entry) => entry.id === 'rpx-xui-webapp');
  assert.equal(profile.gitHead, '1a986f4dc87e6ea4598e30c042bf2b3072122b75');
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
  assert.equal(profile.gitHead, '1a986f4dc87e6ea4598e30c042bf2b3072122b75');
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
  const baseline = hostManifest(manifest, mc, {}, false);
  assert.equal('@hmcts/rpx-xui-core-lib' in baseline.dependencies, false);
  assert.equal('@hmcts/rpx-xui-core-lib' in generated.dependencies, true);
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
  assert.equal(profile.lock_source_url, 'https://raw.githubusercontent.com/hmcts/rpx-xui-webapp/1a986f4dc87e6ea4598e30c042bf2b3072122b75/yarn.lock');
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
    mkdirSync(join(dir, 'projects/core-lib/node'), { recursive: true });
    symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(dir, 'node_modules'));

    for (const file of ['package.json', 'yarn.lock', '.yarnrc.yml', 'projects/core-lib/package.json', 'projects/core-lib/ng-package.json', 'projects/core-lib/node/package.json']) cpSync(new URL(`../${file}`, import.meta.url), join(dir, file));
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
    writeFileSync(join(dir, 'tests/fixtures/compatibility/profiles.json'), JSON.stringify(baseProfiles));
    const coreVersion = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).devDependencies['@angular/core'];
    /** @type {Array<[string, (body: string) => string]>} */
    const mutations = [
      ['package.json', (body) => { const value = JSON.parse(body); value.devDependencies['@angular/core'] = '99.0.0'; return JSON.stringify(value); }],
      ['projects/core-lib/package.json', (body) => { const value = JSON.parse(body); value.peerDependencies['@angular/core'] = '99.0.0'; return JSON.stringify(value); }],
      ['.yarnrc.yml', (body) => body.replace('nodeLinker: node-modules', 'nodeLinker: pnp')],
      ['yarn.lock', (body) => {
        const lock = yaml.load(body);
        const key = Object.keys(lock).find((descriptor) => descriptor.split(', ').includes(`@angular/core@npm:${coreVersion}`));
        assert.ok(key, 'current Angular core descriptor exists');
        lock[key].version = '99.0.0';
        return yaml.dump(lock);
      }],
    ];
    for (const [name, mutate] of mutations) {
      const path = join(dir, name);
      const original = readFileSync(path, 'utf8');
      const changed = mutate(original);
      assert.notEqual(changed, original, `fixture mutation applied: ${name}`);
      writeFileSync(path, changed);
      const run = spawnSync(process.execPath, [join(dir, 'scripts/check-compatibility.mjs')], { encoding: 'utf8' });
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /core/i);
      writeFileSync(path, original);
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
  const contract = structuredClone(source);
  for (const entry of Object.values(contract.sources)) for (const path of Object.keys(entry.files)) entry.files[path] = digest;
  contract.harness.standalone_api_manager.sha256 = digest;
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

test('fixed profile schemas reject matching omissions and unknown fields in both copies', () => {
  const profiles = fixture('profiles.json');
  const source = fixture('source-contract.json');
  for (const profile of compatibility.constructProfiles(profiles, source)) {
    for (const field of ['manifest_packageManager', 'engine', 'locked_toolchain', 'install_settings', 'actual_requirements']) {
      const changed = structuredClone(profile);
      const contract = structuredClone(source);
      delete changed[field];
      delete contract.profiles[profile.id][field];
      assert.throws(() => validateHostProfile(changed, contract), undefined, `${profile.id}: missing ${field}`);
    }
    const changed = { ...profile, invented: 'value' };
    const contract = structuredClone(source);
    contract.profiles[profile.id].invented = 'value';
    assert.throws(() => validateHostProfile(changed, contract), undefined, `${profile.id}: unknown field`);
  }
});


test('source-derived projections reject the same invented lock and resolution in both copies', () => {
  const deps = { '@angular/core': '20.3.31', '@angular-devkit/build-angular': '20.3.32', '@angular/cli': '20.3.32', '@angular/compiler': '20.3.31', '@angular/compiler-cli': '20.3.31', typescript: '5.9.3' };
  const manifest = { dependencies: { '@angular/core': deps['@angular/core'] }, devDependencies: deps, packageManager: 'yarn@4.9.2', engines: { node: '>=24' }, resolutions: { webpack: '5.112.0' } };
  const lock = Object.fromEntries(Object.entries(deps).map(([name, version]) => [`${name}@npm:${version}`, { version }]));
  const angular = { projects: { app: { architect: { build: { builder: '@angular-devkit/build-angular:application' } } } } };
  const rawProjection = sourceVerification.deriveConsumerProjection('rpx-xui-manage-organisations', 'a'.repeat(40), manifest, lock, { yarnPath: '.yarn/releases/yarn-4.9.2.cjs' }, angular, { dependencies: {}, peerDependencies: { '@angular/core': '20.3.31' } }, {}, Buffer.from('manager'));
  const profile = structuredClone(rawProjection);
  const source = structuredClone(rawProjection);
  sourceVerification.compareSourceProjection(profile, source, rawProjection);
  for (const [field, key] of [['locked_peer_versions', '@angular/core'], ['host_resolutions', 'webpack']]) {
    const changedProfile = structuredClone(profile);
    const changedSource = structuredClone(source);
    changedProfile[field][key] = '99.0.0';
    changedSource[field][key] = '99.0.0';
    assert.throws(() => sourceVerification.compareSourceProjection(changedProfile, changedSource, rawProjection), /source/i);
  }
});

test('source verification requires every fixed repository and mandatory file', () => {
  const contract = fixture('source-contract.json');
  sourceVerification.validateSourceInventory(contract);
  const missingRepo = structuredClone(contract);
  delete missingRepo.sources.core;
  assert.throws(() => sourceVerification.validateSourceInventory(missingRepo), /source/i);
  const missingFile = structuredClone(contract);
  delete missingFile.sources['rpx-xui-webapp'].files['yarn.lock'];
  assert.throws(() => sourceVerification.validateSourceInventory(missingFile), /source/i);
});

test('prospective exact dependency must satisfy the declared current core range', () => {
  const current = fixture('core-current-contract.json');
  const actual = structuredClone(current);
  delete actual.scope;
  compatibility.validateCurrentCore(actual, current, manifest);
  for (const version of ['1.19.99', '2.0.0', '1.21.0-beta.1', 'latest', '^1.20.0']) {
    const incompatible = structuredClone(manifest);
    incompatible.dependencies.axios = version;
    assert.throws(() => compatibility.validateCurrentCore(actual, current, incompatible), /Prospective dependency/);
  }
});

test('current core cohort rejects source and lock drift independently of git HEAD', () => {
  const current = fixture('core-current-contract.json');
  const actual = structuredClone(current);
  delete actual.scope;
  compatibility.validateCurrentCore(actual, current);
  for (const change of [
    (value) => { value.devCohort['@angular/core'] = '99.0.0'; },
    (value) => { delete value.devCohort['govuk-frontend']; },
    (value) => { value.lockedVersions['govuk-frontend'] = '0.0.0'; },
    (value) => { value.lockedVersions['@angular/core'] = '99.0.0'; },
    (value) => { value.libraryPeerDependencies['@angular/core'] = '99.0.0'; },
    (value) => { value.yarnConfig.nodeLinker = 'pnp'; },
    (value) => { value.yarnConfig.nmHoistingLimits = 'none'; },
    (value) => { value.nodeWorkspace.devDependencies.axios = '0.0.0'; },
    (value) => { value.nodeWorkspace.private = false; },
    (value) => { value.rootWorkspaces = []; },
    (value) => { value.packageManager = 'yarn@99.0.0'; },
    (value) => { value.engine.node = '>=1'; },
    (value) => { value.resolutions.unapproved = '1.0.0'; },
    (value) => { value.libraryPeerDependenciesMeta['@angular/core'] = { optional: false }; },
    (value) => { value.libraryOverrides['@angular/core'] = '1.0.0'; },
  ]) {
    const changed = structuredClone(actual);
    change(changed);
    assert.throws(() => compatibility.validateCurrentCore(changed, current), /core/i);
  }
});
