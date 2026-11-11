import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const eslint = createRequire(require.resolve('eslint'));
const configArray = createRequire(eslint.resolve('@eslint/config-array'));
const estree = createRequire(require.resolve('@typescript-eslint/typescript-estree'));
const cli = createRequire(require.resolve('@angular/cli/package.json'));
const pacote = createRequire(cli.resolve('pacote'));
const packageJson = createRequire(pacote.resolve('@npmcli/package-json'));
const packlist = createRequire(pacote.resolve('npm-packlist'));
const ignoreWalk = createRequire(packlist.resolve('ignore-walk'));
const tuf = createRequire(require.resolve('@tufjs/models'));
const { glob } = packageJson('glob');
const { Minimatch, minimatch } = eslint('minimatch');

async function fixture(/** @type {import('node:test').TestContext} */ t) {
  const root = await mkdtemp(join(tmpdir(), 'core-tooling-security-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('only the seven reviewed tooling parents resolve the fixed upstream releases', () => {
  const manifest = require('../package.json');
  assert.equal(manifest.devDependencies.eslint, '10.14.0');
  assert.equal(manifest.devDependencies['typescript-eslint'], '8.72.2');
  assert.deepEqual(manifest.resolutions, {
    'eslint@npm:10.14.0/minimatch': '11.0.8',
    '@eslint/config-array@npm:0.23.5/minimatch': '11.0.8',
    '@typescript-eslint/typescript-estree@npm:8.72.2/minimatch': '11.0.8',
    '@npmcli/package-json@npm:7.0.5/glob': '14.0.4',
    'cacache@npm:20.0.4/glob': '14.0.4',
    'ignore-walk@npm:8.0.0/minimatch': '11.0.8',
    '@tufjs/models@npm:4.1.0/minimatch': '11.0.8',
  });
  for (const parent of [eslint, configArray, estree, ignoreWalk, tuf]) assert.equal(parent('minimatch/package.json').version, '11.0.8');
  assert.equal(packageJson('glob/package.json').version, '14.0.4');
  const cache = createRequire(pacote.resolve('cacache'));
  assert.equal(cache('glob/package.json').version, '14.0.4');
  const runScript = createRequire(pacote.resolve('@npmcli/run-script'));
  const scriptPackageJson = createRequire(runScript.resolve('@npmcli/package-json'));
  assert.equal(scriptPackageJson('glob/package.json').version, '14.0.4');
});

test('ESLint preserves recursive and dot-file discovery, ignores and real rule failures', async t => {
  const root = await fixture(t);
  for (const path of ['src/nested', 'dist']) await mkdir(join(root, path), { recursive: true });
  for (const [path, code] of Object.entries({
    'src/good.ts': 'export const answer: number = 42;',
    'src/nested/bad.ts': 'const unused: number = 42;',
    'src/nested/.hidden.ts': 'export const hidden: number = 1;',
    'dist/generated.ts': 'const ignored: number = 1;',
  })) await writeFile(join(root, path), code);
  const lint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [
    { ignores: ['dist/**'] }, ...tseslint.configs.recommended,
  ] });
  const results = await lint.lintFiles(['**/*.ts']);
  assert.deepEqual(results.map(result => result.filePath.slice(root.length + 1)).sort(), [
    'src/good.ts', 'src/nested/.hidden.ts', 'src/nested/bad.ts',
  ]);
  assert.equal(results.reduce((total, result) => total + result.errorCount, 0), 1);
  assert.equal(results.find(result => result.errorCount).messages[0].ruleId, '@typescript-eslint/no-unused-vars');
  assert.equal(await lint.isPathIgnored(join(root, 'dist/generated.ts')), true);
});

test('the TypeScript project service retains its allowed-file glob boundary', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'src'));
  const code = 'export const answer: number = 42;';
  await writeFile(join(root, 'src/allowed.ts'), code);
  const parser = require('@typescript-eslint/parser');
  const options = { tsconfigRootDir: root, projectService: { allowDefaultProject: ['src/*.ts'] } };
  assert.ok(parser.parseForESLint(code, { ...options, filePath: join(root, 'src/allowed.ts') }).services.program);
  assert.throws(() => parser.parseForESLint(code, { ...options, filePath: join(root, 'outside.ts') }), /not found by the project service|allowDefaultProject/);
});

