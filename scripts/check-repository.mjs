import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('package.json'));
const nodeVersion = read('.nvmrc').trim();
const yarnVersion = manifest.packageManager.replace('yarn@', '');

assert.equal(manifest.name, '@hmcts/rpx-xui-core-lib');
// Publication stays blocked until the packed-artifact feasibility gates are accepted.
assert.equal(manifest.private, true, 'Package publication must remain disabled during bootstrap');
assert.equal(manifest.engines.node, `>=${nodeVersion} <25`);
assert.equal(process.versions.node, nodeVersion, 'Run checks with the Node version in .nvmrc');
assert.equal(manifest.packageManager, 'yarn@4.5.3');
assert.match(read('.yarnrc.yml'), /^nodeLinker: node-modules$/m);
assert.ok(read('.yarnrc.yml').includes(`yarnPath: .yarn/releases/yarn-${yarnVersion}.cjs`));
assert.ok(read(`.yarn/releases/yarn-${yarnVersion}.cjs`).length > 0);
assert.ok(read('yarn.lock').includes(`${manifest.name}@workspace:.`));
console.log('Bootstrap configuration checks passed; no runtime compatibility has been tested.');
