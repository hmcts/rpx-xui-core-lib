import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const output = resolve('.angular/cache-upgrade');
const tarball = resolve('test-results/package-evidence/candidate.tgz');
const sha256 = (/** @type {string} */ file) => createHash('sha256').update(readFileSync(file)).digest('hex');
function run(/** @type {string} */ command, /** @type {string[]} */ args, /** @type {string} */ cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env });
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
assert.equal(coreDexie, '4.4.4');
assert.equal(legacyDexie, '4.4.7');
function lstatExists(/** @type {string} */ path) { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
const sources = {};
let installedCoreFesm;
let installedLockSha256;
const yarn = join(root, '.yarn/releases/yarn-4.18.1.cjs');
for (const name of ['legacy', 'core']) {
  const host = join(output, name);
  cpSync(join(root, 'tests/cache-upgrade/hosts', name), host, { recursive: true });
  const modules = join(host, 'node_modules');
  if (name === 'core') {
    cpSync(join(root, 'tests/fixtures/package'), host, { recursive: true });
    copyFileSync(tarball, join(host, 'candidate.tgz'));
    const manifestPath = join(host, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.dependencies['@hmcts/rpx-xui-core-lib'] = 'file:./candidate.tgz';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const lockLog = run(process.execPath, [yarn, 'install', '--mode=update-lockfile'], host);
    const lock = readFileSync(join(host, 'yarn.lock'));
    const installLog = run(process.execPath, [yarn, 'install', '--immutable'], host);
    assert.doesNotMatch(lockLog + installLog, /YN0002|YN0060|YN0086/, 'Installed host has unmet peer dependencies');
    assert.deepEqual(readFileSync(join(host, 'yarn.lock')), lock);
    writeFileSync(join(output, 'core-install.log'), lockLog + installLog);
    installedLockSha256 = sha256(join(host, 'yarn.lock'));
    const installed = join(modules, '@hmcts/rpx-xui-core-lib');
    assert.equal(lstatSync(installed).isSymbolicLink(), false, 'Core package must be installed');
    assert.equal(realpathSync(installed), installed, 'Core package must resolve in the isolated host');
    installedCoreFesm = join(installed, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs');
    const files = (/** @type {string} */ directory, prefix = '') => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === 'node_modules') return [];
      const relative = join(prefix, entry.name);
      if (entry.isDirectory()) return files(join(directory, entry.name), relative);
      assert.ok(entry.isFile(), `Unexpected installed package link: ${relative}`);
      return [relative];
    }).sort();
    const expectedFiles = files(corePackage);
    const verify = () => {
      assert.deepEqual(files(installed), expectedFiles, 'Installed package files differ from candidate');
      for (const file of expectedFiles) assert.equal(sha256(join(installed, file)), sha256(join(corePackage, file)), `Installed core file differs: ${file}`);
    };
    verify();
    const original = readFileSync(installedCoreFesm);
    try {
      writeFileSync(installedCoreFesm, Buffer.concat([original, Buffer.from('\n// controlled fault\n')]));
      assert.throws(verify, /Installed core file differs/);
      writeFileSync(join(output, 'core-integrity-fault.log'), 'Altered installed FESM rejected by candidate digest comparison\n');
    } finally {
      writeFileSync(installedCoreFesm, original);
    }
    verify();
  } else mkdirSync(modules);
  for (const entry of readdirSync(join(root, 'node_modules'))) {
    if (entry === '@hmcts') continue;
    const destination = join(modules, entry);
    if (name === 'core' && entry === '@angular') {
      for (const child of readdirSync(join(root, 'node_modules', entry))) {
        const target = join(destination, child);
        if (!lstatExists(target)) symlinkSync(join(root, 'node_modules', entry, child), target);
      }
    } else if (!lstatExists(destination)) symlinkSync(join(root, 'node_modules', entry), destination);
  }
  run(process.execPath, [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build'], host);
  const map = JSON.parse(readFileSync(join(host, 'dist/browser/main.js.map'), 'utf8'));
  sources[name] = map.sources;
  const old = map.sources.some((/** @type {string} */ source) => source.includes('rpx-xui-translation/fesm2022/rpx-xui-translation.mjs'));
  const current = map.sources.some((/** @type {string} */ source) => source.includes('rpx-xui-core-lib/fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs'));
  assert.equal(old, name === 'legacy', `${name} bundle legacy implementation`);
  assert.equal(current, name === 'core', `${name} bundle core implementation`);
}
writeFileSync(join(output, 'receipt.json'), JSON.stringify({
  coreTarSha256: sha256(tarball),
  coreFesmSha256: sha256(installedCoreFesm),
  installedCoreRealpath: realpathSync(installedCoreFesm),
  manager: 'yarn@4.18.1', installedLockSha256, immutableInstallNetwork: 'inherited',
  coreMapSha256: sha256(join(output, 'core/dist/browser/main.js.map')),
  legacyMapSha256: sha256(join(output, 'legacy/dist/browser/main.js.map')),
  legacyVersion: '1.2.18', coreDexie, legacyDexie,
  legacyFesmSha256: sha256(join(legacyPackage, 'fesm2022/rpx-xui-translation.mjs')),
  legacyBundleSha256: sha256(join(output, 'legacy/dist/browser/main.js')),
  coreBundleSha256: sha256(join(output, 'core/dist/browser/main.js')),
  sources,
}, null, 2));

copyFileSync(join(output, 'receipt.json'), resolve('test-results/cache-upgrade-receipt.json'));