test('npm package preparation still discovers native builds, README, binaries and manuals', async t => {
  const root = await fixture(t);
  for (const path of ['bin', 'man']) await mkdir(join(root, path));
  for (const [path, content] of Object.entries({
    'package.json': JSON.stringify({ name: 'public-fixture', version: '1.0.0', directories: { bin: 'bin', man: 'man' } }),
    'binding.gyp': '{}', 'README.md': '# Public fixture\n', 'bin/cli.js': '', 'man/fixture.1': '',
  })) await writeFile(join(root, path), content);
  const prepared = await pacote('@npmcli/package-json').prepare(root);
  assert.equal(prepared.content.scripts.install, 'node-gyp rebuild');
  assert.equal(prepared.content.readme, '# Public fixture\n');
  assert.equal(prepared.content.readmeFilename, 'README.md');
  assert.deepEqual(prepared.content.bin, { 'cli.js': 'bin/cli.js' });
  assert.deepEqual(prepared.content.man, ['man/fixture.1']);
});

test('cacache verifies and removes only its own indexed and content cache trees', async t => {
  const root = await fixture(t);
  const cache = join(root, 'cache store');
  const sibling = join(root, 'cache store-sibling');
  await mkdir(sibling);
  await writeFile(join(sibling, 'sentinel'), 'outside cache');
  const cacheRequire = createRequire(pacote.resolve('cacache'));
  assert.equal(cacheRequire('glob/package.json').version, '14.0.4');
  const cacache = pacote('cacache');
  const kept = await cacache.put(cache, 'retained', 'retained content');
  const orphan = await cacache.put(cache, 'removed', 'orphan content');
  assert.equal((await cacache.get(cache, 'retained')).data.toString(), 'retained content');
  await cacache.rm.entry(cache, 'removed');
  await writeFile(join(cache, 'keep.txt'), 'inside cache');
  const stats = await cacache.verify(cache);
  assert.equal(stats.verifiedContent, 1);
  assert.equal(stats.reclaimedCount, 1);
  assert.equal(stats.totalEntries, 1);
  assert.deepEqual(Object.keys(await cacache.ls(cache)), ['retained']);
  assert.equal((await cacache.get.byDigest(cache, kept)).toString(), 'retained content');
  assert.equal(await cacache.get.hasContent(cache, orphan), false);
  const content = await readdir(join(cache, 'content-v2'), { recursive: true, withFileTypes: true });
  assert.equal(content.filter(entry => entry.isFile()).length, 1);
  await cacache.rm.all(cache);
  assert.deepEqual((await readdir(cache)).sort(), ['_lastverified', 'keep.txt']);
  assert.deepEqual(await cacache.ls(cache), {});
  await assert.rejects(cacache.get(cache, 'retained'), { code: 'ENOENT' });
  assert.equal(await readFile(join(cache, 'keep.txt'), 'utf8'), 'inside cache');
  assert.equal(await readFile(join(sibling, 'sentinel'), 'utf8'), 'outside cache');
});

test('ignore-walk and npm-packlist preserve nested ignores, negation, dotfiles and directory boundaries', async t => {
  const root = await fixture(t);
  for (const path of ['src', 'secret', 'secretary']) await mkdir(join(root, path));
  const manifest = { name: 'public-package-fixture', version: '1.0.0' };
  for (const [path, content] of Object.entries({
    'package.json': JSON.stringify(manifest),
    '.npmignore': '.npmignore\n*.log\nsecret/**\n!secret/kept.txt\n',
    'src/.npmignore': '*.tmp\n!keep.tmp\n',
    '.hidden.txt': '', 'src/.hidden.txt': '', 'src/keep.tmp': '', 'src/drop.tmp': '',
    'src/kept.js': '', 'src/drop.log': '', 'secret/kept.txt': '', 'secret/drop.txt': '', 'secretary/kept.txt': '',
  })) await writeFile(join(root, path), content);
  const expected = ['.hidden.txt', 'package.json', 'secret/kept.txt', 'secretary/kept.txt', 'src/.hidden.txt', 'src/keep.tmp', 'src/kept.js'];
  assert.deepEqual((await packlist('ignore-walk')({ path: root, ignoreFiles: ['.npmignore'] })).sort(), expected);
  assert.deepEqual((await pacote('npm-packlist')({ path: root, package: manifest, isProjectRoot: true })).sort(), expected);
});

