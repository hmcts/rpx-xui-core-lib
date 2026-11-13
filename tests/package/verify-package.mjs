import assert from 'node:assert/strict';
import { currentIdentity } from '../../scripts/evidence-identity.mjs';
import { sourceSnapshot } from '../../scripts/evidence-source-snapshot.mjs';
import { browserOutcomes } from '../../scripts/check-contracts.mjs';
import { buildSync } from 'esbuild';
import { inspectLoadingGraph, assertPackedBytes, assertEagerDateFailure } from '../packed-loading/graph.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = join(root, 'test-results');
const evidence = join(output, 'package-evidence');
const report = { schemaVersion: 1, package: {}, tests: [] };
const yarn = join(root, '.yarn/releases/yarn-4.18.1.cjs');
let current = 'package.setup';
let scratch;
let nodeOnlyConsumer;

await mkdir(output, { recursive: true });
await rm(join(output, 'package.json'), { force: true });
await rm(evidence, { force: true, recursive: true });
await mkdir(evidence, { recursive: true });

/** @type {NodeJS.ProcessEnv} */
const env = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` };
for (const key of Object.keys(env)) {
  if (key === 'NODE_PATH' || key === 'NODE_OPTIONS' || key.startsWith('YARN_')) delete env[key];
}
env.YARN_IGNORE_PATH = '1';
env.YARN_ENABLE_TELEMETRY = '0';
env.YARN_ENABLE_GLOBAL_CACHE = 'false';
env.NG_BUILD_MAX_WORKERS = '1';
env.NG_BUILD_PARALLEL_TS = 'false';

async function run(name, args, cwd, expectedStatus = 0, timeout = 3 * 60_000) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 20 * 1024 * 1024 });
  const diagnostic = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}${result.signal ? `\nchild signal: ${result.signal}` : ''}`;
  await writeFile(join(evidence, `${name}.log`), diagnostic);
  assert.equal(result.status, expectedStatus, `${name} exited ${result.status}:\n${diagnostic}`);
  assert.doesNotMatch(diagnostic, /YN0002|YN0060|YN0086/, `${name} has unmet peer dependencies`);
  return diagnostic;
}

async function check(id, action) {
  current = id;
  await action();
  report.tests.push({ id, status: 'passed' });
  console.log(`PASS ${id}`);
}

