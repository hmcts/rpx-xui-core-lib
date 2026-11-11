import assert from 'node:assert/strict';
import { currentIdentity } from '../../scripts/evidence-identity.mjs';
import { buildSync } from 'esbuild';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = join(root, 'test-results');
const evidence = join(output, 'package-evidence');
const report = { schemaVersion: 1, package: {}, tests: [] };
const yarn = join(root, '.yarn/releases/yarn-4.18.1.cjs');
let current = 'package.setup';
let scratch;

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

async function run(name, args, cwd, expectedStatus = 0) {
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 3 * 60_000 });
  const diagnostic = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`;
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

  // Fail before dependency setup when the legacy TypeScript entry point is absent.
  await check('package.physical-secondary-declaration', async () => {
    assert.ok((await stat(join(dist, declaration))).isFile());
    assert.ok((await stat(join(dist, 'forms/validation/LICENCE'))).isFile());
    for (const entry of ['ui/contact-details', 'ui/loading-spinner', 'ui/due-date', 'ui/accessibility', 'ui/session-dialog', 'case/models', 'case/reference', 'case/sharing']) {
      assert.equal(await readFile(join(dist, entry, 'LICENCE'), 'utf8'), await readFile(join(root, 'projects/core-lib', entry, 'LICENCE'), 'utf8'), 'Copied source licence must survive packaging');
    }
  });

  await check('package.physical-node', async () => {
    for (const file of ['node/index.js', 'node/index.d.ts', 'node/package.json', 'node/LICENCE']) assert.ok((await stat(join(dist, file))).isFile());
    assert.deepEqual(JSON.parse(await readFile(join(dist, 'node/package.json'), 'utf8')), { type: 'commonjs' });
    const exports = JSON.parse(await readFile(join(dist, 'package.json'), 'utf8')).exports['./node'];
    assert.equal(exports.browser, null);
    assert.equal(exports.node, './node/index.js');
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
  await check('package.strict-bundler', () => run('strict-bundler', [compiler, '-p', 'tsconfig.bundler.json'], consumer));
  await check('package.installed-runtime', async () => {
    await run('installed-runtime', ['runtime.mjs'], consumer);
    for (const entry of ['ui/contact-details', 'ui/loading-spinner', 'ui/due-date', 'ui/accessibility', 'ui/session-dialog', 'case/models', 'case/reference', 'case/sharing']) {
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