test('TUF delegated paths retain segment boundaries and reject excessive metadata patterns', () => {
  const { DelegatedRole } = tuf('./role.js');
  const role = new DelegatedRole({
    name: 'fixture-role', keyIDs: ['fixture-key'], threshold: 1, terminating: true,
    paths: ['packages/*.{tgz,zip}', 'metadata/*.json'],
  });
  for (const path of ['packages/release.tgz', 'packages/release.zip', 'metadata/release.json']) assert.equal(role.isDelegatedPath(path), true, path);
  for (const path of [
    'packages/nested/release.tgz', 'packages-other/release.tgz', 'metadata/release.tgz',
    'packages/.hidden.tgz', 'packages/release.tgz/', 'packages//release.tgz', 'packages/../release.tgz',
  ]) assert.equal(role.isDelegatedPath(path), false, path);
  const globstar = new DelegatedRole({ name: 'fixture-globstar', keyIDs: ['fixture-key'], threshold: 1, terminating: true, paths: ['packages/**'] });
  assert.equal(globstar.isDelegatedPath('packages/release.tgz'), true);
  assert.equal(globstar.isDelegatedPath('packages/nested/release.tgz'), false);
  const excessive = new DelegatedRole({
    name: 'fixture-excessive', keyIDs: ['fixture-key'], threshold: 1, terminating: true,
    paths: ['packages/' + '*('.repeat(1200) + 'a' + ')'.repeat(1200)],
  });
  assert.throws(() => excessive.isDelegatedPath('packages/a'), { name: 'TypeError', message: 'pattern has too many extglobs' });
});

test('reviewed minimatch APIs preserve matching and reject excessive optimization work', () => {
  for (const [path, pattern, options, expected] of /** @type {[string, string, object, boolean][]} */ ([
    ['src/nested/.hidden.ts', '**/*.ts', { dot: true }, true],
    ['src/nested/.hidden.ts', '**/*.ts', {}, false],
    ['src/file.ts', '**/*.{ts,mjs,cjs}', { dot: true }, true],
    ['src/nested/file.ts', 'src/**/*.ts', { dot: true }, true],
    ['src/nested/file.ts', 'src/*.ts', { dot: true }, false],
    ['README.md', '{README,README.*}', { nocase: true }, true],
  ])) {
    assert.equal(minimatch(path, pattern, options), expected);
    assert.equal(new Minimatch(pattern, options).match(path), expected);
  }
  assert.equal(new Minimatch('src/**/*.ts', { dot: true }).match('src/nested', true), true);
  assert.throws(() => new Minimatch(Array(15).fill('**/../a/b').join('/'), { optimizationLevel: 2 }), RangeError);
});

test('aborted glob traversal stops filesystem reads after rejecting', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'nested/deeper'), { recursive: true });
  await writeFile(join(root, 'nested/deeper/file.js'), '');
  const controller = new AbortController();
  const reason = new Error('controlled traversal cancellation');
  let reads = 0;
  const counted = { ...fs, readdir: new Proxy(fs.readdir, {
    apply(target, receiver, args) {
      if (++reads === 1) controller.abort(reason);
      return Reflect.apply(target, receiver, args);
    },
  }) };
  await assert.rejects(glob('**', { cwd: root, signal: controller.signal, fs: counted }), error => error === reason);
  assert.equal(reads, 1);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(reads, 1);
});

test('fixed minimatch bounds retained cache memory, long-pattern work and excessive extglobs', async t => {
  const root = await fixture(t);
  // Upstream security regressions GHSA-hqmv-qgp3-jx75, GHSA-cf2h-pxjq-68xw and GHSA-2349-h8hg-73g9.
  const script = `
    const assert = require('node:assert/strict');
    const { minimatch, Minimatch } = require(process.argv[1]);
    for (let i = 0; i < 30; i++) assert.equal(minimatch('a/b', '{a,b}/'.repeat(13) + '*' + i), false);
    const stars = Array(16000).fill('*').join('/');
    const words = Array.from({ length: 16 }, (_, i) => 'w' + i).join(',');
    for (const pattern of [stars, '{' + words + '}*/' + stars.slice(0, 8000), '{' + words + '}/' + stars.slice(0, 8000)]) {
      const matcher = new Minimatch(pattern);
      assert.equal(matcher.set.length, matcher.globParts.length);
    }
    assert.throws(() => new Minimatch('*('.repeat(1200) + 'a' + ')'.repeat(1200)), {
      name: 'TypeError', message: 'pattern has too many extglobs',
    });
    console.log('bounded');
  `;
  const result = spawnSync(process.execPath, ['--max-old-space-size=64', '-e', script, eslint.resolve('minimatch')], {
    cwd: root, encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr.slice(-1000));
  assert.equal(result.stdout.trim(), 'bounded');
});
