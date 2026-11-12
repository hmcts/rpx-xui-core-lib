import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { sourceSnapshot } from '../scripts/evidence-source-snapshot.mjs';

test('source snapshot changes when tracked or nonignored work changes', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'source-snapshot-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('/usr/bin/git', ['init', '-q'], { cwd: root });
  writeFileSync(join(root, 'tracked'), 'original');
  writeFileSync(join(root, '.gitignore'), 'ignored\n');
  execFileSync('/usr/bin/git', ['add', 'tracked', '.gitignore'], { cwd: root });
  const initial = sourceSnapshot(root);
  writeFileSync(join(root, 'ignored'), 'irrelevant');
  assert.equal(sourceSnapshot(root), initial);
  writeFileSync(join(root, 'tracked'), 'changed');
  assert.notEqual(sourceSnapshot(root), initial);
  writeFileSync(join(root, 'tracked'), 'original');
  assert.equal(sourceSnapshot(root), initial);
  writeFileSync(join(root, 'untracked'), 'new');
  assert.notEqual(sourceSnapshot(root), initial);
});
