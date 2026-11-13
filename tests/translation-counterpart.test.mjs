import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { prepareTranslationCounterpart } from '../scripts/translation-counterpart.mjs';

const repository = 'https://github.com/hmcts/rpx-xui-translation.git';
const project = 'projects/rpx-xui-translation-core-facade';
const names = ['LICENCE', 'index.d.ts', 'index.mjs', 'package.json'];
const inputs = ['LICENCE', 'scripts/pack-core-facade.mjs', ...names.map(name => `${project}/${name}`)];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function git(source, ...args) {
  const result = spawnSync('/usr/bin/git', ['-C', source, '-c', 'user.name=Test fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgSign=false', ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function packer(mode) {
  return `import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
const mode = ${JSON.stringify(mode)};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.argv[2]);
mkdirSync(output);
const names = ['LICENCE', 'index.d.ts', 'index.mjs', 'package.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const files = Object.fromEntries(names.map(name => [name, readFileSync(join(root, '${project}', name))]));
function entry(name, bytes, type = '0') {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100); header.write('0000644\\0', 100, 8);
  header.write('0000000\\0', 108, 8); header.write('0000000\\0', 116, 8);
  header.write(bytes.length.toString(8).padStart(11, '0') + '\\0', 124, 12);
  header.write('00000000000\\0', 136, 12); header.fill(32, 148, 156);
  header.write(type, 156, 1); if (type !== '0') header.write('/synthetic/target', 157, 100);
  header.write('ustar\\0', 257, 6); header.write('00', 263, 2);
  header.write([...header].reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\\0 ', 148, 8);
  return Buffer.concat([header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512)]);
}
const archive = names.map(name => entry(mode === 'traversal' && name === 'index.mjs' ? 'package/../index.mjs' : 'package/' + name,
  mode === 'changed-bytes' && name === 'index.mjs' ? Buffer.from('wrong implementation') : ['symlink', 'hardlink'].includes(mode) && name === 'index.mjs' ? Buffer.alloc(0) : files[name],
  ['symlink', 'hardlink'].includes(mode) && name === 'index.mjs' ? mode === 'symlink' ? '2' : '1' : '0'));
if (mode === 'extra-entry') archive.push(entry('package/extra.mjs', Buffer.from('unexpected')));
if (mode === 'duplicate-entry') archive.push(entry('package/index.mjs', files['index.mjs']));
const tarball = join(output, 'rpx-xui-translation-0.0.0-core-preview.0.tgz');
writeFileSync(tarball, gzipSync(Buffer.concat([...archive, Buffer.alloc(1024)])));
const inputs = Object.fromEntries(names.map(name => [name, digest(files[name])]));
const evidence = join(output, 'provenance.json');
const report = { schemaVersion: 1, sourceSha: spawnSync('/usr/bin/git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), dirty: false,
  inputs, inputSha256: digest(JSON.stringify(inputs)), repositoryLicenceSha256: digest(readFileSync(join(root, 'LICENCE'))),
  tarball, sha256: digest(readFileSync(tarball)), evidence };
if (mode === 'false-sha') report.sha256 = '0'.repeat(64);
if (mode === 'false-source') report.sourceSha = '0'.repeat(40);
if (mode === 'false-inputs') report.inputs['index.mjs'] = '0'.repeat(64);
if (mode === 'false-input-hash') report.inputSha256 = '0'.repeat(64);
if (mode === 'false-licence') report.repositoryLicenceSha256 = '0'.repeat(64);
if (mode === 'false-dirty') report.dirty = true;
if (mode === 'false-path') report.tarball = join(output, '..', 'elsewhere.tgz');
writeFileSync(evidence, JSON.stringify(report));
if (mode === 'false-stdout') report.sha256 = '1'.repeat(64);
if (mode === 'extra-output') writeFileSync(join(output, 'unexpected.txt'), 'extra');
if (['source-mutation', 'hidden-source-mutation'].includes(mode)) {
  writeFileSync(join(root, '${project}', 'index.mjs'), 'changed source');
  if (mode === 'hidden-source-mutation') spawnSync('/usr/bin/git', ['-C', root, 'update-index', '--assume-unchanged', '${project}/index.mjs']);
}
console.log(JSON.stringify(report));
`;
}

async function fixture(t, mode = 'normal') {
  const root = await mkdtemp(join(tmpdir(), 'core-translation-counterpart-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  await mkdir(join(source, project), { recursive: true });
  await mkdir(join(source, 'scripts'));
  await writeFile(join(source, 'LICENCE'), 'Synthetic licence\n');
  await writeFile(join(source, project, 'LICENCE'), 'Synthetic licence\n');
  for (const name of ['index.mjs', 'index.d.ts']) await writeFile(join(source, project, name), "export * from '@hmcts/rpx-xui-core-lib/i18n';\n");
  await writeFile(join(source, project, 'package.json'), JSON.stringify({ name: 'rpx-xui-translation', version: '0.0.0-core-preview.0', private: true,
    peerDependencies: { '@hmcts/rpx-xui-core-lib': '0.0.0' }, files: ['index.mjs', 'index.d.ts', 'LICENCE'] }));
  await writeFile(join(source, 'scripts/pack-core-facade.mjs'), packer(mode));
  git(source, 'init', '--quiet');
  git(source, 'add', '.');
  git(source, 'commit', '--quiet', '-m', 'Add synthetic counterpart fixture');
  const profile = { repository, commit: git(source, 'rev-parse', 'HEAD'), files: {} };
  for (const path of inputs) profile.files[path] = sha256(await readFile(join(source, path)));
  return { source, output: join(root, 'packed'), profile };
}

test('independently binds packer output to clean frozen source bytes', async t => {
  const options = await fixture(t);
  const result = await prepareTranslationCounterpart(options);
  assert.equal(result.tarball, join(options.output, 'rpx-xui-translation-0.0.0-core-preview.0.tgz'));
  assert.equal(result.evidence.sourceSha, options.profile.commit);
  assert.equal(result.evidence.profileSha256, sha256(JSON.stringify(options.profile)));
  assert.deepEqual(result.evidence.sourceFiles, options.profile.files);
  assert.deepEqual(Object.keys(result.evidence.sourceFiles), Object.keys(options.profile.files));
  assert.equal(result.evidence.sha256, sha256(await readFile(result.tarball)));
  assert.deepEqual(Object.keys(result.evidence.packedFiles).sort(), names.map(name => `package/${name}`).sort());
});

test('counterpart verification never executes a Git shadow from PATH', async t => {
  const options = await fixture(t);
  const bin = join(options.output, '..', 'shadow-bin');
  const marker = join(bin, 'executed');
  await mkdir(bin);
  await writeFile(join(bin, 'git'), '#!/bin/sh\n/usr/bin/touch "$COUNTERPART_GIT_MARKER"\nexec /usr/bin/git "$@"\n', { mode: 0o755 });
  const previousPath = process.env.PATH;
  const previousMarker = process.env.COUNTERPART_GIT_MARKER;
  try {
    process.env.PATH = `${bin}:${previousPath ?? ''}`;
    process.env.COUNTERPART_GIT_MARKER = marker;
    const result = await prepareTranslationCounterpart(options);
    assert.equal(result.evidence.sourceSha, options.profile.commit);
    await assert.rejects(lstat(marker), { code: 'ENOENT' }, 'The PATH shadow must never execute');
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    if (previousMarker === undefined) delete process.env.COUNTERPART_GIT_MARKER;
    else process.env.COUNTERPART_GIT_MARKER = previousMarker;
  }
});

test('rejects a different source head', async t => {
  const options = await fixture(t);
  options.profile.commit = '0'.repeat(40);
  await assert.rejects(prepareTranslationCounterpart(options), /source HEAD/);
});

for (const dirty of ['tracked', 'untracked', 'staged']) {
  test(`rejects ${dirty} source changes`, async t => {
    const options = await fixture(t);
    await writeFile(join(options.source, dirty === 'untracked' ? 'new-source.mjs' : `${project}/index.mjs`), 'dirty source');
    if (dirty === 'staged') git(options.source, 'add', '.');
    await assert.rejects(prepareTranslationCounterpart(options), /source must be clean/);
  });
}

test('rejects mismatched or incomplete profile input hashes', async t => {
  const options = await fixture(t);
  options.profile.files[`${project}/index.mjs`] = '0'.repeat(64);
  await assert.rejects(prepareTranslationCounterpart(options), /input hash/);
  delete options.profile.files[`${project}/index.mjs`];
  await assert.rejects(prepareTranslationCounterpart(options), /Missing frozen input/);
});

test('rejects profile traversal and source symlinks', async t => {
  const options = await fixture(t);
  options.profile.files['../outside'] = '0'.repeat(64);
  await assert.rejects(prepareTranslationCounterpart(options), /input path/);
  delete options.profile.files['../outside'];
  await rm(join(options.source, project, 'index.mjs'));
  await symlink('index.d.ts', join(options.source, project, 'index.mjs'));
  git(options.source, 'add', '.');
  git(options.source, 'commit', '--quiet', '-m', 'Add synthetic symlink fixture');
  options.profile.commit = git(options.source, 'rev-parse', 'HEAD');
  await assert.rejects(prepareTranslationCounterpart(options), /regular source file/);
});

/** @type {[string, RegExp][]} */
const faults = [
  ['extra-entry', /archive entries/], ['duplicate-entry', /archive entries/], ['traversal', /archive entries/],
  ['symlink', /regular archive files/], ['hardlink', /regular archive files/], ['changed-bytes', /Packed file differs/],
  ['false-sha', /tarball hash claim/], ['false-source', /source SHA claim/], ['false-inputs', /source input claims/],
  ['false-input-hash', /input digest claim/], ['false-licence', /licence claim/], ['false-dirty', /clean source claim/],
  ['false-path', /artifact path claim/], ['false-stdout', /provenance report/],
  ['extra-output', /Unexpected counterpart output/], ['source-mutation', /source must be clean/], ['hidden-source-mutation', /input hash/],
];
for (const [mode, reason] of faults) {
  test(`rejects packer ${mode} instead of trusting its report`, async t => {
    const options = await fixture(t, mode);
    await assert.rejects(prepareTranslationCounterpart(options), reason);
  });
}

test('rejects an existing output directory and an unrelated profile repository', async t => {
  const options = await fixture(t);
  await mkdir(options.output);
  await assert.rejects(prepareTranslationCounterpart(options), /fresh/);
  options.profile.repository = 'https://example.invalid/unrelated.git';
  await assert.rejects(prepareTranslationCounterpart(options), /repository/);
});
