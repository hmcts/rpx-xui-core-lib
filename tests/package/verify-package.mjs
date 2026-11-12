import assert from 'node:assert/strict';
import { currentIdentity } from '../../scripts/evidence-identity.mjs';
import { sourceSnapshot } from '../../scripts/evidence-source-snapshot.mjs';
import { buildSync } from 'esbuild';
import { inspectLoadingGraph, assertPackedBytes, assertEagerDateFailure } from '../packed-loading/graph.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
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
    for (const entry of ['ui/search-location', 'case/session-error', 'case/editor-date', 'browser/window', 'browser/session-storage', 'reference/locations', 'reference/ref-data', 'terms/models', 'ui/cookie', 'ui/feature-toggle', 'ui/feature-toggle-directive', 'ui/role-state', 'ui/task-data', 'case/sharing-state', 'ui/contact-details', 'ui/loading-spinner', 'ui/loading-state', 'ui/due-date', 'ui/accessibility', 'ui/session-dialog', 'ui/banner', 'ui/form-label', 'case/models', 'case/reference', 'case/sharing']) {
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
  await check('package.loading-angular-build', async () => {
    await cp(join(root, 'tests/fixtures/packed-loading'), join(consumer, 'loading-host'), { recursive: true });
    await cp(join(consumer, 'loading-host/angular.json'), join(consumer, 'angular.json'));
    await symlink(join(root, 'node_modules/@angular/build'), join(consumer, 'node_modules/@angular/build'), 'dir');
    await run('loading-angular-build', [join(root, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'loading-host'], consumer);
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
    for (const entry of ['ui/search-location', 'case/session-error', 'case/editor-date', 'browser/window', 'browser/session-storage', 'reference/locations', 'reference/ref-data', 'terms/models', 'ui/cookie', 'ui/feature-toggle', 'ui/feature-toggle-directive', 'ui/role-state', 'ui/task-data', 'case/sharing-state', 'ui/contact-details', 'ui/loading-spinner', 'ui/loading-state', 'ui/due-date', 'ui/accessibility', 'ui/session-dialog', 'ui/banner', 'ui/form-label', 'case/models', 'case/reference', 'case/sharing']) {
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


  /** @type {Array<[string, string, string[]]>} */
  const selectiveEntries = [
    ['cookie', 'cookie-graph.mjs', ['ui-cookie']],
    ['window', 'window-graph.mjs', ['browser-window']],
    ['search-location', 'search-location-graph.mjs', ['ui-search-location', 'reference-locations', 'reference-ref-data', 'browser-session-storage', 'i18n']],
    ['gov-input', 'gov-input-graph.mjs', ['ui-gov-input', 'i18n']],
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
