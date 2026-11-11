import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { constructProfiles } from '../../../scripts/check-compatibility.mjs';

const sources = {
  core: { sha: 'e3e4222a1e7df9009041c03dd5eef878ac7c13b0', manager: '4.18.1' },
  'rpx-xui-webapp': { sha: '67cda3e943a69fd57a692189941863b1c6d5c3f9', manager: '4.17.1' },
  'rpx-xui-manage-organisations': { sha: '80810d3ca68476aefa9ccec107d77243882a8314', manager: '4.9.2' },
  'rpx-xui-approve-org': { sha: '9c1e1cdabda47b961aa2101dfe485d204ec09b05', manager: '4.10.3' },
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function validateSourceInventory(contract) {
  assert.deepEqual(Object.keys(contract.sources).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), Object.keys(sources).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), 'Invalid source repository inventory');
  for (const [id, expected] of Object.entries(sources)) {
    const source = contract.sources[id];
    assert.equal(source.gitHead, expected.sha, `Invalid source SHA: ${id}`);
    assert.equal(source.repository, `hmcts/rpx-xui-${id === 'core' ? 'core-lib' : id.slice('rpx-xui-'.length)}`, `Invalid source repository: ${id}`);
    const paths = ['package.json', 'yarn.lock', '.yarnrc.yml', `.yarn/releases/yarn-${expected.manager}.cjs`, id === 'core' ? 'projects/core-lib/ng-package.json' : 'angular.json'];
    if (id === 'rpx-xui-webapp') paths.push('api/package.json', 'api/webpack-node.config.js');
    assert.deepEqual(Object.keys(source.files).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), paths.sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; }), `Invalid source file inventory: ${id}`);
  }
}

export function verifySourceHashes(contract, readSource, managerBytes) {
  validateSourceInventory(contract);
  for (const [id, source] of Object.entries(contract.sources)) {
    for (const [path, expected] of Object.entries(source.files)) {
      assert.match(expected, /^[a-f0-9]{64}$/, `Invalid source hash: ${id}:${path}`);
      assert.equal(hash(readSource(id, source.gitHead, path)), expected, `Source hash mismatch: ${id}:${path}`);
    }
  }
  assert.equal(hash(managerBytes), contract.harness.standalone_api_manager.sha256, 'Standalone API manager hash mismatch');
}

export function compareSourceProjection(profile, source, projection) {
  for (const [field, value] of Object.entries(projection)) {
    assert.deepEqual(profile[field], value, `Profile differs from source: ${profile.id ?? ''} ${field}`);
    assert.deepEqual(source[field], value, `Contract differs from source: ${profile.id ?? ''} ${field}`);
  }
}

function lockedVersion(lock, name, declaration) {
  const descriptor = `${name}@npm:${declaration}`;
  const versions = new Set(Object.entries(lock).filter(([key]) => key.split(', ').includes(descriptor)).map(([, row]) => String(row.version)));
  assert.equal(versions.size, 1, `Missing or ambiguous source lock descriptor: ${descriptor}`);
  return [...versions][0];
}

