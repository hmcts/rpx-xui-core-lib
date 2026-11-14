import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
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

test('only the reviewed dependency parents resolve the pinned security fixes', () => {
  const manifest = require('../package.json');
  assert.equal(manifest.devDependencies.eslint, '10.14.0');
  assert.equal(manifest.devDependencies['typescript-eslint'], '8.72.2');
  assert.deepEqual(manifest.resolutions, {
    'eslint@npm:10.14.0/minimatch': '11.0.8',
    '@eslint/config-array@npm:0.23.5/minimatch': '11.0.8',
    '@typescript-eslint/typescript-estree@npm:8.72.2/minimatch': '11.0.8',
    '@npmcli/package-json@npm:7.0.5/glob': '14.0.6',
    'cacache@npm:20.0.4/glob': '14.0.6',
    'ignore-walk@npm:8.0.0/minimatch': '11.0.8',
    '@tufjs/models@npm:4.1.0/minimatch': '11.0.8',
    '@jest/reporters@npm:30.5.1/glob': '14.0.6',
    'jest-config@npm:30.5.1/glob': '14.0.6',
    'jest-runtime@npm:30.5.1/glob': '14.0.6',
    'test-exclude@npm:7.0.2/glob': '14.0.6',
    'test-exclude@npm:7.0.2/minimatch': '11.0.8',
    'jest-config@npm:30.5.1/deepmerge': 'npm:@shivammathur/deepmerge@4.3.2',
    'ngx-markdown@npm:20.1.0/katex': '0.18.2',
    'mermaid@npm:11.17.2/katex': '0.18.2',
    'exceljs@npm:4.4.0/uuid': '11.1.1',
  });
  for (const parent of [eslint, configArray, estree, ignoreWalk, tuf]) assert.equal(parent('minimatch/package.json').version, '11.0.8');
  assert.equal(packageJson('glob/package.json').version, '14.0.6');
  const cache = createRequire(pacote.resolve('cacache'));
  assert.equal(cache('glob/package.json').version, '14.0.6');
  const runScript = createRequire(pacote.resolve('@npmcli/run-script'));
  const scriptPackageJson = createRequire(runScript.resolve('@npmcli/package-json'));
  assert.equal(scriptPackageJson('glob/package.json').version, '14.0.6');
  const nodeWorkspace = createRequire(new URL('../projects/core-lib/node/package.json', import.meta.url));
  for (const parent of ['@jest/reporters', 'jest-config', 'jest-runtime', 'test-exclude']) {
    assert.equal(createRequire(nodeWorkspace.resolve(parent))('glob/package.json').version, '14.0.6');
  }
  assert.equal(createRequire(nodeWorkspace.resolve('test-exclude'))('minimatch/package.json').version, '11.0.8');
  const patchedMerge = createRequire(nodeWorkspace.resolve('jest-config'))('deepmerge/package.json');
  assert.equal(patchedMerge.name, '@shivammathur/deepmerge');
  assert.equal(patchedMerge.version, '4.3.2');
});

test('glob applies its brace expansion bound to ignore patterns', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'file.txt'), '');
  const payload = Array.from({ length: 14 }, (_, i) => `**/../x${i}/y${i}`).join('/');
  assert.throws(() => glob.sync('*', { cwd: root, ignore: [payload] }), /too many patterns/i);
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
  assert.equal(cacheRequire('glob/package.json').version, '14.0.6');
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

test('Jest config merging keeps normal merge contracts and rejects prototype keys', () => {
  const nodeWorkspace = createRequire(new URL('../projects/core-lib/node/package.json', import.meta.url));
  const jestConfig = createRequire(nodeWorkspace.resolve('jest-config'));
  const merge = jestConfig('deepmerge');
  const source = { globals: { feature: true }, testMatch: ['second'] };
  const result = merge.all([{ globals: { existing: true }, testMatch: ['first'] }, source]);
  assert.deepEqual(result, { globals: { existing: true, feature: true }, testMatch: ['first', 'second'] });
  assert.notEqual(result.globals, source.globals);
  assert.deepEqual(merge({ list: [1] }, { list: [2] }, { arrayMerge: (_target, items) => items }), { list: [2] });
  assert.deepEqual(merge({ setting: { a: 1 } }, { setting: { b: 2 } }, {
    customMerge: key => key === 'setting' ? (_target, value) => value : undefined,
  }), { setting: { b: 2 } });
  const reserved = JSON.parse('{"__proto__":{"marker":true},"safe":1}');
  for (const [target, incoming] of [[reserved, {}], [Object.create(null), reserved]]) {
    const merged = merge(target, incoming, { clone: false });
    assert.equal(Object.getPrototypeOf(merged), Object.prototype);
    assert.equal(Object.hasOwn(merged, '__proto__'), false);
    assert.equal(merged.marker, undefined);
    assert.equal(merged.safe, 1);
  }
});


test('reviewed markdown parents retain KaTeX rendering and auto-render APIs', async () => {
  const markdown = createRequire(require.resolve('ngx-markdown/package.json'));
  const mermaid = createRequire(markdown.resolve('mermaid/package.json'));
  for (const parent of [markdown, mermaid]) {
    const katex = parent('katex');
    assert.equal(parent('katex/package.json').version, '0.18.2');
    assert.match(katex.renderToString('x^2 + 1', { displayMode: false, throwOnError: true, trust: false }), /class="katex"/);
    assert.match(katex.renderToString('\\frac{1}{2}', { displayMode: true, throwOnError: true, trust: false }), /katex-display/);
    assert.throws(() => katex.renderToString('\\frac{', { throwOnError: true, trust: false }), /parse error/i);
    const untrusted = katex.renderToString('\\href{https://example.com}{sample}', { throwOnError: false, trust: false });
    assert.doesNotMatch(untrusted, /<a[^>]+href=/);
    assert.equal(typeof parent('katex/contrib/auto-render'), 'function');
    const esm = await import(new URL('./contrib/auto-render.mjs', pathToFileURL(parent.resolve('katex'))).href);
    assert.equal(typeof esm.default, 'function');
  }
});

