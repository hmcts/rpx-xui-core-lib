import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withEvidenceRunLock } from '../scripts/evidence-run-lock.mjs';
import { runDiagnostic } from '../scripts/diagnostic-current.mjs';

const lockModule = new URL('../scripts/evidence-run-lock.mjs', import.meta.url).href;
const strictRunner = fileURLToPath(new URL('../scripts/run-evidence-suite.mjs', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'evidence-lock-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'test-results'));
  writeFileSync(join(root, 'test-results', 'original.txt'), 'retained');
  return root;
}

test('strict and diagnostic runs reject a concurrent owner before touching reports', async t => {
  const root = fixture(t);
  const script = `import {withEvidenceRunLock} from ${JSON.stringify(lockModule)}; withEvidenceRunLock(process.argv[1], () => { process.stdout.write('locked\\n'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5000); });`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script, root], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  assert.match(String((await once(child.stdout, 'data'))[0]), /locked/);
  const previousCI = process.env.CI;
  try {
    delete process.env.CI;
    assert.throws(() => runDiagnostic(root), /already active or stale lock/);
  } finally {
    if (previousCI === undefined) delete process.env.CI;
    else process.env.CI = previousCI;
  }
  const strict = spawnSync(process.execPath, [strictRunner], { cwd: root, encoding: 'utf8' });
  assert.notEqual(strict.status, 0);
  assert.match(strict.stderr, /already active or stale lock/);
  assert.equal(readFileSync(join(root, 'test-results', 'original.txt'), 'utf8'), 'retained');
  child.kill('SIGKILL');
  await once(child, 'exit');
  assert.ok(existsSync(join(root, '.angular', 'evidence-run.lock')), 'crash leaves fail-closed lock');
  assert.throws(() => withEvidenceRunLock(root, () => {}), /already active or stale lock/);
});

test('lock is removed on normal failure and can be reused', t => {
  const root = fixture(t);
  assert.throws(() => withEvidenceRunLock(root, () => { throw new Error('failure'); }), /failure/);
  assert.equal(existsSync(join(root, '.angular', 'evidence-run.lock')), false);
  assert.equal(withEvidenceRunLock(root, () => 42), 42);
});

test('stale lock requires explicit inspection rather than automatic takeover', t => {
  const root = fixture(t);
  mkdirSync(join(root, '.angular', 'evidence-run.lock'), { recursive: true });
  assert.throws(() => withEvidenceRunLock(root, () => {}), /check running processes/);
  assert.ok(existsSync(join(root, '.angular', 'evidence-run.lock')));
});
