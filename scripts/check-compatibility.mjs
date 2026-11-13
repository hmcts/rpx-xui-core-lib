import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import semver from 'semver';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtures = join(root, 'tests/fixtures/compatibility');
const json = async (name) => JSON.parse(await readFile(join(fixtures, name), 'utf8'));

export function validateManifest(manifest, ledger) {
  assert.equal(manifest.name, '@hmcts/rpx-xui-core-lib');
  assert.equal(manifest.private, true);
  assert.ok(!manifest.resolutions && !manifest.overrides, 'No peer override is an acceptance path');
  assert.ok(!Object.values(manifest.peerDependenciesMeta ?? {}).some((entry) => entry.optional), 'Required peers must not become optional');
  for (const row of ledger.modules.filter((entry) => ['dependency', 'peerDependency'].includes(entry.classification))) {
    const field = row.classification === 'dependency' ? 'dependencies' : 'peerDependencies';
    assert.equal(manifest[field]?.[row.name], row.selection, `Unclassified or missing provider: ${row.name}`);
  }
  for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.peerDependencies })) {
    assert.ok(ledger.modules.some((entry) => entry.name === name && ['dependency', 'peerDependency'].includes(entry.classification)), `Unclassified module: ${name}`);
    assert.match(String(version), /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/, `Freeze exact version: ${name}`);
    assert.ok(!(name in manifest.dependencies && name in manifest.peerDependencies), `Duplicated ownership: ${name}`);
    assert.ok(!['@hmcts/rpx-xui-common-lib', '@hmcts/ccd-case-ui-toolkit', 'rpx-xui-translation', '@hmcts/rpx-xui-node-lib'].includes(name), `Duplicate implementation: ${name}`);
  }
}

export function checkInstallResult(result) {
  assert.equal(result.status, 0, `Native install failed: ${result.status}`);
  assert.doesNotMatch(`${result.stdout ?? ''}${result.stderr ?? ''}`, /YN0002|YN0060|YN0086/, 'Native peer errors block compatibility even when Yarn exits zero');
}

export function hostDependencies(manifest, profile, peerProviders = {}) {
  const coreHost = profile.id === 'core';
  const hasLockedMarkedProvider = Boolean(profile.locked_peer_versions?.marked);
  const needsMarkdownProvider = coreHost || hasLockedMarkedProvider;
  return { ...(coreHost ? manifest.peerDependencies : {}), ...(needsMarkdownProvider ? peerProviders : {}), ...(coreHost ? { 'rpx-xui-translation': '1.2.18', typescript: '5.9.3' } : {}), ...profile.actual_requirements, ...profile.locked_peer_versions, ...profile.locked_toolchain };
}

export function constructProfiles(profiles, sourceContract) {
  const matrix = [profiles.core, ...profiles.profiles, profiles.standalone_mc_api];
  const required = ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'];
  assert.deepEqual(matrix.map((profile) => profile.id).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), required.sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), 'Missing or duplicated required profile');
  for (const profile of matrix) validateHostProfile(profile, sourceContract);
  return matrix;
}

const commonProfileFields = ['id', 'gitHead', 'manager', 'manager_sha256', 'manifest_packageManager', 'engine', 'builder_family', 'actual_requirements', 'locked_peer_versions', 'locked_toolchain', 'install_settings', 'host_resolutions'];
const consumerFields = [...commonProfileFields, 'manager_source_url', 'requirement_scope', 'resolution_scope', 'source_contract'];
const profileFields = {
  core: [...commonProfileFields, 'scope'],
  'rpx-xui-webapp': [...consumerFields, 'lock_source_url', 'lock_sha256'],
  'rpx-xui-manage-organisations': consumerFields,
  'rpx-xui-approve-org': consumerFields,
  'mc-api-standalone': [...commonProfileFields, 'manager_source_url', 'scope', 'lock_source', 'source_contract'],
};

