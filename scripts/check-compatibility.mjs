import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  return { ...manifest.peerDependencies, ...peerProviders, 'rpx-xui-translation': '1.2.18', typescript: '5.9.3', ...profile.actual_requirements, ...profile.locked_peer_versions, ...profile.locked_toolchain };
}

export function validateHostProfile(profile, sourceContract) {
  assert.ok(!profile.resolutions && !profile.overrides, 'Host overrides must use the frozen source contract');
  const source = sourceContract.profiles[profile.id];
  assert.deepEqual(profile.host_resolutions ?? {}, source?.host_resolutions ?? {}, 'Unapproved extra or altered host resolution');
  assert.equal(profile.lock_source_url, source?.seed_root_lock ? `https://raw.githubusercontent.com/hmcts/rpx-xui-webapp/${sourceContract.gitHead}/yarn.lock` : undefined, 'Unapproved host lock source');
  assert.equal(profile.lock_sha256, source?.seed_root_lock ? sourceContract.source_file_sha256['yarn.lock'] : undefined, 'Host lock hash differs from committed source');
  if (!source) return;
  assert.equal(profile.gitHead, source.gitHead, 'Host source head differs from its frozen contract');
  assert.deepEqual(profile.install_settings ?? {}, source.install_settings ?? {}, 'Unapproved or altered host install setting');
  for (const [name, declared] of Object.entries(source.runtime_declarations)) {
    assert.equal(profile.actual_requirements[name], declared, `Changed host declaration: ${name}`);
    assert.equal(profile.locked_peer_versions[name], source.runtime_locked_versions[name], `Changed host lock selection: ${name}`);
  }
  for (const [name, version] of Object.entries(source.api_toolchain_locked_versions ?? {})) {
    assert.equal(profile.locked_toolchain[name], version, `Changed host build selection: ${name}`);
  }
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
  return { nodeLinker: 'node-modules', enableGlobalCache: false, cacheFolder, globalFolder, enableTelemetry: false, ...profile.install_settings };
}

export function hostManifest(manifest, profile, peerProviders = {}) {
  return {
    name: `compatibility-${profile.id}`, version: '0.0.0', private: true, type: 'module', packageManager: `yarn@${profile.manager}`,
    dependencies: { ...hostDependencies(manifest, profile, peerProviders), '@hmcts/rpx-xui-core-lib': 'file:./prospective.tgz' },
    ...(profile.host_resolutions ? { resolutions: profile.host_resolutions } : {}),
  };
}

export function checkMatrixReport(report) {
  assert.match(report.artifactSha256, /^[a-f0-9]{64}$/, 'Missing candidate artifact hash');
  assert.deepEqual(
    report.profiles.map((entry) => entry.id).sort((left, right) => left.localeCompare(right)),
    ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'].sort((left, right) => left.localeCompare(right)),
    'Missing or duplicated required profile'
  );
  assert.equal(report.unresolvedDecisions.length, 0, 'Unresolved compatibility decision blocks support');
  for (const profile of report.profiles) {
    assert.ok(profile.nativeStatus === 0 && profile.immutableNativeStatus === 0 && profile.cleanInstall && profile.immutableInstall, `${profile.id} native peer/install acceptance failed`);
    assert.equal(profile.identity, true, `${profile.id} canonical identity probe failed or skipped`);
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
  const sourceContract = await json('mc-source-contract.json');
  validateManifest(manifest, ledger);
  const scratch = await mkdtemp(join(tmpdir(), 'core-compatibility-'));
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };
  for (const name of Object.keys(env)) if (name === 'NODE_PATH' || name === 'NODE_OPTIONS' || name.startsWith('YARN_')) delete env[name];
  env.YARN_IGNORE_PATH = '1';
  const report = { schemaVersion: 1, status: 'running', scope: 'Prospective full graph on current real core bytes; not full migrated runtime or application adoption', scratch, artifactSha256: '', profiles: [], unresolvedDecisions: decisions.filter((entry) => entry.status !== 'accepted') };
  async function command(name, args, cwd) {
    const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 6 * 60_000 });
    await writeFile(join(output, `${name}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`);
    return result;
  }
  try {
    const staged = join(scratch, 'prospective-package');
    await cp(join(root, 'dist/core-lib'), staged, { recursive: true });
    const built = JSON.parse(await readFile(join(staged, 'package.json'), 'utf8'));
    await writeFile(join(staged, 'package.json'), `${JSON.stringify({ ...built, ...manifest }, null, 2)}\n`);
    await writeFile(join(staged, 'yarn.lock'), '');
    const candidate = join(scratch, 'prospective.tgz');
    const coreYarn = join(root, '.yarn/releases/yarn-4.18.1.cjs');
    const packed = await command('pack-prospective', [coreYarn, 'pack', '--out', candidate], staged);
    assert.equal(packed.status, 0, 'Prospective artifact pack failed');
    report.artifactSha256 = createHash('sha256').update(await readFile(candidate)).digest('hex');
    await cp(candidate, join(output, 'prospective.tgz'));
    for (const name of ['prospective-package.json', 'profiles.json', 'decisions.json', 'peer-providers.json', 'mc-source-contract.json']) await cp(join(fixtures, name), join(output, name));
    const matrix = [
      { id: 'core', manager: '4.18.1', actual_requirements: {}, locked_toolchain: {} },
      ...profiles.profiles,
      profiles.standalone_mc_api,
    ];
    for (const profile of matrix) {
      validateHostProfile(profile, sourceContract);
      const cwd = join(scratch, profile.id);
      await mkdir(cwd, { recursive: true });
      const manager = profile.id === 'core' ? coreYarn : join(scratch, `yarn-${profile.manager}.cjs`);
      if (profile.id !== 'core') {
        const response = await fetch(profile.manager_source_url);
        assert.equal(response.ok, true, `Missing frozen manager ${profile.id}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(createHash('sha256').update(bytes).digest('hex'), profile.manager_sha256, 'Frozen manager bytes changed');
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
      const row = { id: profile.id, manager: profile.manager, gitHead: profile.gitHead ?? null, hostResolutionCount: Object.keys(profile.host_resolutions ?? {}).length, hostResolutionSource: profile.source_contract ?? null, hostLockSource: profile.lock_source_url ?? null, lockedTelemetryVerified: null, nativeStatus: installed.status, immutableNativeStatus: null, elapsedMs: Date.now() - started, cleanInstall: false, immutableInstall: false, identity: false, issues: [] };
      try { checkInstallResult(installed); row.cleanInstall = true; } catch (error) { row.issues.push(error.message); }
      if (installed.status === 0) {
        await cp(join(cwd, 'package.json'), join(output, `${profile.id}-package.json`));
        await command(`${profile.id}-peer-requirements`, [manager, 'explain', 'peer-requirements'], cwd);
        const lock = await readFile(join(cwd, 'yarn.lock'));
        await writeFile(join(output, `${profile.id}-yarn.lock`), lock);
        const expectedTelemetry = sourceContract.profiles[profile.id]?.locked_telemetry_versions;
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
        await cp(join(fixtures, 'translation-identity.mjs'), join(cwd, 'translation-identity.mjs'));
        const identity = await command(`${profile.id}-identity`, ['translation-identity.mjs'], cwd);
        row.identity = identity.status === 0;
        if (!row.identity) row.issues.push(`Published legacy/core import or identity probe failed; inspect ${profile.id}-identity.log before accepting a registry counterpart or direct cutover`);
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
