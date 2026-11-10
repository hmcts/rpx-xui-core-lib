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

export function checkMatrixReport(report) {
  assert.match(report.artifactSha256, /^[a-f0-9]{64}$/, 'Missing candidate artifact hash');
  assert.deepEqual(report.profiles.map((entry) => entry.id).sort(), ['core', 'rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org', 'mc-api-standalone'].sort(), 'Missing or duplicated required profile');
  assert.equal(report.unresolvedDecisions.length, 0, 'Unresolved compatibility decision blocks support');
  for (const profile of report.profiles) {
    assert.ok(profile.nativeStatus === 0 && profile.immutableNativeStatus === 0 && profile.cleanInstall && profile.immutableInstall, `${profile.id} native peer/install acceptance failed`);
    assert.equal(profile.identity, true, `${profile.id} canonical identity probe failed or skipped`);
  }
}

async function runMatrix() {
  const output = join(root, 'test-results/compatibility');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  assert.equal(process.versions.node, '24.22.1', 'Use the pinned Node24.22.1');
  const manifest = await json('prospective-package.json');
  const ledger = await json('dependency-ledger.json');
  const profiles = await json('profiles.json');
  const decisions = await json('decisions.json');
  const peerProviders = await json('peer-providers.json');
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
    const coreYarn = join(root, '.yarn/releases/yarn-4.5.3.cjs');
    const packed = await command('pack-prospective', [coreYarn, 'pack', '--out', candidate], staged);
    assert.equal(packed.status, 0, 'Prospective artifact pack failed');
    report.artifactSha256 = createHash('sha256').update(await readFile(candidate)).digest('hex');
    await cp(candidate, join(output, 'prospective.tgz'));
    for (const name of ['prospective-package.json', 'profiles.json', 'decisions.json', 'peer-providers.json']) await cp(join(fixtures, name), join(output, name));
    const matrix = [
      { id: 'core', manager: '4.5.3', actual_requirements: {}, locked_toolchain: {} },
      ...profiles.profiles,
      profiles.standalone_mc_api,
    ];
    for (const profile of matrix) {
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
      const dependencies = { ...hostDependencies(manifest, profile, peerProviders), '@hmcts/rpx-xui-core-lib': 'file:./prospective.tgz' };
      await writeFile(join(cwd, 'package.json'), `${JSON.stringify({ name: `compatibility-${profile.id}`, version: '0.0.0', private: true, type: 'module', packageManager: `yarn@${profile.manager}`, dependencies }, null, 2)}\n`);
      await writeFile(join(cwd, '.yarnrc.yml'), `nodeLinker: node-modules\nenableGlobalCache: false\ncacheFolder: ${JSON.stringify(join(root, 'test-results/compatibility-cache'))}\nglobalFolder: ${JSON.stringify(join(scratch, 'global'))}\nenableTelemetry: false\n${Object.entries(profile.install_settings ?? {}).map(([key, value]) => `${key}: ${JSON.stringify(value)}\n`).join('')}`);
      await cp(candidate, join(cwd, 'prospective.tgz'));
      const version = await command(`${profile.id}-manager`, [manager, '--version'], cwd);
      assert.equal(version.stdout.trim(), profile.manager);
      console.log(`Checking ${profile.id}: Yarn${profile.manager}`);
      const started = Date.now();
      const installed = await command(`${profile.id}-install`, [manager, 'install', '--json'], cwd);
      const row = { id: profile.id, manager: profile.manager, nativeStatus: installed.status, immutableNativeStatus: null, elapsedMs: Date.now() - started, cleanInstall: false, immutableInstall: false, identity: false, issues: [] };
      try { checkInstallResult(installed); row.cleanInstall = true; } catch (error) { row.issues.push(error.message); }
      if (installed.status === 0) {
        await cp(join(cwd, 'package.json'), join(output, `${profile.id}-package.json`));
        await command(`${profile.id}-peer-requirements`, [manager, 'explain', 'peer-requirements'], cwd);
        const lock = await readFile(join(cwd, 'yarn.lock'));
        await writeFile(join(output, `${profile.id}-yarn.lock`), lock);
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
