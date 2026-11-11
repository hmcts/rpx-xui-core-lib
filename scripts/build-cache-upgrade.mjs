import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const output = resolve('.angular/cache-upgrade');
const tarball = resolve('test-results/package-evidence/candidate.tgz');
const sha256 = (/** @type {string} */ file) => createHash('sha256').update(readFileSync(file)).digest('hex');
function run(/** @type {string} */ command, /** @type {string[]} */ args, /** @type {string} */ cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
const candidate = join(output, 'candidate');
mkdirSync(candidate);
run('tar', ['-xzf', tarball, '-C', candidate], root);
const corePackage = join(candidate, 'package');
const packaged = JSON.parse(readFileSync(resolve('test-results/package.json'), 'utf8'));
assert.equal(sha256(tarball), packaged.package.sha256, 'Cache lane must use the verified package artifact');
const legacyPackage = resolve('node_modules/rpx-xui-translation');
assert.equal(JSON.parse(readFileSync(join(legacyPackage, 'package.json'), 'utf8')).version, '1.2.18');
assert.equal(sha256(join(legacyPackage, 'fesm2022/rpx-xui-translation.mjs')), '3d0c32d072a80768b8e638e930e531f5474a0520cd8f7fd5a9750b3754c5dbdf');
const coreDexie = JSON.parse(readFileSync(resolve('node_modules/dexie/package.json'), 'utf8')).version;
const legacyDexie = createRequire(join(legacyPackage, 'package.json'))('dexie/package.json').version;
assert.equal(coreDexie, '4.4.7');
assert.equal(legacyDexie, '4.4.7');
const baselineDexie = JSON.parse(readFileSync(resolve('node_modules/dexie-baseline/package.json'), 'utf8')).version;
assert.equal(baselineDexie, '4.4.4');
// Rebuild the identical core source with the historical Dexie dependency in an isolated stage.
const baselineStage = join(output, 'baseline-source');
mkdirSync(join(baselineStage, 'projects'), { recursive: true });
cpSync(join(root, 'projects/core-lib'), join(baselineStage, 'projects/core-lib'), { recursive: true });
mkdirSync(join(baselineStage, 'scripts'));
copyFileSync(join(root, 'scripts/build.mjs'), join(baselineStage, 'scripts/build.mjs'));
for (const file of ['tsconfig.json', 'LICENCE']) copyFileSync(join(root, file), join(baselineStage, file));
const baselineManifest = join(baselineStage, 'projects/core-lib/package.json');
const baselinePackage = JSON.parse(readFileSync(baselineManifest, 'utf8'));
assert.equal(baselinePackage.dependencies.dexie, coreDexie);
baselinePackage.dependencies.dexie = baselineDexie;
writeFileSync(baselineManifest, JSON.stringify(baselinePackage, null, 2));
mkdirSync(join(baselineStage, 'node_modules/@hmcts'), { recursive: true });
for (const entry of readdirSync(join(root, 'node_modules'))) {
  if (entry === '@hmcts') continue;
  symlinkSync(join(root, 'node_modules', entry), join(baselineStage, 'node_modules', entry));
}
run(process.execPath, [join(baselineStage, 'scripts/build.mjs')], baselineStage);
const baselineCorePackage = join(baselineStage, 'dist/core-lib');
assert.equal(JSON.parse(readFileSync(join(baselineCorePackage, 'package.json'), 'utf8')).dependencies.dexie, '4.4.4');
assert.equal(sha256(join(baselineCorePackage, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs')), sha256(join(corePackage, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs')), 'Baseline source must match packaged core');
const sources = {};
for (const name of ['legacy', 'core', 'core-baseline']) {
  const host = join(output, name);
  const sourceHost = name === 'core-baseline' ? 'core' : name;
  cpSync(join(root, 'tests/cache-upgrade/hosts', sourceHost), host, { recursive: true });
  if (name === 'core-baseline') {
    const index = join(host, 'app/index.html');
    const html = readFileSync(index, 'utf8');
    assert.ok(html.includes('href="/core/"'));
    writeFileSync(index, html.replace('href="/core/"', 'href="/core-baseline/"'));
  }
  const modules = join(host, 'node_modules');
  mkdirSync(modules);
  for (const entry of readdirSync(join(root, 'node_modules'))) {
    if (entry === '@hmcts' || (name === 'core-baseline' && entry === 'dexie')) continue;
    symlinkSync(join(root, 'node_modules', entry), join(modules, entry));
  }
  if (name === 'core-baseline') symlinkSync(join(root, 'node_modules/dexie-baseline'), join(modules, 'dexie'));
  mkdirSync(join(modules, '@hmcts'));
  symlinkSync(name === 'core-baseline' ? baselineCorePackage : corePackage, join(modules, '@hmcts/rpx-xui-core-lib'));
  run(process.execPath, [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build'], host);
  const map = JSON.parse(readFileSync(join(host, 'dist/browser/main.js.map'), 'utf8'));
  sources[name] = map.sources;
  const old = map.sources.some((/** @type {string} */ source) => source.includes('rpx-xui-translation/fesm2022/rpx-xui-translation.mjs'));
  const current = map.sources.some((/** @type {string} */ source) => source.includes('rpx-xui-core-lib/fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs'));
  assert.equal(old, name === 'legacy', `${name} bundle legacy implementation`);
  assert.equal(current, name !== 'legacy', `${name} bundle core implementation`);
  const dexieIndex = map.sources.findIndex((/** @type {string} */ source) => source.endsWith('dexie/dist/dexie.js'));
  assert.notEqual(dexieIndex, -1, `${name} bundle includes Dexie`);
  const expectedDexie = name === 'core-baseline' ? baselineDexie : '4.4.7';
  assert.ok(map.sourcesContent[dexieIndex].includes(`DEXIE_VERSION = '${expectedDexie}'`), `${name} bundle Dexie version`);
}
writeFileSync(join(output, 'receipt.json'), JSON.stringify({
  coreTarSha256: sha256(tarball),
  coreFesmSha256: sha256(join(corePackage, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs')),
  baselineCoreFesmSha256: sha256(join(baselineCorePackage, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs')),
  baselineCoreManifestSha256: sha256(join(baselineCorePackage, 'package.json')),
  legacyVersion: '1.2.18', coreDexie, legacyDexie, baselineDexie,
  legacyFesmSha256: sha256(join(legacyPackage, 'fesm2022/rpx-xui-translation.mjs')),
  legacyBundleSha256: sha256(join(output, 'legacy/dist/browser/main.js')),
  coreBundleSha256: sha256(join(output, 'core/dist/browser/main.js')),
  baselineBundleSha256: sha256(join(output, 'core-baseline/dist/browser/main.js')),
  sources,
}, null, 2));

copyFileSync(join(output, 'receipt.json'), resolve('test-results/cache-upgrade-receipt.json'));
