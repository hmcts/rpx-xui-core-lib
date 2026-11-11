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
assert.equal(coreDexie, '4.4.4');
assert.equal(legacyDexie, '4.4.7');
const sources = {};
for (const name of ['legacy', 'core']) {
  const host = join(output, name);
  cpSync(join(root, 'tests/cache-upgrade/hosts', name), host, { recursive: true });
  const modules = join(host, 'node_modules');
  mkdirSync(modules);
  for (const entry of readdirSync(join(root, 'node_modules'))) {
    if (entry === '@hmcts') continue;
    symlinkSync(join(root, 'node_modules', entry), join(modules, entry));
  }
  mkdirSync(join(modules, '@hmcts'));
  symlinkSync(corePackage, join(modules, '@hmcts/rpx-xui-core-lib'));
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
  coreFesmSha256: sha256(join(corePackage, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs')),
  legacyVersion: '1.2.18', coreDexie, legacyDexie,
  legacyFesmSha256: sha256(join(legacyPackage, 'fesm2022/rpx-xui-translation.mjs')),
  legacyBundleSha256: sha256(join(output, 'legacy/dist/browser/main.js')),
  coreBundleSha256: sha256(join(output, 'core/dist/browser/main.js')),
  sources,
}, null, 2));

copyFileSync(join(output, 'receipt.json'), resolve('test-results/cache-upgrade-receipt.json'));