test('ExcelJS keeps extended conditional-formatting IDs and workbook round trips with UUID11', async () => {
  const viewer = createRequire(require.resolve('@hmcts/media-viewer/package.json'));
  const excel = createRequire(viewer.resolve('exceljs/package.json'));
  assert.equal(excel('uuid/package.json').version, '11.1.1');
  const CfRuleExtXform = excel('./lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform');
  const first = { type: 'dataBar', gradient: false, x14Id: '' };
  const second = { type: 'dataBar', gradient: false, x14Id: '' };
  const transform = new CfRuleExtXform();
  transform.prepare(first);
  transform.prepare(second);
  assert.match(first.x14Id, /^\{[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\}$/);
  assert.notEqual(first.x14Id, second.x14Id);
  const ExcelJS = viewer('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Synthetic');
  sheet.addRows([[1], [2]]);
  sheet.addConditionalFormatting({ ref: 'A1:A2', rules: [{ type: 'dataBar', gradient: false, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF00FF00' } }] });
  const bytes = await workbook.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(bytes);
  const actual = restored.getWorksheet('Synthetic');
  assert.equal(actual.getCell('A1').value, 1);
  assert.equal(actual.getCell('A2').value, 2);
  const rule = actual.conditionalFormattings[0].rules[0];
  assert.equal(rule.type, 'dataBar');
  assert.equal(rule.gradient, false);
  assert.match(rule.x14Id, /^\{[0-9A-F-]+\}$/);
});

for (const scenario of ['advisory', 'deprecation']) {
  test(`dependency audit keeps ${scenario} evidence and the vulnerability exit contract`, async t => {
    const root = await fixture(t);
    const workflow = require('js-yaml').load(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'));
    const steps = workflow.jobs['dependency-audit'].steps;
    const security = steps.find(step => step.name === 'Audit runtime and development vulnerabilities');
    const maintenance = steps.find(step => step.name === 'Record dependency maintenance warnings');
    assert.ok(security, 'A blocking vulnerability audit is required');
    assert.ok(maintenance, 'Raw maintenance evidence must remain visible');
    assert.notEqual(security['continue-on-error'], true);
    await mkdir(join(root, '.yarn/releases'), { recursive: true });
    const entry = { value: 'synthetic-package', children: { ID: scenario === 'advisory' ? 123 : 'synthetic-package (deprecation)', Issue: 'Synthetic audit receipt' } };
    await writeFile(join(root, '.yarn/releases/yarn-4.18.1.cjs'), `
      const assert = require('node:assert/strict');
      const args = process.argv.slice(2);
      for (const flag of ['--all', '--recursive', '--json']) assert.ok(args.includes(flag));
      for (const flag of ['--severity', '--exclude', '--ignore']) assert.ok(!args.includes(flag));
      const visible = ${JSON.stringify(scenario)} === 'advisory' || !args.includes('--no-deprecations');
      if (visible) console.log(${JSON.stringify(JSON.stringify(entry))});
      process.exit(visible ? 1 : 0);
    `);
    const audit = spawnSync('/bin/bash', ['-e', '-c', security.run], { cwd: root, encoding: 'utf8' });
    assert.equal(audit.status, scenario === 'advisory' ? 1 : 0, audit.stderr);
    const captured = await readFile(join(root, 'test-results/dependency-audit.jsonl'), 'utf8');
    if (scenario === 'advisory') assert.equal(JSON.parse(captured).children.ID, 123);
    else assert.equal(captured, '');
    const raw = spawnSync('/bin/bash', ['-e', '-c', maintenance.run], { cwd: root, encoding: 'utf8' });
    assert.equal(raw.status, 0, raw.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'test-results/dependency-maintenance.jsonl'), 'utf8')), entry);
    assert.equal((await readFile(join(root, 'test-results/dependency-maintenance.exit-code'), 'utf8')).trim(), '1');
    const retained = steps.find(step => step.name === 'Retain dependency audit');
    assert.match(retained.with.path, /dependency-maintenance/);
  });
}


test('maintenance audit evidence write failures remain fatal', async t => {
  const root = await fixture(t);
  const workflow = require('js-yaml').load(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'));
  const maintenance = workflow.jobs['dependency-audit'].steps.find(step => step.name === 'Record dependency maintenance warnings');
  await mkdir(join(root, '.yarn/releases'), { recursive: true });
  await mkdir(join(root, 'test-results/dependency-maintenance.exit-code'), { recursive: true });
  await writeFile(join(root, '.yarn/releases/yarn-4.18.1.cjs'), "console.log('{}'); process.exit(1);\n");
  const result = spawnSync('/bin/bash', ['-e', '-c', maintenance.run], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /is a directory/i);
});


test('maintenance audit output-open failures remain fatal', async t => {
  const root = await fixture(t);
  const workflow = require('js-yaml').load(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'));
  const maintenance = workflow.jobs['dependency-audit'].steps.find(step => step.name === 'Record dependency maintenance warnings');
  await mkdir(join(root, '.yarn/releases'), { recursive: true });
  await mkdir(join(root, 'test-results/dependency-maintenance.jsonl'), { recursive: true });
  await writeFile(join(root, '.yarn/releases/yarn-4.18.1.cjs'), "console.log('{}'); process.exit(1);\n");
  const result = spawnSync('/bin/bash', ['-e', '-c', maintenance.run], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /is a directory/i);
});