export function deriveConsumerProjection(id, sha, manifest, lock, config, angular, prospective, providers, managerBytes) {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const graph = new Set([...Object.keys(prospective.dependencies), ...Object.keys(prospective.peerDependencies), ...Object.keys(providers), 'rpx-xui-translation', '@ngrx/router-store']);
  if (id === 'rpx-xui-webapp') { graph.add('applicationinsights'); graph.add('global-agent'); }
  const names = [...graph].filter((name) => name in dependencies).sort((left, right) => { if (left < right) return -1; return left > right ? 1 : 0; });
  const toolchain = ['@angular-devkit/build-angular', '@angular/cli', '@angular/compiler', '@angular/compiler-cli', 'typescript'];
  if (id === 'rpx-xui-webapp') toolchain.push('webpack', 'webpack-cli', 'webpack-node-externals', 'ts-loader', 'terser-webpack-plugin');
  const managerPath = config.yarnPath;
  const manager = /^\.yarn\/releases\/yarn-(.+)\.cjs$/.exec(managerPath)?.[1];
  assert.ok(manager, `Invalid source yarnPath: ${id}`);
  const settings = { ...config }; delete settings.yarnPath;
  const builders = Object.values(angular.projects).map((project) => project.architect?.build?.builder);
  const builder = builders.includes('@angular-devkit/build-angular:application') ? 'application' : builders.includes('@angular-devkit/build-angular:browser') ? 'webpack' : null;
  assert.ok(builder, `Unknown source builder: ${id}`);
  const baseScope = 'All direct production or development requirements shared with the prospective graph, including root peer providers and public types; actual versions take precedence over fixture defaults';
  const projection = {
    requirement_scope: id === 'rpx-xui-webapp' ? `${baseScope}; retained host telemetry/proxy runtime and production API webpack toolchain` : baseScope,
    resolution_scope: id === 'rpx-xui-webapp' ? 'Exact pre-existing host-owned resolutions; applied graph is not unmodified and native peer errors remain blockers' : 'Exact committed host-owned resolutions; native peer errors remain blockers',
    id, gitHead: sha, manager, manager_source_url: `https://raw.githubusercontent.com/hmcts/${id}/${sha}/${managerPath}`,
    manager_sha256: hash(managerBytes), manifest_packageManager: manifest.packageManager, engine: manifest.engines, builder_family: builder,
    actual_requirements: Object.fromEntries(names.map((name) => [name, dependencies[name]])),
    locked_peer_versions: Object.fromEntries(names.map((name) => [name, lockedVersion(lock, name, dependencies[name])])),
    locked_toolchain: Object.fromEntries(toolchain.map((name) => [name, lockedVersion(lock, name, dependencies[name])])),
    install_settings: settings, host_resolutions: manifest.resolutions ?? {}, source_contract: 'source-contract.json',
  };
  if (id === 'rpx-xui-webapp') {
    projection.lock_source_url = `https://raw.githubusercontent.com/hmcts/${id}/${sha}/yarn.lock`;
  }
  return projection;
}

