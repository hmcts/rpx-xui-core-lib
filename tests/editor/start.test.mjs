import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('./start.mjs', import.meta.url));
test('rejects an invalid port before deleting existing editor evidence', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'editor-invalid-port-'));
  try {
    mkdirSync(join(cwd, 'test-results/editor'), { recursive: true });
    const report = join(cwd, 'test-results/editor/jasmine.json');
    for (const port of ['', '0', '65536', '4315x', '-1']) {
      writeFileSync(report, 'retained evidence');
      const result = spawnSync(process.execPath, [script, port], { cwd, encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /invalid port/i);
      assert.equal(readFileSync(report, 'utf8'), 'retained evidence');
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
