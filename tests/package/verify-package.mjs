import assert from 'node:assert/strict';
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
const yarn = join(root, '.yarn/releases/yarn-4.5.3.cjs');
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
  assert.equal(process.versions.node, '24.22.1', 'Run with the pinned Node 24.22.1');
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
  });

  await cp(dist, staged, { recursive: true });
  await writeFile(join(staged, 'yarn.lock'), '');
  const candidate = join(scratch, 'candidate.tgz');
  current = 'package.setup';
  await run('pack', [yarn, 'pack', '--out', candidate], staged);
  report.package = {
    sha256: createHash('sha256').update(await readFile(candidate)).digest('hex'),
    node: process.versions.node,
    yarn: '4.5.3',
    angular: '20.3.31',
    typescript: '5.9.3',
  };
  await cp(candidate, join(evidence, 'candidate.tgz'));
  await cp(join(root, 'tests/fixtures/package'), consumer, { recursive: true });
  await cp(candidate, join(consumer, 'candidate.tgz'));
  const manifest = JSON.parse(await readFile(join(consumer, 'package.json'), 'utf8'));
  manifest.dependencies['@hmcts/rpx-xui-core-lib'] = 'file:./candidate.tgz';
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
  const compiler = join(consumer, 'node_modules/typescript/bin/tsc');
  await check('package.strict-node', () => run('strict-node', [compiler, '-p', 'tsconfig.node.json'], consumer));
  await check('package.strict-bundler', () => run('strict-bundler', [compiler, '-p', 'tsconfig.bundler.json'], consumer));
  await check('package.installed-runtime', () => run('installed-runtime', ['runtime.mjs'], consumer));

  const canonicalManifest = await readFile(join(consumer, 'package.json'));
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
} catch (error) {
  report.tests.push({ id: current, status: 'failed', details: error.message });
  console.error(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'package.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (scratch) await rm(scratch, { recursive: true, force: true });
}