export function validateHostProfile(profile, sourceContract) {
  const expectedFields = profileFields[profile.id];
  assert.ok(expectedFields, `Unknown profile: ${profile.id}`);
  assert.deepEqual(Object.keys(profile).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), [...expectedFields].sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), `Invalid profile fields: ${profile.id}`);
  const source = sourceContract.profiles[profile.id];
  assert.ok(source, `Missing source contract: ${profile.id}`);
  assert.deepEqual(Object.keys(source).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), [...expectedFields].sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), `Invalid source contract fields: ${profile.id}`);
  const sourceId = profile.id === 'mc-api-standalone' ? 'rpx-xui-webapp' : profile.id;
  const metadata = sourceContract.sources[sourceId];
  assert.ok(metadata, `Missing source metadata: ${profile.id}`);
  assert.equal(profile.gitHead, metadata.gitHead, 'Host source head differs from its frozen contract');
  const managerPath = `.yarn/releases/yarn-${profile.manager}.cjs`;
  if (profile.id === 'mc-api-standalone') {
    assert.equal(profile.manager_sha256, sourceContract.harness.standalone_api_manager.sha256, 'Synthetic manager hash differs from evidence');
    assert.equal(profile.manager_source_url, sourceContract.harness.standalone_api_manager.url, 'Synthetic manager URL differs from evidence');
  } else assert.equal(profile.manager_sha256, metadata.files[managerPath], 'Host manager hash differs from source');
  if (profile.lock_source_url) assert.equal(profile.lock_sha256, metadata.files['yarn.lock'], 'Host lock hash differs from source');
  const fields = new Set([...Object.keys(profile), ...Object.keys(source)]);
  for (const field of fields) {
    assert.deepEqual(profile[field], source[field], `Host ${field.replaceAll('_', ' ')} differs from source contract`);
  }
}

export function currentCoreProjection(manifest, library, ngPackage, config, lock, nodeWorkspace) {
  const names = Object.keys(manifest.devDependencies).filter((name) => name.startsWith('@angular/') || ['typescript', 'rxjs', 'zone.js', 'ng-packagr', 'govuk-frontend'].includes(name));
  const devCohort = Object.fromEntries(names.map((name) => [name, manifest.devDependencies[name]]));
  const lockedVersions = {};
  for (const [name, version] of Object.entries({ ...devCohort, ...library.dependencies })) {
    const descriptor = `${name}@npm:${version}`;
    const matches = new Set(Object.entries(lock).filter(([key]) => key.split(', ').includes(descriptor)).map(([, row]) => String(row.version)));
    assert.equal(matches.size, 1, `Missing or ambiguous current core lock selection: ${descriptor}`);
    lockedVersions[name] = [...matches][0];
  }
  return { packageManager: manifest.packageManager, engine: manifest.engines, rootWorkspaces: manifest.workspaces ?? [], nodeWorkspace, devCohort, resolutions: manifest.resolutions ?? {}, overrides: manifest.overrides ?? {}, libraryPeerDependencies: library.peerDependencies, libraryPeerDependenciesMeta: library.peerDependenciesMeta ?? {}, libraryDependencies: library.dependencies, libraryResolutions: library.resolutions ?? {}, libraryOverrides: library.overrides ?? {}, ngPackage, yarnConfig: config, lockedVersions };
}

export function validateCurrentCore(actual, expected, prospective) {
  const { scope, ...projection } = expected;
  assert.ok(typeof scope === 'string' && scope.trim(), 'Missing current core scope');
  assert.deepEqual(actual, projection, 'Current core cohort differs from its contract');
  if (prospective) {
    for (const [name, version] of Object.entries(actual.libraryPeerDependencies)) assert.equal(prospective.peerDependencies[name], version, `Prospective peer differs from current core: ${name}`);
    for (const [name, version] of Object.entries(actual.libraryDependencies)) {
      const selected = prospective.dependencies[name];
      assert.ok(typeof selected === 'string' && semver.valid(selected) && semver.validRange(String(version)) && semver.satisfies(selected, String(version)), `Prospective dependency differs from current core: ${name}`);
    }
  }
}

export function checkManagerBytes(bytes, expected) {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, 'Frozen manager hash differs from source');
}

export async function hostLockBytes(profile, fetcher = fetch) {
  if (!profile.lock_source_url) return null;
  const response = await fetcher(profile.lock_source_url);
  assert.equal(response.ok, true, 'Missing frozen host lock');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), profile.lock_sha256, 'Frozen host lock bytes changed');
  return bytes;
}