try {
  assert.equal(process.versions.node, '24.22.2', 'Run with the pinned Node 24.22.2');
  scratch = await realpath(await mkdtemp(join(tmpdir(), 'core-lib-package-')));
  env.YARN_GLOBAL_FOLDER = join(scratch, 'yarn-global');
  env.YARN_CACHE_FOLDER = join(scratch, 'cache');
  const staged = join(scratch, 'package');
  const consumer = join(scratch, 'consumer');
  const dist = join(root, 'dist/core-lib');
  const declaration = 'forms/validation/index.d.ts';
  const sourceLicenceEntries = ['ui/find-task-name', 'ui/find-work-type', 'ui/search-work-type', 'ui/find-person', 'ui/checkbox-list', 'ui/gov-date', 'ui/gov-select', 'ui/search-location', 'terms/display', 'ui/gov-input', 'case/session-error', 'case/editor-date', 'browser/window', 'browser/session-storage', 'reference/locations', 'reference/ref-data', 'terms/models', 'ui/cookie', 'ui/feature-toggle', 'ui/feature-toggle-directive', 'ui/role-state', 'ui/task-data', 'case/sharing-state', 'ui/contact-details', 'ui/loading-spinner', 'ui/loading-state', 'ui/due-date', 'ui/accessibility', 'ui/session-dialog', 'ui/banner', 'ui/form-label', 'case/models', 'case/reference', 'case/sharing'];

  // Fail before dependency setup when the legacy TypeScript entry point is absent.
  await check('package.physical-secondary-declaration', async () => {
    assert.ok((await stat(join(dist, declaration))).isFile());
    assert.ok((await stat(join(dist, 'forms/validation/LICENCE'))).isFile());
    for (const entry of sourceLicenceEntries) {
      assert.equal(await readFile(join(dist, entry, 'LICENCE'), 'utf8'), await readFile(join(root, 'projects/core-lib', entry, 'LICENCE'), 'utf8'), 'Copied source licence must survive packaging');
    }
  });

  await check('package.physical-node', async () => {
    for (const file of [
      'node/index.js', 'node/index.d.ts', 'node/package.json', 'node/LICENCE',
      'node/server/index.js', 'node/server/index.d.ts',
      'node/server/auth/index.js', 'node/server/auth/index.d.ts',
      'node/server/session/index.js', 'node/server/session/index.d.ts',
      'node/server/security/index.js', 'node/server/security/index.d.ts',
      'node/server/logging/index.js', 'node/server/logging/index.d.ts',
    ]) assert.ok((await stat(join(dist, file))).isFile(), `Missing packed Node entry: ${file}`);
    assert.deepEqual(JSON.parse(await readFile(join(dist, 'node/package.json'), 'utf8')), { type: 'commonjs' });
    assert.doesNotMatch(await readFile(join(dist, 'node/index.d.ts'), 'utf8'), /express-session|express-serve-static-core/, 'The lightweight Node entry must not require server type packages');
    const packageExports = JSON.parse(await readFile(join(dist, 'package.json'), 'utf8')).exports;
    for (const [name, file] of Object.entries({
      './node': 'index',
      './node/server': 'server/index',
      './node/server/auth': 'server/auth/index',
      './node/server/session': 'server/session/index',
      './node/server/security': 'server/security/index',
      './node/server/logging': 'server/logging/index',
    })) {
      assert.deepEqual(packageExports[name], {
        browser: null,
        types: `./node/${file}.d.ts`,
        node: `./node/${file}.js`,
      });
    }
  });

  await check('package.physical-i18n', async () => {
    for (const file of ['i18n/index.d.ts', 'i18n/LICENCE', 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs']) assert.ok((await stat(join(dist, file))).isFile());
    const implementation = await readFile(join(dist, 'fesm2022/hmcts-rpx-xui-core-lib-i18n.mjs'), 'utf8');
    assert.doesNotMatch(implementation, /from ['"]rpx-xui-translation['"]/, 'Canonical implementation must not depend on legacy runtime');
  });
  await cp(dist, staged, { recursive: true });
  await writeFile(join(staged, 'yarn.lock'), '');
  const candidate = join(scratch, 'candidate.tgz');
  current = 'package.setup';
  const packageFiles = await run('pack', [yarn, 'pack', '--out', candidate], staged);
  assert.doesNotMatch(packageFiles, /node\/node_modules/);
  report.package = {
    sha256: createHash('sha256').update(await readFile(candidate)).digest('hex'),
    ...currentIdentity(root),
    node: process.versions.node,
    yarn: '4.18.1',
    angular: '20.3.35',
    typescript: '5.9.3',
  };
  await cp(candidate, join(evidence, 'candidate.tgz'));

  await check('package.node-only-peer-install', async () => {
    const nodeConsumer = join(scratch, 'node-only-consumer');
    nodeOnlyConsumer = nodeConsumer;
    await mkdir(nodeConsumer, { recursive: true });
    await cp(candidate, join(nodeConsumer, 'candidate.tgz'));
    await cp(join(root, 'tests/fixtures/package/node-only-runtime.mjs'), join(nodeConsumer, 'node-only-runtime.mjs'));
    await writeFile(join(nodeConsumer, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
    await writeFile(join(nodeConsumer, 'package.json'), `${JSON.stringify({
      name: 'core-lib-node-only-consumer',
      version: '0.0.0',
      private: true,
      type: 'module',
      packageManager: 'yarn@4.18.1',
      dependencies: { '@hmcts/rpx-xui-core-lib': 'file:./candidate.tgz' },
    }, null, 2)}\n`);
    await run('node-only-lock', [yarn, 'install', '--mode=update-lockfile'], nodeConsumer);
    const lock = await readFile(join(nodeConsumer, 'yarn.lock'), 'utf8');
    await run('node-only-install-immutable', [yarn, 'install', '--immutable'], nodeConsumer);
    assert.equal(await readFile(join(nodeConsumer, 'yarn.lock'), 'utf8'), lock);
    for (const peer of ['@angular/common', '@angular/core', '@angular/forms', '@angular/material', '@angular/cdk', '@angular/platform-browser', 'rxjs', 'zone.js']) {
      await assert.rejects(stat(join(nodeConsumer, 'node_modules', peer)), { code: 'ENOENT' }, `Node consumer must not install ${peer}`);
    }
    await run('node-only-runtime', ['node-only-runtime.mjs'], nodeConsumer);
    const serverDependencies = spawnSync(process.execPath, ['--input-type=commonjs', '-e', "const { createRequire } = require('node:module'); const auth = require.resolve('@hmcts/rpx-xui-core-lib/node/server/auth'); const session = require.resolve('@hmcts/rpx-xui-core-lib/node/server/session'); process.stdout.write([createRequire(auth).resolve('passport'), createRequire(session).resolve('express-session')].join('\\n'));"], { cwd: nodeConsumer, env, encoding: 'utf8' });
    const serverDependencyPaths = `${serverDependencies.stdout ?? ''}${serverDependencies.stderr ?? ''}`;
    await writeFile(join(evidence, 'node-only-server-dependencies.log'), serverDependencyPaths);
    assert.equal(serverDependencies.status, 0, `Core package must provide passport and express-session to its server entries:\n${serverDependencyPaths}`);
    assert.match(serverDependencyPaths, /node_modules[/\\]passport[/\\]/);
    assert.match(serverDependencyPaths, /node_modules[/\\]express-session[/\\]/);
    const missingUiPeer = spawnSync(process.execPath, ['--input-type=module', '-e', "await import('@hmcts/rpx-xui-core-lib/forms/validation')"], { cwd: nodeConsumer, env, encoding: 'utf8' });
    const diagnostic = `${missingUiPeer.stdout ?? ''}${missingUiPeer.stderr ?? ''}`;
    await writeFile(join(evidence, 'node-only-ui-entry.log'), diagnostic);
    assert.equal(missingUiPeer.status, 1, 'A UI entry cannot be imported without its Angular peers');
    assert.match(diagnostic, /Cannot find package ['"]@angular\/forms['"]/);
  });

  await check('package.node-security-optional-peer', async () => {
    await assert.rejects(stat(join(nodeOnlyConsumer, 'node_modules/helmet')), { code: 'ENOENT' });
    const missing = await run('node-security-missing-peer', ['--input-type=module', '-e', "await import('@hmcts/rpx-xui-core-lib/node/server/security');"], nodeOnlyConsumer, 1);
    assert.match(missing, /Cannot find module ['"]helmet['"]/);
    const serverManifest = JSON.parse(await readFile(join(nodeOnlyConsumer, 'package.json'), 'utf8'));
    serverManifest.dependencies.express = '5.2.1';
    await writeFile(join(nodeOnlyConsumer, 'package.json'), JSON.stringify(serverManifest) + '\n');
    await run('node-server-peer-lock', [yarn, 'install', '--mode=update-lockfile'], nodeOnlyConsumer);
    const serverLock = await readFile(join(nodeOnlyConsumer, 'yarn.lock'), 'utf8');
    await run('node-server-peer-install', [yarn, 'install', '--immutable'], nodeOnlyConsumer);
    assert.equal(await readFile(join(nodeOnlyConsumer, 'yarn.lock'), 'utf8'), serverLock);
    await assert.rejects(stat(join(nodeOnlyConsumer, 'node_modules/helmet')), { code: 'ENOENT' });
    await run('server-without-helmet', ['--input-type=commonjs', '-e', "const assert=require('node:assert/strict');const {xuiNode,getLogger}=require('@hmcts/rpx-xui-core-lib/node/server');assert.ok(xuiNode);assert.equal(typeof getLogger,'function');assert.ok(!Object.keys(require.cache).some(path=>path.includes('/node_modules/helmet/')));"], nodeOnlyConsumer);
  });

  await check('package.angular-20_3_31-cohort-build', async () => {
    const uiConsumer = join(scratch, 'angular-20.3.31-consumer');
    await mkdir(uiConsumer, { recursive: true });
    await cp(candidate, join(uiConsumer, 'candidate.tgz'));
    await cp(join(root, 'tests/fixtures/packed-loading'), join(uiConsumer, 'loading-host'), { recursive: true });
    await cp(join(uiConsumer, 'loading-host/angular.json'), join(uiConsumer, 'angular.json'));
    await writeFile(join(uiConsumer, 'loading-host/main.ts'), `
      import { Component, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
      import { bootstrapApplication } from '@angular/platform-browser';
      import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
      import { checkboxesBeCheckedValidator } from '@hmcts/rpx-xui-core-lib/forms/validation';
      @Component({ selector: 'consumer-cohort', template: '<main>{{ form.valid }}</main>' })
      class ConsumerCohort {
        form = new FormGroup({ selected: new FormControl(false, { nonNullable: true }) }, checkboxesBeCheckedValidator());
      }
      bootstrapApplication(ConsumerCohort, { providers: [provideZonelessChangeDetection(), importProvidersFrom(ReactiveFormsModule)] });
    `);
    await writeFile(join(uiConsumer, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
    await writeFile(join(uiConsumer, 'package.json'), `${JSON.stringify({
      name: 'core-lib-angular-cohort-consumer',
      version: '0.0.0',
      private: true,
      type: 'module',
      packageManager: 'yarn@4.18.1',
      dependencies: {
        '@hmcts/rpx-xui-core-lib': 'file:./candidate.tgz',
        '@angular/animations': '20.3.31',
        '@angular/build': '20.3.31',
        '@angular/cdk': '20.2.14',
        '@angular/cli': '20.3.31',
        '@angular/common': '20.3.31',
        '@angular/compiler': '20.3.31',
        '@angular/compiler-cli': '20.3.31',
        '@angular/core': '20.3.31',
        '@angular/forms': '20.3.31',
        '@angular/material': '20.2.14',
        '@angular/platform-browser': '20.3.31',
        rxjs: '7.8.2',
        tslib: '2.8.1',
        typescript: '5.9.3',
      },
    }, null, 2)}\n`);
    await run('angular-cohort-lock', [yarn, 'install', '--mode=update-lockfile'], uiConsumer);
    const lock = await readFile(join(uiConsumer, 'yarn.lock'), 'utf8');
    await run('angular-cohort-install', [yarn, 'install', '--immutable'], uiConsumer);
    assert.equal(await readFile(join(uiConsumer, 'yarn.lock'), 'utf8'), lock);
    await run('angular-cohort-build', [join(uiConsumer, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'loading-host'], uiConsumer);
    assert.ok((await stat(join(uiConsumer, 'loading-dist/browser/index.html'))).isFile());
  });

  await cp(join(root, 'tests/fixtures/package'), consumer, { recursive: true });
  await cp(candidate, join(consumer, 'candidate.tgz'));
  const manifest = JSON.parse(await readFile(join(consumer, 'package.json'), 'utf8'));
  manifest.dependencies['@hmcts/rpx-xui-core-lib'] = 'file:./candidate.tgz';
  manifest.dependencies['rpx-xui-translation'] = 'file:./translation-facade';
  await writeFile(join(consumer, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  // Freeze this build's tarball checksum without re-resolving the committed cohort.
  await run('candidate-lock', [yarn, 'install', '--mode=update-lockfile'], consumer);
  const locked = await readFile(join(consumer, 'yarn.lock'), 'utf8');
  await cp(join(consumer, 'package.json'), join(evidence, 'package.json'));
  await cp(join(consumer, 'yarn.lock'), join(evidence, 'yarn.lock'));
  await run('install-immutable', [yarn, 'install', '--immutable'], consumer);
  assert.equal(await readFile(join(consumer, 'yarn.lock'), 'utf8'), locked);

  const installed = join(consumer, 'node_modules/@hmcts/rpx-xui-core-lib');
  assert.equal((await lstat(installed)).isSymbolicLink(), false, 'Candidate must be installed, never a workspace link');
  assert.equal(await realpath(installed), installed);
  assert.ok((await stat(join(installed, declaration))).isFile());
  assert.equal(JSON.parse(await readFile(join(installed, 'node/package.json'), 'utf8')).type, 'commonjs', 'Packed Node marker must survive installation');
  const compiler = join(consumer, 'node_modules/typescript/bin/tsc');
  await check('package.strict-node', () => run('strict-node', [compiler, '-p', 'tsconfig.node.json'], consumer));
  for (const entry of ['node', 'server', 'auth', 'session', 'security', 'logging']) {
    await check(`package.strict-node-${entry}-types`, () => run(`strict-node-${entry}-types`, [
      compiler, '--strict', '--skipLibCheck', 'false', '--esModuleInterop', '--target', 'ES2022',
      '--module', 'ES2022', '--moduleResolution', 'node', '--noEmit', ...(entry === 'node' ? ['--types', 'node'] : []), `node-${entry}-types.ts`,
    ], consumer));
  }
  await check('package.strict-bundler', () => run('strict-bundler', [compiler, '-p', 'tsconfig.bundler.json'], consumer));
  await check('package.node-logging-isolation', async () => {
    const result = buildSync({ entryPoints: ['node-logging-types.ts'], absWorkingDir: consumer, bundle: true,
      platform: 'node', format: 'cjs', write: false, metafile: true, logLevel: 'silent' });
    const inputs = Object.keys(result.metafile.inputs).map(path => path.replaceAll('\\', '/'));
    assert.ok(!inputs.some(path => /\/node\/server\/(?:auth|session|security)\//.test(path)), 'Logging graph must exclude other server capabilities');
    assert.ok(!inputs.some(path => /\/node_modules\/(?:passport|redis|helmet|@angular)\//.test(path)), 'Logging graph must exclude unrelated dependencies');
    await writeFile(join(evidence, 'node-logging-metafile.json'), JSON.stringify(result.metafile, null, 2));
    await run('node-logging-runtime', ['node-logging-runtime.cjs'], consumer);
    const denied = await run('node-logging-browser-denied', ['--conditions=browser', 'node-logging-runtime.cjs'], consumer, 1);
    assert.match(denied, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
    assert.throws(() => buildSync({ stdin: { contents: "import {getLogger} from '@hmcts/rpx-xui-core-lib/node/server/logging'; console.log(getLogger);", resolveDir: consumer },
      absWorkingDir: consumer, bundle: true, platform: 'browser', write: false, logLevel: 'silent' }), /Could not resolve/);
  });
  await check('package.node-logging-loading-fault', async () => {
    const file = join(installed, 'node/server/logging/index.js');
    const original = await readFile(file);
    try {
      await writeFile(file, Buffer.concat([original, Buffer.from("\nrequire('../auth');\n")]));
      const diagnostic = await run('node-logging-loading-fault', ['node-logging-runtime.cjs'], consumer, 1);
      assert.match(diagnostic, /Logger entry must not load authentication, session or security code/);
    } finally { await writeFile(file, original); }
    await run('node-logging-restored', ['node-logging-runtime.cjs'], consumer);
  });

  await check('package.node-security-consumer-contracts', async () => {
    const compiled = buildSync({ entryPoints: ['node-security-types.ts'], absWorkingDir: consumer, bundle: true,
      platform: 'node', format: 'cjs', packages: 'external', metafile: true, outfile: join(consumer, 'node-security-config.cjs') });
    for (const app of ['mc', 'mo', 'ao']) assert.ok(Object.keys(compiled.metafile.inputs).some(path => path.endsWith(`node-csp-config/${app}.ts`)));
    await run('node-security-consumer-runtime', ['node-security-runtime.mjs'], consumer);
  });

  for (const fault of [
    { id: 'nonce', original: "node_crypto_1.default.randomBytes(16).toString('base64')", replacement: "'reused-test-nonce'", reason: /different response nonces/ },
    { id: 'header', original: "`'nonce-${nonce}'`", replacement: JSON.stringify("'nonce-omitted'"), reason: /CSP header must contain rendered nonce/ },
    { id: 'merge', original: '[...previous, ...values]', replacement: 'values', reason: /CSP merge must retain default script sources/ },
  ]) {
    await check(`package.node-security-${fault.id}-fault`, async () => {
      const entry = join(installed, 'node/server/security/csp.js');
      const original = await readFile(entry, 'utf8');
      assert.ok(original.includes(fault.original), 'Missing intended CSP fault target');
      try {
        await writeFile(entry, original.replaceAll(fault.original, fault.replacement));
        const diagnostic = await run(`node-security-${fault.id}-fault`, ['node-security-runtime.mjs'], consumer, 1);
        assert.match(diagnostic, fault.reason);
      } finally { await writeFile(entry, original); }
    });
  }
  await check('package.node-security-restored', () => run('node-security-restored', ['node-security-runtime.mjs'], consumer));
  await check('package.node-security-browser-denied', async () => {
    const diagnostic = await run('browser-condition-security-denied', ['--conditions=browser', '--input-type=module', '-e', "await import('@hmcts/rpx-xui-core-lib/node/server/security');"], consumer, 1);
    assert.match(diagnostic, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
    assert.throws(() => buildSync({ stdin: { contents: "import {csp} from '@hmcts/rpx-xui-core-lib/node/server/security'; console.log(csp);", resolveDir: consumer },
      absWorkingDir: consumer, bundle: true, platform: 'browser', write: false, logLevel: 'silent' }), /Could not resolve/);
  });

  for (const version of ['8.1.0', '8.2.0']) {
    const label = `helmet-${version.replaceAll('.', '_')}`;
    await check(`package.${label}-cohort`, async () => {
      const cohort = join(scratch, label);
      await cp(join(root, 'tests/fixtures/package'), cohort, { recursive: true });
      await cp(candidate, join(cohort, 'candidate.tgz'));
      const providers = ['@types/express', '@types/express-session', '@types/node', '@types/passport', '@types/passport-oauth2', 'express'];
      const dependencies = Object.fromEntries(providers.map(name => [name, manifest.dependencies[name]]));
      await writeFile(join(cohort, 'package.json'), JSON.stringify({ name: label.replaceAll('_', '-'), private: true, type: 'module', packageManager: 'yarn@4.18.1',
        dependencies: { ...dependencies, '@hmcts/rpx-xui-core-lib': 'file:./candidate.tgz', helmet: version } }) + '\n');
      await writeFile(join(cohort, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
      await run(`${label}-lock`, [yarn, 'install', '--mode=update-lockfile'], cohort);
      const lock = await readFile(join(cohort, 'yarn.lock'), 'utf8');
      await run(`${label}-install`, [yarn, 'install', '--immutable', '--mode=skip-build'], cohort);
      assert.equal(await readFile(join(cohort, 'yarn.lock'), 'utf8'), lock);
      await cp(join(cohort, 'package.json'), join(evidence, `${label}-package.json`));
      await writeFile(join(evidence, `${label}-yarn.lock`), lock);
      await run(`${label}-version`, ['--input-type=commonjs', '-e', "const assert=require('node:assert/strict');const {createRequire}=require('node:module');const fromCore=createRequire(require.resolve('@hmcts/rpx-xui-core-lib/node/server/security'));assert.equal(fromCore('helmet'),require('helmet'));assert.equal(require('./node_modules/helmet/package.json').version,process.argv[1]);", version], cohort);
      await run(`${label}-types`, [compiler, '--strict', '--skipLibCheck', 'false', '--esModuleInterop', '--target', 'ES2022', '--module', 'ES2022', '--moduleResolution', 'node', '--noEmit', 'node-security-types.ts'], cohort);
      buildSync({ entryPoints: ['node-security-types.ts'], absWorkingDir: cohort, bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: join(cohort, 'node-security-config.cjs') });
      await run(`${label}-http`, ['node-security-runtime.mjs'], cohort);
      await run(`${label}-audit`, [yarn, 'npm', 'audit', '--all', '--recursive', '--json'], cohort);
      const browserReport = join(evidence, `${label}-browser.json`);
      const config = { testDir: join(root, 'tests/browser/node-security'), testMatch: 'csp.spec.mjs', forbidOnly: true, workers: 1, retries: 0,
        timeout: 15000, outputDir: join(evidence, `${label}-browser-artifacts`), reporter: [['line'], ['json', { outputFile: browserReport }]],
        projects: [{ name: 'chromium', use: { browserName: 'chromium', headless: true } }] };
      const configFile = join(cohort, 'playwright.config.cjs');
      await writeFile(configFile, `process.env.CORE_CSP_HOST_MODULE=${JSON.stringify(pathToFileURL(join(cohort, 'node-security-host.mjs')).href)};\nmodule.exports=${JSON.stringify(config)};\n`);
      await run(`${label}-browser`, [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '-c', configFile], cohort);
      const outcomes = browserOutcomes(JSON.parse(await readFile(browserReport, 'utf8')));
      const expected = JSON.parse(await readFile(join(root, 'tests/contracts.json'), 'utf8')).browser.required.filter(test => test.feature === 'node-security');
      assert.ok(expected.length > 0, 'CSP cohort must have required browser cases');
      assert.equal(outcomes.length, expected.length, 'CSP cohort must execute every registered browser case');
      assert.ok(outcomes.every(test => test.passed), 'CSP cohort cannot pass with skipped, retried or failed browser cases');
      for (const test of expected) assert.equal(outcomes.filter(result => result.id === JSON.stringify([test.projectName, test.title])).length, 1, 'CSP cohort required browser case missing or duplicated');
    });
  }

  await check('package.loading-angular-build', async () => {
    await cp(join(root, 'tests/fixtures/packed-loading'), join(consumer, 'loading-host'), { recursive: true });
    await cp(join(consumer, 'loading-host/angular.json'), join(consumer, 'angular.json'));
    await symlink(join(root, 'node_modules/@angular/build'), join(consumer, 'node_modules/@angular/build'), 'dir');
    await run('loading-angular-build', [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'loading-host'], consumer, 0, 10 * 60_000);
    const directory = join(consumer, 'loading-dist/browser');
    const graph = inspectLoadingGraph(directory);
    const mapFile = join(directory, graph.date + '.map');
    const mapBytes = await readFile(mapFile);
    try { await rm(mapFile); assert.throws(() => inspectLoadingGraph(directory), /ENOENT/); } finally { await writeFile(mapFile, mapBytes); }
    await cp(join(consumer, 'loading-dist'), join(evidence, 'loading-dist'), { recursive: true });
    await writeFile(join(evidence, 'loading-graph.json'), JSON.stringify({ ...graph, ...currentIdentity(root), sourceSnapshot: sourceSnapshot(root), candidateSha256: report.package.sha256 }) + '\n');
    for (const entry of ['forms-validation', 'case-editor-date', 'case-session-error']) {
      const name = 'fesm2022/hmcts-rpx-xui-core-lib-' + entry + '.mjs';
      const extracted = spawnSync('/usr/bin/tar', ['-xOf', candidate, 'package/' + name]);
      assert.equal(extracted.status, 0, 'Packed entry must be extractable');
      const installedBytes = await readFile(join(installed, name));
      assertPackedBytes(installedBytes, extracted.stdout);
      assert.throws(() => assertPackedBytes(Buffer.concat([installedBytes, Buffer.from('fault')]), extracted.stdout), /differ/);
    }
    env.CORE_LOADING_HOST = directory;
    env.CORE_LOADING_ID = randomUUID();
    env.CORE_LOADING_REPORT = join(evidence, 'loading-browser.json');
    env.CORE_LOADING_OUTPUT = join(evidence, 'loading-browser');
    env.CORE_DATE_CHUNK = graph.date;
    env.CORE_SESSION_CHUNK = graph.session;
    try {
      await run('loading-browser', [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '-c', join(root, 'tests/packed-loading/playwright.config.mjs')], root);
    } finally {
      for (const key of ['CORE_LOADING_HOST', 'CORE_LOADING_ID', 'CORE_LOADING_REPORT', 'CORE_LOADING_OUTPUT', 'CORE_DATE_CHUNK', 'CORE_SESSION_CHUNK']) delete env[key];
    }
  });

  await check('package.loading-eager-fault', async () => {
    const main = join(consumer, 'loading-host/main.ts');
    const original = await readFile(main, 'utf8');
    try {
      await writeFile(main, original + "\nimport { DateInputComponent } from '@hmcts/rpx-xui-core-lib/case/editor-date';\nconsole.log(DateInputComponent);\n");
      await run('loading-eager-mutant-build', [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'loading-host', '--output-path', 'loading-mutant'], consumer);
      let detected = false;
      try { inspectLoadingGraph(join(consumer, 'loading-mutant/browser')); } catch (error) {
        assert.match(error.message, /Date entry must not be in the initial static graph/);
        detected = true;
      }
      const directory = join(consumer, 'loading-mutant/browser');
      const files = (await readdir(directory)).filter(file => file.endsWith('.js.map'));
      const findChunk = async suffix => {
        const matches = [];
        for (const file of files) {
          const map = JSON.parse(await readFile(join(directory, file), 'utf8'));
          if (map.sources.some(source => source.endsWith(suffix))) matches.push(file.slice(0, -4));
        }
        assert.equal(matches.length, 1, 'Expected exactly one mutant source map');
        return matches[0];
      };
      env.CORE_LOADING_HOST = directory;
      env.CORE_LOADING_ID = randomUUID();
      env.CORE_LOADING_REPORT = join(evidence, 'loading-eager-browser.json');
      env.CORE_LOADING_OUTPUT = join(evidence, 'loading-eager-browser');
      env.CORE_DATE_CHUNK = await findChunk('/hmcts-rpx-xui-core-lib-case-editor-date.mjs');
      env.CORE_SESSION_CHUNK = await findChunk('/hmcts-rpx-xui-core-lib-case-session-error.mjs');
      try {
        await run('loading-eager-browser', [join(root, 'node_modules/@playwright/test/cli.js'), 'test', '-c', join(root, 'tests/packed-loading/playwright.config.mjs')], root, 1);
        assertEagerDateFailure(JSON.parse(await readFile(env.CORE_LOADING_REPORT, 'utf8')));
      } finally {
        for (const key of ['CORE_LOADING_HOST', 'CORE_LOADING_ID', 'CORE_LOADING_REPORT', 'CORE_LOADING_OUTPUT', 'CORE_DATE_CHUNK', 'CORE_SESSION_CHUNK']) delete env[key];
      }
      assert.equal(detected, true, 'Eager date import must fail the graph check');
      await writeFile(join(evidence, 'loading-eager-fault.json'), JSON.stringify({ detected, reason: 'Date entry must not be in the initial static graph', candidateSha256: report.package.sha256 }) + '\n');
    } finally {
      await writeFile(main, original);
    }
  });

  await check('package.installed-runtime', async () => {
    await run('installed-runtime', ['runtime.mjs'], consumer);
    for (const entry of sourceLicenceEntries) {
      assert.equal(await readFile(join(installed, entry, 'LICENCE'), 'utf8'), await readFile(join(root, 'projects/core-lib', entry, 'LICENCE'), 'utf8'), 'Copied source licence must survive immutable installation');
    }
  });

  const graph = () => {
    const result = buildSync({ entryPoints: ['validation-graph.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const used = Object.values(result.metafile.outputs).flatMap((output) => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
    assert.ok(used.some((path) => path.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-forms-validation.mjs')), 'Installed validation FESM must contribute bytes');
    assert.ok(!used.some((path) => /hmcts-rpx-xui-core-lib-i18n\.mjs|(?:^|\/)dexie(?:\/|$)|(?:^|\/)luxon(?:\/|$)|(?:^|\/)node(?:\/|$)|^node:/.test(path)), 'Validation graph must exclude i18n, Dexie, Luxon and Node');
    return result.metafile;
  };
  await cp(join(root, 'tests/loading-state/loading-state.test.mjs'), join(consumer, 'loading-state.test.mjs'));
  await check('package.loading-state-behavior', () => run('loading-state-behavior', ['--test', 'loading-state.test.mjs'], consumer));

  await check('package.loading-state-graph', async () => {
    const result = buildSync({ entryPoints: ['loading-state-graph.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
    assert.ok(used.some(path => path.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-ui-loading-state.mjs')));
    assert.ok(!used.some(path => /hmcts-rpx-xui-core-lib-(?:ui-loading-spinner|ui-contact-details|ui-due-date|ui-accessibility|case-|forms-|i18n)|(?:^|\/)node(?:\/|$)|^node:/.test(path)));
  });

  await cp(join(root, 'tests/find-person/find-person.test.mjs'), join(consumer, 'find-person.test.mjs'));
  await cp(join(root, 'tests/find-person-component/contracts.test.mjs'), join(consumer, 'find-person-component-contracts.test.mjs'));
  await cp(join(root, 'tests/find-person-component/stale.test.mjs'), join(consumer, 'find-person-component-stale.test.mjs'));
  await cp(join(root, 'tests/find-person-component/reuse.test.mjs'), join(consumer, 'find-person-component-reuse.test.mjs'));
  await check('package.find-person-behavior', () => run('find-person-behavior', ['--test', 'find-person.test.mjs', 'find-person-component-contracts.test.mjs', 'find-person-component-stale.test.mjs', 'find-person-component-reuse.test.mjs'], consumer));

  await cp(join(root, 'tests/session-storage/session-storage.test.mjs'), join(consumer, 'session-storage.test.mjs'));
  await check('package.session-storage-behavior', () => run('session-storage-behavior', ['--test', 'session-storage.test.mjs'], consumer));
  await check('package.session-storage-graph', async () => {
    const graph = (contents) => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verifyStorageGraph = result => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
      const core = used.filter(path => path.includes('/@hmcts/rpx-xui-core-lib/'));
      assert.equal(core.length, 1, 'Storage graph must contain exactly one core module');
      assert.ok(core[0].endsWith('/fesm2022/hmcts-rpx-xui-core-lib-browser-session-storage.mjs'));
      assert.ok(!used.some(path => /(?:^|\/)node(?:\/|$)|^node:/.test(path)), 'Storage entry must not pull Node capabilities');
    };
    const source = await readFile(join(consumer, 'session-storage-graph.mjs'), 'utf8');
    verifyStorageGraph(graph(source));
    assert.throws(() => verifyStorageGraph(graph(`${source}\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);`)), /exactly one core module/);
  });

  await cp(join(root, 'tests/task-data/task-data.test.mjs'), join(consumer, 'task-data.test.mjs'));
  await check('package.task-data-behavior', () => run('task-data-behavior', ['--test', 'task-data.test.mjs'], consumer));
  await check('package.task-data-graph', async () => {
    const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verify = result => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
      const core = used.filter(path => path.includes('/@hmcts/rpx-xui-core-lib/'));
      assert.equal(core.length, 2, 'Task graph must contain task and storage core modules');
      assert.ok(core.some(path => path.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-ui-task-data.mjs')));
      assert.ok(core.some(path => path.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-browser-session-storage.mjs')));
      assert.ok(!used.some(path => /(?:^|\/)node(?:\/|$)|^node:/.test(path)));
    };
    const source = await readFile(join(consumer, 'task-data-graph.mjs'), 'utf8');
    verify(graph(source));
    assert.throws(() => verify(graph(`${source}\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);`)), /task and storage/);
  });

  await check('package.case-sharing-state-graph', async () => {
    const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verify = result => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([path]) => path.replaceAll('\\', '/')));
      const core = used.filter(path => path.includes('/@hmcts/rpx-xui-core-lib/'));
      assert.equal(core.length, 1, 'Case sharing state graph must contain exactly one core module');
      assert.ok(core[0].endsWith('/fesm2022/hmcts-rpx-xui-core-lib-case-sharing-state.mjs'));
      assert.ok(!used.some(path => /(?:^|\/)node(?:\/|$)|^node:/.test(path)));
    };
    const source = await readFile(join(consumer, 'case-sharing-state-graph.mjs'), 'utf8');
    verify(graph(source));
    assert.throws(() => verify(graph(`${source}\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);`)), /exactly one core module/);
  });

  await cp(join(root, 'tests/case-sharing/state.test.mjs'), join(consumer, 'case-sharing-state.test.mjs'));
  await check('package.case-sharing-state-behavior', () => run('case-sharing-state-behavior', ['--test', 'case-sharing-state.test.mjs'], consumer));

  await cp(join(root, 'tests/cookie/cookie.test.mjs'), join(consumer, 'cookie.test.mjs'));
  await check('package.cookie-behavior', () => run('cookie-behavior', ['--test', 'cookie.test.mjs'], consumer));


  await check('package.terms-type', async () => {
    await run('terms-type-node', [compiler, '-p', 'tsconfig.terms-node.json'], consumer);
    await run('terms-type-bundler', [compiler, '-p', 'tsconfig.terms-bundler.json'], consumer);
  });
  await check('package.terms-graph', async () => {
    const result = buildSync({ entryPoints: ['terms-graph.ts'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const inputs = Object.keys(result.metafile.inputs).map(path => path.replaceAll('\\', '/'));
    assert.ok(!inputs.some(path => path.includes('@hmcts/rpx-xui-core-lib') || /(?:^|\/)node(?:\/|$)|^node:/.test(path)), 'A type-only consumer must not include Core runtime modules');
    await run('terms-runtime-empty', ['terms-runtime.mjs'], consumer);
  });

  await cp(join(root, 'tests/window/window.test.mjs'), join(consumer, 'window.test.mjs'));
  await check('package.window-behavior', () => run('window-behavior', ['--test', 'window.test.mjs'], consumer));


  await cp(join(root, 'tests/locations/location.test.mjs'), join(consumer, 'location.test.mjs'));
  await check('package.locations-behavior', () => run('locations-behavior', ['--test', 'location.test.mjs'], consumer));


  await cp(join(root, 'tests/ref-data/ref-data.test.mjs'), join(consumer, 'ref-data.test.mjs'));
  await check('package.ref-data-behavior', () => run('ref-data-behavior', ['--test', 'ref-data.test.mjs'], consumer));


  await cp(join(root, 'tests/task-lookups/stale.test.mjs'), join(consumer, 'task-lookups.test.mjs'));
  await check('package.task-lookups-behavior', () => run('task-lookups-behavior', ['--test', 'task-lookups.test.mjs'], consumer));

  /** @type {Array<[string, string, string[]]>} */
  const selectiveEntries = [
    ['find-task-name', 'find-task-name-graph.mjs', ['ui-find-task-name', 'ui-task-data', 'browser-session-storage', 'i18n']],
    ['search-work-type', 'search-work-type-graph.mjs', ['ui-search-work-type', 'ui-task-data', 'browser-session-storage', 'i18n']],
    ['find-work-type', 'find-work-type-graph.mjs', ['ui-find-work-type', 'ui-search-work-type', 'ui-task-data', 'browser-session-storage', 'i18n']],
    ['find-person', 'find-person-graph.mjs', ['ui-find-person', 'browser-session-storage', 'i18n']],
    ['cookie', 'cookie-graph.mjs', ['ui-cookie']],
    ['window', 'window-graph.mjs', ['browser-window']],
    ['search-location', 'search-location-graph.mjs', ['ui-search-location', 'reference-locations', 'reference-ref-data', 'browser-session-storage', 'i18n']],
    ['gov-input', 'gov-input-graph.mjs', ['ui-gov-input', 'i18n']],
    ['checkbox-list', 'checkbox-list-graph.mjs', ['ui-checkbox-list', 'i18n']],
    ['gov-date', 'gov-date-graph.mjs', ['ui-gov-date', 'ui-gov-input', 'i18n']],
    ['gov-select', 'gov-select-graph.mjs', ['ui-gov-select', 'ui-gov-input', 'i18n']],
    ['locations', 'location-graph.mjs', ['reference-locations']],
    ['ref-data', 'ref-data-graph.mjs', ['reference-ref-data']],
    ['feature-toggle', 'feature-toggle-graph.mjs', ['ui-feature-toggle']],
    ['feature-directive', 'feature-directive-graph.mjs', ['ui-feature-toggle-directive', 'ui-feature-toggle']],
    ['role-state', 'role-state-graph.mjs', ['ui-role-state']],
  ];
  for (const [id, file, entries] of selectiveEntries) {
    await check('package.' + id + '-graph', async () => {
      const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
      const verify = result => {
        const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
        const core = used.filter(input => input.includes('/@hmcts/rpx-xui-core-lib/'));
        assert.equal(core.length, entries.length, 'Unexpected Core entries in graph');
        for (const entry of entries) assert.ok(core.some(input => input.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-' + entry + '.mjs')));
        assert.ok(!used.some(input => /(?:^|\/)node(?:\/|$)|^node:/.test(input)));
        if (id === 'gov-input') assert.ok(!used.some(input => input.includes('@angular/router')));
      };
      const source = await readFile(join(consumer, file), 'utf8');
      verify(graph(source));
      const extra = id === 'window' ? "\nimport { CookieService } from '@hmcts/rpx-xui-core-lib/ui/cookie'; console.log(CookieService);" : "\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);";
      assert.throws(() => verify(graph(source + extra)), /Unexpected Core entries/);
    });
  }
  await cp(join(root, 'tests/feature-toggle/feature-toggle.test.mjs'), join(consumer, 'feature-toggle.test.mjs'));
  await check('package.feature-toggle-behavior', () => run('feature-toggle-behavior', ['--test', 'feature-toggle.test.mjs'], consumer));
  await cp(join(root, 'tests/roles/roles.test.mjs'), join(consumer, 'roles.test.mjs'));
  await check('package.role-state-behavior', () => run('role-state-behavior', ['--test', 'roles.test.mjs'], consumer));

  await check('package.gov-input-behavior', () => run('gov-input-behavior', ['--test', 'gov-input-behavior.test.mjs'], consumer));
  await cp(join(root, 'tests/gov-date/lifecycle.test.mjs'), join(consumer, 'gov-date-lifecycle.test.mjs'));
  await check('package.gov-date-behavior', () => run('gov-date-behavior', ['--test', 'gov-date-lifecycle.test.mjs'], consumer));

  await check('package.terms-display-graph', async () => {
    const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verify = result => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
      const core = used.filter(input => input.includes('/@hmcts/rpx-xui-core-lib/'));
      assert.deepEqual(core.map(input => input.split('/').at(-1)).sort((a, b) => a.localeCompare(b)), ['hmcts-rpx-xui-core-lib-i18n.mjs', 'hmcts-rpx-xui-core-lib-terms-display.mjs']);
      assert.ok(!used.some(input => /(?:^|\/)node(?:\/|$)|^node:|@angular\/router/.test(input)));
    };
    const source = await readFile(join(consumer, 'terms-display-graph.mjs'), 'utf8');
    verify(graph(source));
    assert.throws(() => verify(graph(source + "\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);")));
  });

  await check('package.editor-date-graph', async () => {
    const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verify = result => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
      const core = used.filter(input => input.includes('/@hmcts/rpx-xui-core-lib/'));
      assert.equal(core.length, 2, 'Date graph must contain date and translation entries only');
      for (const entry of ['case-editor-date', 'i18n']) assert.ok(core.some(input => input.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-' + entry + '.mjs')));
      assert.ok(!used.some(input => /(?:^|\/)node(?:\/|$)|^node:/.test(input)));
    };
    const source = await readFile(join(consumer, 'editor-date-graph.mjs'), 'utf8');
    verify(graph(source));
    assert.throws(() => verify(graph(source + "\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);")), /date and translation entries only/);
  });

  await check('package.session-error-graph', async () => {
    const graph = contents => buildSync({ stdin: { contents, resolveDir: consumer }, absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const verify = result => {
      const used = Object.values(result.metafile.outputs).flatMap(output => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
      const core = used.filter(input => input.includes('/@hmcts/rpx-xui-core-lib/'));
      assert.equal(core.length, 1, 'Session error graph must contain only its own Core entry');
      assert.ok(core[0].endsWith('/fesm2022/hmcts-rpx-xui-core-lib-case-session-error.mjs'));
      assert.ok(!used.some(input => /(?:^|\/)node(?:\/|$)|^node:|@angular\/router/.test(input)));
    };
    const source = await readFile(join(consumer, 'session-error-graph.mjs'), 'utf8');
    verify(graph(source));
    assert.throws(() => verify(graph(source + "\nimport { windowToken } from '@hmcts/rpx-xui-core-lib/browser/window'; console.log(windowToken);")), /only its own Core entry/);
  });

  await check('package.sharing-graph', async () => {
    const result = buildSync({ entryPoints: ['sharing-graph.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const used = Object.values(result.metafile.outputs).flatMap((output) => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
    assert.ok(used.some((input) => input.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-case-sharing.mjs')));
    assert.ok(!used.some((input) => /hmcts-rpx-xui-core-lib-(?:i18n|case-models|case-reference|ui-|forms-)|(?:^|\/)dexie(?:\/|$)|(?:^|\/)luxon(?:\/|$)|(?:^|\/)@angular(?:\/|$)/.test(input)), 'Case sharing must not pull unrelated capabilities');
    await writeFile(join(evidence, 'sharing-metafile.json'), JSON.stringify(result.metafile, null, 2));
  });
  await check('package.due-date-graph', async () => {
    const result = buildSync({ entryPoints: ['due-date-graph.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const used = Object.values(result.metafile.outputs).flatMap((output) => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
    assert.ok(used.some((input) => input.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-ui-due-date.mjs')), 'Due-date entry must contribute bytes');
    assert.ok(!used.some((input) => /hmcts-rpx-xui-core-lib-(?:ui-contact-details|ui-loading-spinner|ui-accessibility|case-|forms-)|(?:^|\/)node(?:\/|$)|^node:/.test(input)), 'Due-date graph must not pull unrelated capabilities');
    await writeFile(join(evidence, 'due-date-metafile.json'), JSON.stringify(result.metafile, null, 2));
  });
  await check('package.accessibility-graph', async () => {
    const result = buildSync({ entryPoints: ['accessibility-graph.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const used = Object.values(result.metafile.outputs).flatMap((output) => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
    assert.ok(used.some((input) => input.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-ui-accessibility.mjs')), 'Accessibility entry must contribute bytes');
    assert.ok(!used.some((input) => /hmcts-rpx-xui-core-lib-(?:ui-contact-details|ui-loading-spinner|ui-due-date|case-|forms-)|(?:^|\/)node(?:\/|$)|^node:/.test(input)), 'Accessibility graph must not pull unrelated capabilities');
    await writeFile(join(evidence, 'accessibility-metafile.json'), JSON.stringify(result.metafile, null, 2));
  });
  await check('package.session-dialog-graph', async () => {
    const result = buildSync({ entryPoints: ['session-dialog-graph.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
    const used = Object.values(result.metafile.outputs).flatMap((output) => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
    assert.ok(used.some(input => input.endsWith('/fesm2022/hmcts-rpx-xui-core-lib-ui-session-dialog.mjs')));
    assert.ok(!used.some(input => /hmcts-rpx-xui-core-lib-(?:ui-contact-details|ui-loading-spinner|ui-accessibility|ui-due-date|case-|forms-)|(?:^|\/)node(?:\/|$)|^node:/.test(input)));
    await writeFile(join(evidence, 'session-dialog-metafile.json'), JSON.stringify(result.metafile, null, 2));
  });
  await check('package.primitives-entry-graphs', async () => {
    for (const entry of ['banner', 'form-label']) {
      const result = buildSync({ entryPoints: [`${entry}-graph.mjs`], absWorkingDir: consumer, bundle: true, platform: 'browser', format: 'esm', metafile: true, write: false, logLevel: 'silent' });
      const used = Object.values(result.metafile.outputs).flatMap((output) => Object.entries(output.inputs).filter(([, value]) => value.bytesInOutput > 0).map(([input]) => input.replaceAll('\\', '/')));
      assert.ok(used.some(input => input.endsWith(`/fesm2022/hmcts-rpx-xui-core-lib-ui-${entry}.mjs`)));
      const other = entry === 'banner' ? 'form-label' : 'banner';
      assert.ok(!used.some(input => input.endsWith(`/fesm2022/hmcts-rpx-xui-core-lib-ui-${other}.mjs`)));
      assert.ok(!used.some(input => /hmcts-rpx-xui-core-lib-(?:ui-contact-details|ui-loading-spinner|ui-accessibility|ui-due-date|ui-session-dialog|case-|forms-)|(?:^|\/)node(?:\/|$)|^node:/.test(input)));
      assert.ok(!used.some(input => /(?:^|\/)govuk-frontend(?:\/|$)/.test(input)), 'Compiled styles must not require GOV.UK frontend at runtime');
      await writeFile(join(evidence, `${entry}-metafile.json`), JSON.stringify(result.metafile, null, 2));
    }
  });
  await check('package.root-runtime-empty', () => run('root-runtime-empty', ['runtime-root.mjs'], consumer));
  await check('package.validation-graph', async () => {
    await writeFile(join(evidence, 'validation-metafile.json'), JSON.stringify(graph(), null, 2));
  });

  const canonicalManifest = await readFile(join(consumer, 'package.json'));
  async function faultCandidate(name, relative, mutate, probe) {
    const faulty = join(scratch, name);
    await cp(staged, faulty, { recursive: true });
    const file = join(faulty, relative);
    await writeFile(file, mutate(await readFile(file, 'utf8')));
    const archive = join(consumer, `${name}.tgz`);
    await run(`pack-${name}`, [yarn, 'pack', '--out', archive], faulty);
    await cp(archive, join(evidence, `${name}.tgz`));
    manifest.dependencies['@hmcts/rpx-xui-core-lib'] = `file:./${name}.tgz`;
    await writeFile(join(consumer, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    try {
      await run(`${name}-lock`, [yarn, 'install', '--mode=update-lockfile'], consumer);
      await run(`${name}-install`, [yarn, 'install', '--immutable'], consumer);
      await probe();
    } finally {
      await writeFile(join(consumer, 'package.json'), canonicalManifest);
      await writeFile(join(consumer, 'yarn.lock'), locked);
      await run(`${name}-restore`, [yarn, 'install', '--immutable'], consumer);
    }
  }
  await check('package.root-export-fault', () => faultCandidate('root-export-fault', 'fesm2022/hmcts-rpx-xui-core-lib.mjs', (text) => `${text}\nexport const unexpected = true;\n`, async () => {
    const diagnostic = await run('root-export-red', ['runtime-root.mjs'], consumer, 1);
    assert.match(diagnostic, /AssertionError/);
  }));
  await check('package.validation-i18n-fault', () => faultCandidate('validation-i18n-fault', 'fesm2022/hmcts-rpx-xui-core-lib-forms-validation.mjs', (text) => `import { RpxTranslationService } from './hmcts-rpx-xui-core-lib-i18n.mjs';\n${text.replace('return function validate(formGroup) {', 'return function validate(formGroup) { new RpxTranslationService();')}`, async () => {
    assert.throws(graph, /Validation graph must exclude/);
    await writeFile(join(evidence, 'validation-i18n-red.log'), 'Validation graph rejected real i18n runtime call\n');
  }));
  await check('package.restored-runtime-graph', async () => {
    await run('restored-root-runtime', ['runtime-root.mjs'], consumer);
    graph();
  });

  await check('package.staged-i18n-identity', () => run('staged-i18n-identity', ['i18n-runtime.mjs'], consumer));
  await check('package.installed-node-runtime', () => run('installed-node-runtime', ['node-runtime.cjs'], consumer));
  await check('package.installed-node-http', () => run('installed-node-http', ['node-http.cjs'], consumer));
  await check('package.node-loading-fault', async () => {
    const entry = join(installed, 'node/index.js');
    const original = await readFile(entry, 'utf8');
    const fault = join(installed, 'node/legacy/auth/loading-fault.cjs');
    await mkdir(dirname(fault), { recursive: true });
    await writeFile(fault, 'module.exports = {};\n', { flag: 'wx' });
    try {
      await writeFile(entry, `require('./legacy/auth/loading-fault.cjs');\n${original}`);
      const diagnostic = await run('node-loading-fault', ['node-runtime.cjs'], consumer, 1);
      assert.match(diagnostic, /Lightweight Node entry must not load authentication or session dependencies/);
    } finally {
      await writeFile(entry, original);
      await rm(fault, { force: true });
    }
  });
  await check('package.browser-denied', async () => {
    const diagnostic = await run('browser-condition-denied', ['--conditions=browser', 'node-runtime.cjs'], consumer, 1);
    assert.match(diagnostic, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
    const httpDiagnostic = await run('browser-condition-http-denied', ['--conditions=browser', 'node-http-browser.mjs'], consumer, 1);
    assert.match(httpDiagnostic, /ERR_PACKAGE_PATH_NOT_EXPORTED/);
    try {
      buildSync({ entryPoints: ['node-http-browser.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', write: false, logLevel: 'silent' });
      assert.fail('Browser bundling must reject the Node HTTP entry');
    } catch (error) {
      await writeFile(join(evidence, 'browser-http-bundle-denied.log'), error.message);
      assert.match(error.message, /Could not resolve "@hmcts\/rpx-xui-core-lib\/node\/http"/);
      assert.match(error.errors[0].notes.map((note) => note.text).join('\n'), /blocked|disabled/);
    }
    try {
      buildSync({ entryPoints: ['node-browser.mjs'], absWorkingDir: consumer, bundle: true, platform: 'browser', write: false, logLevel: 'silent' });
      assert.fail('Browser bundling must reject the Node entry');
    } catch (error) {
      await writeFile(join(evidence, 'browser-bundle-denied.log'), error.message);
      assert.match(error.message, /Could not resolve "@hmcts\/rpx-xui-core-lib\/node"/);
      assert.match(error.errors[0].notes.map((note) => note.text).join('\n'), /blocked|disabled/);
    }
  });

  await check('package.missing-declaration-fault', async () => {
    const faulty = join(scratch, 'missing-declaration-package');
    await cp(staged, faulty, { recursive: true });
    await rm(join(faulty, declaration));
    const faultyCandidate = join(consumer, 'missing-declaration.tgz');
    await run('pack-missing-declaration', [yarn, 'pack', '--out', faultyCandidate], faulty);
    await cp(faultyCandidate, join(evidence, 'missing-declaration.tgz'));
    report.package.missingDeclarationSha256 = createHash('sha256').update(await readFile(faultyCandidate)).digest('hex');
    manifest.dependencies['@hmcts/rpx-xui-core-lib'] = 'file:./missing-declaration.tgz';
    await writeFile(join(consumer, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    try {
      await run('fault-candidate-lock', [yarn, 'install', '--mode=update-lockfile'], consumer);
      await run('fault-install-immutable', [yarn, 'install', '--immutable'], consumer);
      await assert.rejects(stat(join(installed, declaration)), { code: 'ENOENT' });
      const diagnostic = await run('missing-declaration-fault', [compiler, '-p', 'tsconfig.node.json'], consumer, 2);
      assert.match(diagnostic, /TS2307.*@hmcts\/rpx-xui-core-lib\/forms\/validation/);
    } finally {
      await writeFile(join(consumer, 'package.json'), canonicalManifest);
      await writeFile(join(consumer, 'yarn.lock'), locked);
      await run('restore-install-immutable', [yarn, 'install', '--immutable'], consumer);
    }
  });
  await check('package.restored-node', () => run('restored-node', [compiler, '-p', 'tsconfig.node.json'], consumer));
  await check('package.missing-marker-fault', async () => {
    const faulty = join(scratch, 'missing-marker-package');
    await cp(staged, faulty, { recursive: true });
    await rm(join(faulty, 'node/package.json'));
    const faultyCandidate = join(consumer, 'missing-marker.tgz');
    await run('pack-missing-marker', [yarn, 'pack', '--out', faultyCandidate], faulty);
    await cp(faultyCandidate, join(evidence, 'missing-marker.tgz'));
    report.package.missingMarkerSha256 = createHash('sha256').update(await readFile(faultyCandidate)).digest('hex');
    manifest.dependencies['@hmcts/rpx-xui-core-lib'] = 'file:./missing-marker.tgz';
    await writeFile(join(consumer, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    try {
      await run('marker-fault-lock', [yarn, 'install', '--mode=update-lockfile'], consumer);
      await run('marker-fault-install-immutable', [yarn, 'install', '--immutable'], consumer);
      await assert.rejects(stat(join(installed, 'node/package.json')), { code: 'ENOENT' });
      const diagnostic = await run('missing-marker-fault', ['node-runtime.cjs'], consumer, 1);
      assert.match(diagnostic, /exports is not defined in ES module scope/);
    } finally {
      await writeFile(join(consumer, 'package.json'), canonicalManifest);
      await writeFile(join(consumer, 'yarn.lock'), locked);
      await run('marker-restore-install-immutable', [yarn, 'install', '--immutable'], consumer);
    }
  });
  await check('package.restored-node-runtime', () => run('restored-node-runtime', ['node-runtime.cjs'], consumer));
} catch (error) {
  report.tests.push({ id: current, status: 'failed', details: error.message });
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'package.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (scratch) await rm(scratch, { recursive: true, force: true });
}
