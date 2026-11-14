import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('./start.mjs', import.meta.url));
test('rejects an invalid port before deleting existing editor evidence', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'editor-invalid-port-'));
  try {
    mkdirSync(join(cwd, 'test-results/editor'), { recursive: true });
    const reports = ['jasmine.json', 'driver.json'].map(name => join(cwd, 'test-results/editor', name));
    for (const port of ['', '0', '65536', '4315x', '-1', '--help', '1e3', '0x10']) {
      for (const report of reports) writeFileSync(report, 'retained evidence');
      const result = spawnSync(process.execPath, [script, port], { cwd, encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /invalid port/i);
      for (const report of reports) assert.equal(readFileSync(report, 'utf8'), 'retained evidence');
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('starts the editor on the IPv4 address used by Playwright', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'editor-host-'));
  try {
    const cli = join(cwd, 'node_modules/@angular/cli/bin');
    mkdirSync(cli, { recursive: true });
    mkdirSync(join(cwd, 'test-results/editor'), { recursive: true });
    writeFileSync(join(cli, 'ng.js'), "require('fs').writeFileSync('arguments.json', JSON.stringify(process.argv.slice(2)))\n");
    for (const port of ['4315', '04315']) {
      const previousDriver = join(cwd, 'test-results/editor/driver.json');
      writeFileSync(previousDriver, 'old report');
      const result = spawnSync(process.execPath, [script, port], { cwd, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(previousDriver), false);
      const args = JSON.parse(readFileSync(join(cwd, 'arguments.json'), 'utf8'));
      assert.deepEqual(args, ['serve', 'editor-tests', '--host', '127.0.0.1', '--port', '4315']);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