export function checkLockedTelemetry(lock, expected) {
  const versions = {};
  for (const [, descriptors, version] of lock.matchAll(/^"([^"\n]+)":\n  version: ([^\n]+)/gm)) {
    const name = descriptors.split(', ')[0].split('@npm:')[0];
    if (!name.startsWith('@opentelemetry/') && !name.startsWith('@azure/monitor') && !name.startsWith('@azure/opentelemetry')) continue;
    assert.ok(expected[name]?.includes(version), `Host telemetry lock drift: ${name}@${version}`);
    versions[name] ??= [];
    if (!versions[name].includes(version)) versions[name].push(version);
  }
  assert.deepEqual(versions['@opentelemetry/core']?.sort((left, right) => left.localeCompare(right)), expected['@opentelemetry/core'], 'Missing or changed OpenTelemetry core descriptors');
  return versions;
}

export function hostInstallSettings(profile, cacheFolder, globalFolder) {
  return { ...profile.install_settings, nodeLinker: 'node-modules', enableGlobalCache: false, cacheFolder, globalFolder, enableTelemetry: false };
}

export function hostManifest(manifest, profile, peerProviders = {}) {
  return {
    name: `compatibility-${profile.id}`, version: '0.0.0', private: true, type: 'module', packageManager: `yarn@${profile.manager}`,
    dependencies: { ...hostDependencies(manifest, profile, peerProviders), '@hmcts/rpx-xui-core-lib': 'file:./prospective.tgz' },
    ...(Object.keys(profile.host_resolutions ?? {}).length ? { resolutions: profile.host_resolutions } : {}),
  };
}

export function validateDecisions(decisions, expected) {
  assert.ok(Array.isArray(decisions), 'Decisions must be a collection');
  assert.match(expected.sourceSha, /^[a-f0-9]{40}$/, 'Missing expected source SHA');
  assert.match(expected.artifactSha256, /^[a-f0-9]{64}$/, 'Missing expected artifact hash');
  const requiredIds = ['pagination', 'translation', 'helmet', 'zone', 'editor', 'host-angular', 'ngrx-router-store', 'payment-metadata', 'viewer-metadata', 'node-types', 'moment-timezone', 'legacy-name-registry', 'mutable-div', 'marked'];
  const ids = new Set();
  for (const decision of decisions) {
    assert.ok(typeof decision.id === 'string' && decision.id.trim() && !ids.has(decision.id), 'Missing or duplicate decision id');
    assert.ok(requiredIds.includes(decision.id), `Unknown decision id: ${decision.id}`);
    ids.add(decision.id);
    assert.ok(['accepted', 'blocked'].includes(decision.status), `Unknown decision status: ${decision.id}`);
    if (decision.status !== 'accepted') continue;
    for (const field of ['owner', 'reviewer', 'evidence', 'sourceSha', 'artifactSha256']) {
      assert.ok(typeof decision[field] === 'string' && decision[field].trim(), `Missing accepted decision ${field}: ${decision.id}`);
    }
    assert.equal(decision.sourceSha, expected.sourceSha, `Decision source mismatch: ${decision.id}`);
    assert.equal(decision.artifactSha256, expected.artifactSha256, `Decision artifact mismatch: ${decision.id}`);
  }
  assert.equal(ids.size, requiredIds.length, 'Missing required compatibility decisions');
}

export function checkMatrixReport(report) {
  assert.match(report.candidateSourceSha, /^[a-f0-9]{40}$/, 'Missing candidate source SHA');
  assert.equal(report.candidateWorktreeClean, true, 'Candidate source worktree was not clean');
  assert.match(report.artifactSha256, /^[a-f0-9]{64}$/, 'Missing candidate artifact hash');
  assert.deepEqual(
    report.profiles.map((entry) => entry.id).sort((left, right) => left.localeCompare(right)),
    ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'].sort((left, right) => left.localeCompare(right)),
    'Missing or duplicated required profile'
  );
  assert.equal(report.unresolvedDecisions.length, 0, 'Unresolved compatibility decision blocks support');
  for (const profile of report.profiles) {
    assert.ok(profile.nativeStatus === 0 && profile.immutableNativeStatus === 0 && profile.cleanInstall && profile.immutableInstall, `${profile.id} native peer/install acceptance failed`);
    assert.equal(typeof profile.translationIdentityRequired, 'boolean', `${profile.id} must declare whether translation identity applies`);
    if (profile.translationIdentityRequired) assert.equal(profile.identity, true, `${profile.id} canonical identity probe failed or skipped`);
    else assert.equal(profile.identity, null, `${profile.id} has an unexpected translation identity result`);
    if (profile.hostLockSource) assert.equal(profile.lockedTelemetryVerified, true, `${profile.id} host telemetry lock check failed or skipped`);
  }
}

