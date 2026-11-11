import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('cache baseline refuses core source that differs from the packed candidate', t => {
  const root = mkdtempSync(join(tmpdir(), 'cache-baseline-mismatch-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['projects/core-lib', 'scripts', 'tests/cache-upgrade/hosts', 'test-results/package-evidence']) {
    cpSync(resolve(dir), join(root, dir), { recursive: true });
  }
  for (const file of ['tsconfig.json', 'LICENCE', 'test-results/package.json']) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    cpSync(resolve(file), join(root, file));
  }
  symlinkSync(resolve('node_modules'), join(root, 'node_modules'));
  const helper = join(root, 'projects/core-lib/i18n/lib/helpers/match-case/match-case.helper.ts');
  const original = readFileSync(helper, 'utf8');
  assert.ok(original.includes('return str2;'));
  writeFileSync(helper, original.replace('return str2;', "return str2 + ' mismatch';"));
  const result = spawnSync(process.execPath, ['scripts/build-cache-upgrade.mjs'], { cwd: root, encoding: 'utf8', timeout: 120_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Baseline source must match packaged core/);
  assert.equal(existsSync(join(root, '.angular/cache-upgrade/core')), false);
});
