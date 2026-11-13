import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

const repository = 'https://github.com/hmcts/rpx-xui-translation.git';
const project = 'projects/rpx-xui-translation-core-facade';
const files = ['LICENCE', 'index.d.ts', 'index.mjs', 'package.json'];
const packer = 'scripts/pack-core-facade.mjs';
const filename = 'rpx-xui-translation-0.0.0-core-preview.0.tgz';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, `Counterpart ${command} failed: ${result.stderr ?? result.error?.message ?? ''}`);
  return result.stdout;
}

function verifyHead(source, commit) {
  assert.equal(run('/usr/bin/git', ['rev-parse', 'HEAD'], source).toString().trim(), commit, 'Counterpart source HEAD differs from profile');
  assert.equal(run('/usr/bin/git', ['status', '--porcelain', '--untracked-files=all'], source).length, 0, 'Counterpart source must be clean');
}

async function sourceInputs(source, profile) {
  const inputs = await Promise.all(Object.entries(profile.files).map(async ([name, expected]) => {
    assert.ok(name && !name.startsWith('/') && !/[\\\u0000-\u001f]/.test(name) && name.split('/').every(part => part && part !== '.' && part !== '..'), 'Invalid frozen input path');
    assert.match(String(expected), /^[a-f0-9]{64}$/, 'Invalid frozen input hash');
    const file = join(source, name);
    assert.ok((await lstat(file)).isFile() && await realpath(file) === file, 'Counterpart requires a regular source file without symlink parents');
    const bytes = await readFile(file);
    const sha256 = hash(bytes);
    assert.equal(sha256, expected, `Counterpart input hash differs: ${name}`);
    return { name, bytes, sha256 };
  }));
  return { bytes: Object.fromEntries(inputs.map(input => [input.name, input.bytes])),
    hashes: Object.fromEntries(inputs.map(input => [input.name, input.sha256])) };
}

export async function prepareTranslationCounterpart({ profile, source, output }) {
  assert.equal(profile?.repository, repository, 'Unexpected counterpart repository');
  assert.match(profile.commit, /^[a-f0-9]{40}$/, 'Invalid counterpart source commit');
  assert.ok(profile.files && typeof profile.files === 'object' && !Array.isArray(profile.files), 'Missing frozen inputs');
  for (const name of ['LICENCE', packer, ...files.map(file => `${project}/${file}`)]) assert.ok(Object.hasOwn(profile.files, name), `Missing frozen input: ${name}`);
  source = await realpath(source);
  output = resolve(output);
  assert.equal(await realpath(run('/usr/bin/git', ['rev-parse', '--show-toplevel'], source).toString().trim()), source, 'Counterpart source must be a repository root');
  assert.ok(output !== source && !output.startsWith(source + sep), 'Counterpart output must be outside source');
  try { await lstat(output); throw new Error('Counterpart output must be fresh'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  verifyHead(source, profile.commit);
  const before = await sourceInputs(source, profile);
  const manifest = JSON.parse(before.bytes[`${project}/package.json`].toString());
  assert.equal(manifest.name, 'rpx-xui-translation', 'Unexpected counterpart package');
  assert.equal(manifest.version, '0.0.0-core-preview.0', 'Counterpart must use the private preview version');
  assert.equal(manifest.private, true, 'Counterpart must remain private');
  assert.deepEqual(manifest.peerDependencies, { '@hmcts/rpx-xui-core-lib': '0.0.0' }, 'Counterpart must use the exact Core peer');
  assert.ok(before.bytes.LICENCE.equals(before.bytes[`${project}/LICENCE`]), 'Counterpart licence differs from repository');

  const claimed = JSON.parse(run(process.execPath, [join(source, packer), output], source).toString());
  const tarball = join(output, filename), evidenceFile = join(output, 'provenance.json');
  assert.equal(claimed.tarball, tarball, 'Counterpart artifact path claim differs');
  assert.equal(claimed.evidence, evidenceFile, 'Counterpart evidence path claim differs');
  assert.ok((await lstat(output)).isDirectory(), 'Counterpart output must be a regular directory');
  await Promise.all((await readdir(output)).map(async name => {
    assert.ok([filename, 'provenance.json', 'npm-cache'].includes(name), 'Unexpected counterpart output');
    const info = await lstat(join(output, name));
    assert.ok(name === 'npm-cache' ? info.isDirectory() : info.isFile(), 'Counterpart output must not contain symlinks');
  }));
  assert.deepEqual(JSON.parse(await readFile(evidenceFile, 'utf8')), claimed, 'Counterpart provenance report differs from stdout');
  const sha256 = hash(await readFile(tarball));
  assert.equal(claimed.schemaVersion, 1, 'Unexpected counterpart provenance version');
  assert.equal(claimed.sourceSha, profile.commit, 'Counterpart source SHA claim differs');
  assert.equal(claimed.dirty, false, 'Counterpart clean source claim differs');
  const packedInputs = Object.fromEntries(files.map(name => [name, before.hashes[`${project}/${name}`]]));
  assert.deepEqual(claimed.inputs, packedInputs, 'Counterpart source input claims differ');
  assert.equal(claimed.inputSha256, hash(JSON.stringify(packedInputs)), 'Counterpart input digest claim differs');
  assert.equal(claimed.repositoryLicenceSha256, before.hashes.LICENCE, 'Counterpart licence claim differs');
  assert.equal(claimed.sha256, sha256, 'Counterpart tarball hash claim differs');

  const entries = run('/usr/bin/tar', ['-tzf', tarball], output).toString().trimEnd().split('\n');
  assert.deepEqual(entries.sort(), files.map(name => `package/${name}`), 'Counterpart archive entries must match the four source files exactly');
  const details = run('/usr/bin/tar', ['-tvzf', tarball], output).toString().trimEnd().split('\n');
  assert.ok(details.length === files.length && details.every(line => line.startsWith('-')), 'Counterpart requires regular archive files without links');
  const packedFiles = {};
  for (const name of files) {
    const entry = `package/${name}`;
    const bytes = run('/usr/bin/tar', ['-xOf', tarball, entry], output);
    assert.ok(bytes.equals(before.bytes[`${project}/${name}`]), `Packed file differs from frozen source: ${name}`);
    packedFiles[entry] = hash(bytes);
  }
  verifyHead(source, profile.commit);
  await sourceInputs(source, profile);
  assert.equal(hash(await readFile(tarball)), sha256, 'Counterpart tarball changed during verification');
  return { tarball, evidence: { schemaVersion: 1, repository, sourceSha: profile.commit,
    profileSha256: hash(JSON.stringify(profile)), sourceFiles: before.hashes, packedFiles, sha256 } };
}
