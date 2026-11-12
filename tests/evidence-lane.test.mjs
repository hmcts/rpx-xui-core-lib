import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { sourceSnapshot } from '../scripts/evidence-source-snapshot.mjs';

const laneScript = fileURLToPath(new URL('../scripts/run-evidence-lane.mjs', import.meta.url));
const uuid = '12345678-1234-4123-8123-123456789abc';

test('failed, interrupted or source-changing producers cannot leave a completed receipt', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'evidence-lane-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('/usr/bin/git', ['init', '-q'], { cwd: root });
  execFileSync('/usr/bin/git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '--allow-empty', '-qm', 'fixture'], { cwd: root });
  const sha = execFileSync('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  writeFileSync(join(root, '.gitignore'), 'test-results/\n');
  mkdirSync(join(root, '.yarn/releases'), { recursive: true });
  writeFileSync(join(root, '.yarn/releases/yarn-4.18.1.cjs'), `const fs = require('node:fs'); fs.writeFileSync('test-results/validation.tap', 'receipt'); if (process.env.MUTATE) fs.writeFileSync('mutated-source', 'changed'); if (process.env.SIGNAL) process.kill(process.pid, 'SIGTERM'); process.exit(process.env.FAIL ? 1 : 0);`);
  mkdirSync(join(root, 'test-results/lane-provenance'), { recursive: true });
  const run = { sourceSha: sha, runId: uuid, attempt: '1', invocationId: uuid, sourceSnapshot: sourceSnapshot(root) };
  writeFileSync(join(root, 'test-results/lane-provenance/run.json'), JSON.stringify(run));
  const env = { ...process.env, GITHUB_SHA: '', GITHUB_RUN_ID: '', GITHUB_RUN_ATTEMPT: '', CORE_EVIDENCE_RUN_ID: uuid };
  const invoke = (extra = {}) => spawnSync(process.execPath, [laneScript, 'unit', 'test'], { cwd: root, env: { ...env, ...extra }, encoding: 'utf8' });
  const receipt = join(root, 'test-results/lane-provenance/unit.json');
  assert.equal(invoke().status, 0);
  assert.equal(JSON.parse(readFileSync(receipt, 'utf8')).completed, true);
  assert.notEqual(invoke({ FAIL: '1' }).status, 0);
  assert.equal(existsSync(receipt), false);
  assert.notEqual(invoke({ SIGNAL: '1' }).status, 0);
  assert.equal(existsSync(receipt), false);
  const changed = invoke({ MUTATE: '1' });
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /Source changed during/);
  assert.equal(existsSync(receipt), false);
});