async function runMatrix() {
  const output = join(root, 'test-results/compatibility');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  assert.equal(process.versions.node, '24.22.2', 'Use the pinned Node24.22.2');
  const manifest = await json('prospective-package.json');
  const ledger = await json('dependency-ledger.json');
  const profiles = await json('profiles.json');
  const decisions = await json('decisions.json');
  const peerProviders = await json('peer-providers.json');
  const sourceContract = await json('source-contract.json');
  const currentCore = await json('core-current-contract.json');
  validateManifest(manifest, ledger);
  const coreRoot = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const coreLibrary = JSON.parse(await readFile(join(root, 'projects/core-lib/package.json'), 'utf8'));
  const ngPackage = JSON.parse(await readFile(join(root, 'projects/core-lib/ng-package.json'), 'utf8'));
  const coreConfig = yaml.load(await readFile(join(root, '.yarnrc.yml'), 'utf8'));
  const coreLock = yaml.load(await readFile(join(root, 'yarn.lock'), 'utf8'));
  const nodeWorkspace = JSON.parse(await readFile(join(root, 'projects/core-lib/node/package.json'), 'utf8'));
  validateCurrentCore(currentCoreProjection(coreRoot, coreLibrary, ngPackage, coreConfig, coreLock, nodeWorkspace), currentCore, manifest);
  const scratch = await mkdtemp(join(tmpdir(), 'core-compatibility-'));
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };
  for (const name of Object.keys(env)) if (name === 'NODE_PATH' || name === 'NODE_OPTIONS' || name.startsWith('YARN_')) delete env[name];
  env.YARN_IGNORE_PATH = '1';
  const report = { schemaVersion: 1, status: 'running', scope: 'Prospective full graph on current real core bytes; not full migrated runtime or application adoption', scratch, candidateSourceSha: '', candidateWorktreeClean: false, artifactSha256: '', profiles: [], unresolvedDecisions: decisions };
  async function command(name, args, cwd) {
    const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 6 * 60_000 });
    await writeFile(join(output, `${name}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`);
    return result;
  }
  try {
    const matrix = constructProfiles(profiles, sourceContract);
    const staged = join(scratch, 'prospective-package');
    await cp(join(root, 'dist/core-lib'), staged, { recursive: true });
    const built = JSON.parse(await readFile(join(staged, 'package.json'), 'utf8'));
    await writeFile(join(staged, 'package.json'), `${JSON.stringify({ ...built, ...manifest }, null, 2)}\n`);
    await writeFile(join(staged, 'yarn.lock'), '');
    const candidate = join(scratch, 'prospective.tgz');
    validateHostProfile(profiles.core, sourceContract);
    const coreYarn = join(root, coreConfig.yarnPath);
    checkManagerBytes(await readFile(coreYarn), sourceContract.sources.core.files[coreConfig.yarnPath]);
    const packed = await command('pack-prospective', [coreYarn, 'pack', '--out', candidate], staged);
    assert.equal(packed.status, 0, 'Prospective artifact pack failed');
    report.artifactSha256 = createHash('sha256').update(await readFile(candidate)).digest('hex');
    const source = spawnSync('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    assert.equal(source.status, 0, 'Cannot identify candidate source');
    report.candidateSourceSha = source.stdout.trim();
    const worktree = spawnSync('/usr/bin/git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
    assert.equal(worktree.status, 0, 'Cannot identify candidate worktree state');
    report.candidateWorktreeClean = worktree.stdout.trim() === '';
    const expected = { sourceSha: report.candidateSourceSha, artifactSha256: report.artifactSha256 };
    validateDecisions(decisions, expected);
    report.unresolvedDecisions = decisions.filter((entry) => entry.status !== 'accepted');
    await cp(candidate, join(output, 'prospective.tgz'));
    for (const name of ['prospective-package.json', 'profiles.json', 'decisions.json', 'peer-providers.json', 'source-contract.json', 'core-current-contract.json']) await cp(join(fixtures, name), join(output, name));
    for (const profile of matrix) {
      const cwd = join(scratch, profile.id);
      await mkdir(cwd, { recursive: true });
      const manager = profile.id === 'core' ? coreYarn : join(scratch, `yarn-${profile.manager}.cjs`);
      if (profile.id !== 'core') {
        const response = await fetch(profile.manager_source_url);
        assert.equal(response.ok, true, `Missing frozen manager ${profile.id}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        checkManagerBytes(bytes, profile.manager_sha256);
        await writeFile(manager, bytes);
      }
      await writeFile(join(cwd, 'package.json'), `${JSON.stringify(hostManifest(manifest, profile, peerProviders), null, 2)}\n`);
      await writeFile(join(cwd, '.yarnrc.yml'), Object.entries(hostInstallSettings(profile, join(root, 'test-results/compatibility-cache'), join(scratch, 'global'))).map(([key, value]) => `${key}: ${JSON.stringify(value)}\n`).join(''));
      await cp(candidate, join(cwd, 'prospective.tgz'));
      const hostLock = await hostLockBytes(profile);
      if (hostLock) await writeFile(join(cwd, 'yarn.lock'), hostLock);
      const version = await command(`${profile.id}-manager`, [manager, '--version'], cwd);
      assert.equal(version.stdout.trim(), profile.manager);
      console.log(`Checking ${profile.id}: Yarn${profile.manager}`);
      const started = Date.now();
      const installed = await command(`${profile.id}-install`, [manager, 'install', '--json'], cwd);
      const translationIdentityRequired = profile.id === 'core' || Boolean(profile.actual_requirements?.['rpx-xui-translation']);
      const row = { id: profile.id, manager: profile.manager, gitHead: profile.gitHead ?? null, hostResolutionCount: Object.keys(profile.host_resolutions ?? {}).length, hostResolutionSource: profile.source_contract ?? null, hostLockSource: profile.lock_source_url ?? null, lockedTelemetryVerified: null, translationIdentityRequired, nativeStatus: installed.status, immutableNativeStatus: null, elapsedMs: Date.now() - started, cleanInstall: false, immutableInstall: false, identity: translationIdentityRequired ? false : null, issues: [] };
      try { checkInstallResult(installed); row.cleanInstall = true; } catch (error) { row.issues.push(error.message); }
      if (installed.status === 0) {
        await cp(join(cwd, 'package.json'), join(output, `${profile.id}-package.json`));
        await command(`${profile.id}-peer-requirements`, [manager, 'explain', 'peer-requirements'], cwd);
        const lock = await readFile(join(cwd, 'yarn.lock'));
        await writeFile(join(output, `${profile.id}-yarn.lock`), lock);
        const expectedTelemetry = sourceContract.locked_telemetry_versions[profile.id];
        if (expectedTelemetry) {
          try {
            const versions = checkLockedTelemetry(lock.toString('utf8'), expectedTelemetry);
            await writeFile(join(output, `${profile.id}-telemetry-versions.json`), `${JSON.stringify(versions, null, 2)}\n`);
            row.lockedTelemetryVerified = true;
          } catch (error) { row.lockedTelemetryVerified = false; row.cleanInstall = false; row.issues.push(error.message); }
        }
        const immutable = await command(`${profile.id}-immutable`, [manager, 'install', '--immutable', '--json'], cwd);
        row.immutableNativeStatus = immutable.status;
        try { checkInstallResult(immutable); row.immutableInstall = true; } catch (error) { row.issues.push(error.message); }
        assert.deepEqual(await readFile(join(cwd, 'yarn.lock')), lock);
        if (translationIdentityRequired) {
          await cp(join(fixtures, 'translation-identity.mjs'), join(cwd, 'translation-identity.mjs'));
          const identity = await command(`${profile.id}-identity`, ['translation-identity.mjs'], cwd);
          row.identity = identity.status === 0;
          if (!row.identity) row.issues.push(`Published legacy/core import or identity probe failed; inspect ${profile.id}-identity.log before accepting a registry counterpart or direct cutover`);
        }
      }
      report.profiles.push(row);
      console.log(`${profile.id}: clean=${row.cleanInstall}, immutable=${row.immutableInstall}, canonicalIdentity=${row.identity}`);
    }
    try { checkMatrixReport(report); report.status = 'passed'; } catch { report.status = 'blocked'; process.exitCode = 1; }
  } finally {
    if (report.status === 'running') report.status = 'failed';
    await writeFile(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Retained compatibility evidence: ${output}; scratch: ${scratch}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runMatrix().catch((error) => { console.error(error); process.exitCode = 1; });
}
