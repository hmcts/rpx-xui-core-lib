import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matrixState, renderMatrix, writeFeatureMatrix } from '../scripts/feature-evidence-matrix.mjs';
import { checkContracts } from '../scripts/check-contracts.mjs';

const identity = { sourceSha: 'a'.repeat(40), runId: '42', attempt: '1', invocationId: '12345678-1234-1234-1234-123456789012' };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'feature-matrix-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'test-results/lane-provenance'), { recursive: true });
  mkdirSync(join(root, 'tests'));
  copyFileSync(new URL('./contracts.json', import.meta.url), join(root, 'tests/contracts.json'));
  copyFileSync(new URL('./feature-evidence-map.json', import.meta.url), join(root, 'tests/feature-evidence-map.json'));
  writeFileSync(join(root, 'test-results/lane-provenance/run.json'), JSON.stringify({ ...identity, sourceSnapshot: 'b'.repeat(64) }));
  return root;
}
const mapping = JSON.parse(readFileSync(new URL('./feature-evidence-map.json', import.meta.url), 'utf8'));
const inventory = JSON.parse(readFileSync(new URL('./contracts.json', import.meta.url), 'utf8'));
const checks = { sourceSnapshot: () => 'b'.repeat(64), checkContracts: () => 1 };
test('shows only explicitly mapped cases and labels unmapped layers', t => {
  const root = fixture(t);
  const state = matrixState(root, identity, true, checks);
  assert.equal(state, 'verified');
  const html = renderMatrix(state, mapping, identity, inventory);
  assert.match(html, /not coverage or a complete feature inventory/);
  assert.match(html, /required cases passed/);
  assert.match(html, /Not mapped/);
});
test('missing receipt cannot produce verified results', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'test-results/validation.tap'), 'TAP version 13\n');
  assert.throws(() => checkContracts(root, identity), /unit\.json/);
  assert.equal(matrixState(root, identity, true, { ...checks, checkContracts }), 'unavailable');
  assert.doesNotMatch(renderMatrix('unavailable', mapping, identity, inventory), /required cases passed/);
});
test('stale identity, source and unsuccessful sequence remain unavailable', t => {
  const root = fixture(t);
  assert.equal(matrixState(root, { ...identity, runId: 'old' }, true, checks), 'unavailable');
  assert.equal(matrixState(root, { ...identity, invocationId: 'old' }, true, checks), 'unavailable');
  assert.equal(matrixState(root, identity, true, { ...checks, sourceSnapshot: () => 'old' }), 'unavailable');
  assert.equal(matrixState(root, identity, false, checks), 'unavailable');
});
test('a removed mapped required case fails closed', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'tests/contracts.json'), JSON.stringify({ unit: { required: [] } }));
  assert.equal(matrixState(root, identity, true, checks), 'unavailable');
});

test('successful run rejects missing or unreadable report; failed run remains best effort', t => {
  const root = fixture(t);
  assert.throws(() => writeFeatureMatrix(root, identity, true), /ENOENT/);
  assert.doesNotThrow(() => writeFeatureMatrix(root, identity, false));
});
test('validates the modified source and rejects unsuccessful binding on a successful run', t => {
  const root = fixture(t);
  const directory = join(root, 'test-results/odhin/browser');
  mkdirSync(directory, { recursive: true });
  const file = join(directory, 'index.html');
  writeFileSync(file, '<html><body>Report</body></html>');
  let called = false;
  writeFeatureMatrix(root, identity, true, { matrixState: () => 'verified', validateSource: () => {
    called = true;
    const html = readFileSync(file, 'utf8');
    assert.match(html, /id="feature-evidence-matrix"/);
    assert.match(html, new RegExp(`source snapshot ${'b'.repeat(64)}`));
    assert.match(html, /working tree unknown/);
    return ['browser'];
  } });
  assert.equal(called, true);
  writeFileSync(file, '<html><body>Report</body></html>');
  assert.throws(() => writeFeatureMatrix(root, identity, true, { matrixState: () => 'unavailable', validateSource: () => ['browser'] }), /verified feature evidence/);
  assert.doesNotMatch(readFileSync(file, 'utf8'), /feature-evidence-matrix/);
});

test('source validation failure is propagated after modifying a successful report', t => {
  const root = fixture(t);
  const directory = join(root, 'test-results/odhin/browser');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'index.html'), '<html><body>Report</body></html>');
  assert.throws(() => writeFeatureMatrix(root, identity, true, {
    matrixState: () => 'verified', validateSource: () => { throw new Error('malformed report'); }
  }), /malformed report/);
});