export function verifySourceProjections(contract, profiles, prospective, providers, readSource, managerBytes) {
  const json = (id, path) => JSON.parse(readSource(id, sources[id].sha, path));
  const yml = (id, path) => yaml.load(readSource(id, sources[id].sha, path).toString('utf8'));
  const byId = Object.fromEntries(constructProfiles(profiles, contract).map((profile) => [profile.id, profile]));
  for (const id of ['rpx-xui-webapp', 'rpx-xui-manage-organisations', 'rpx-xui-approve-org']) {
    const config = yml(id, '.yarnrc.yml');
    const projection = deriveConsumerProjection(id, sources[id].sha, json(id, 'package.json'), yml(id, 'yarn.lock'), config, json(id, 'angular.json'), prospective, providers, readSource(id, sources[id].sha, config.yarnPath));
    if (id === 'rpx-xui-webapp') projection.lock_sha256 = hash(readSource(id, sources[id].sha, 'yarn.lock'));
    compareSourceProjection(byId[id], contract.profiles[id], projection);
  }
  const ngPackage = json('core', 'projects/core-lib/ng-package.json');
  assert.match(ngPackage.$schema, /ng-packagr/);
  const coreManifest = json('core', 'package.json');
  const coreConfig = yml('core', '.yarnrc.yml');
  const coreManager = /^\.yarn\/releases\/yarn-(.+)\.cjs$/.exec(coreConfig.yarnPath)?.[1];
  const coreSettings = { ...coreConfig }; delete coreSettings.yarnPath;
  compareSourceProjection(byId.core, contract.profiles.core, { id: 'core', gitHead: sources.core.sha, manager: coreManager, manager_sha256: hash(readSource('core', sources.core.sha, coreConfig.yarnPath)), manifest_packageManager: coreManifest.packageManager, engine: coreManifest.engines, builder_family: 'ng-packagr', actual_requirements: {}, locked_peer_versions: {}, locked_toolchain: {}, install_settings: coreSettings, host_resolutions: {}, scope: 'Synthetic prospective core host; runner installs the candidate and frozen peer providers, not the repository development graph.' });
  assert.equal(hash(managerBytes), '293632d8a095d8ea4786eb2c5798c83c37544abed17ed31186a3ec4549a07c06', 'Unapproved synthetic manager hash');
  const api = json('rpx-xui-webapp', 'api/package.json');
  const lock = yml('rpx-xui-webapp', 'yarn.lock');
  for (const path of ['api/yarn.lock', 'api/.yarnrc.yml']) {
    let present = true;
    try { readSource('rpx-xui-webapp', sources['rpx-xui-webapp'].sha, path); } catch { present = false; }
    assert.equal(present, false, `Unexpected standalone API source: ${path}`);
  }
  const telemetry = {};
  for (const [descriptors, row] of Object.entries(lock)) {
    const name = descriptors.split(', ')[0].split('@npm:')[0];
    if (!name.startsWith('@opentelemetry/') && !name.startsWith('@azure/monitor') && !name.startsWith('@azure/opentelemetry')) continue;
    telemetry[name] ??= [];
    if (!telemetry[name].includes(String(row.version))) telemetry[name].push(String(row.version));
  }
  for (const versions of Object.values(telemetry)) versions.sort((left, right) => left.localeCompare(right));
  assert.deepEqual(contract.locked_telemetry_versions, { 'rpx-xui-webapp': telemetry }, 'Telemetry contract differs from source lock');
  assert.match(api.scripts.build, /webpack --config/);
  const apiManager = /^yarn@(.+)$/.exec(api.packageManager)?.[1];
  assert.ok(apiManager, 'Missing API manager declaration');
  const apiProjection = { id: 'mc-api-standalone', gitHead: sources['rpx-xui-webapp'].sha, manager: apiManager, manager_source_url: `https://repo.yarnpkg.com/${apiManager}/packages/yarnpkg-cli/bin/yarn.js`, manager_sha256: hash(managerBytes), manifest_packageManager: api.packageManager, engine: api.engines, builder_family: 'webpack', actual_requirements: api.dependencies, locked_peer_versions: Object.fromEntries(Object.entries(api.dependencies).map(([name, declaration]) => [name, lockedVersion(lock, name, declaration)])), locked_toolchain: {}, install_settings: {}, host_resolutions: {}, scope: 'Standalone api/package.json declared runtime dependencies and manager4.7.0, constrained to inherited root-lock selections for reproducibility; there is no standalone api lock/config. In-tree commands inherit root yarnPath4.17.1. This prospective-core installation rehearsal does not build/start the real API deployment artifact.', lock_source: 'yarn.lock (root); no api/yarn.lock exists', source_contract: 'source-contract.json' };
  compareSourceProjection(byId['mc-api-standalone'], contract.profiles['mc-api-standalone'], apiProjection);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [workspace, core, apiManager] = process.argv.slice(2);
  assert.ok(workspace && core && apiManager && process.argv.length === 5, 'Usage: node verify-source-contract.mjs WORKSPACE CORE_REPOSITORY YARN_4_7_BINARY');
  const json = (name) => JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'));
  const contract = json('source-contract.json');
  const readSource = (id, sha, path) => execFileSync('/usr/bin/git', ['-C', id === 'core' ? core : join(workspace, id), 'show', `${sha}:${path}`], { maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const managerBytes = readFileSync(apiManager);
  verifySourceHashes(contract, readSource, managerBytes);
  verifySourceProjections(contract, json('profiles.json'), json('prospective-package.json'), json('peer-providers.json'), readSource, managerBytes);
  console.log('All pinned source hashes and independently derived profile projections match.');
}
