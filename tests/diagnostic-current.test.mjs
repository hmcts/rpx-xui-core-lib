import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDiagnostic } from '../scripts/diagnostic-current.mjs';
const identity = () => ({sourceSha:'fixture',runId:'fixture',attempt:'1',invocationId:process.env.CORE_EVIDENCE_RUN_ID,dirty:false});
test('preserves previous results and records failed lint while running later lanes', t => {
  const root = mkdtempSync(join(tmpdir(),'diagnostic-test-')); t.after(() => rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'test-results')); writeFileSync(join(root,'test-results','original.txt'),'old evidence');
  mkdirSync(join(root,'playwright-report')); writeFileSync(join(root,'playwright-report','index.html'),'old report');
  const called = [];
  const report = runDiagnostic(root, name => { called.push(name); return {status:name === 'lint' ? 2 : 0}; }, identity, () => 'same');
  assert.equal(report.passed,false); assert.equal(report.releaseReady,false);
  assert.equal(readFileSync(join(report.backup,'test-results','original.txt'),'utf8'),'old evidence');
  assert.equal(readFileSync(join(report.backup,'playwright-report','index.html'),'utf8'),'old report');
  assert.ok(called.includes('cacheBrowser'));
  const saved = JSON.parse(readFileSync(join(root,'test-results','diagnostic-status.json'),'utf8'));
  assert.equal(saved.results.find(x => x.name === 'lint').exitCode,2);
  assert.equal(saved.sourceSnapshot,'same');
});
test('source change prevents a passing report', t => {
  const root = mkdtempSync(join(tmpdir(),'diagnostic-test-')); t.after(() => rmSync(root,{recursive:true,force:true}));
  let calls=0; const report = runDiagnostic(root, () => ({status:0}), identity, () => ++calls < 3 ? 'before' : 'after');
  assert.equal(report.passed,false); assert.equal(report.sourceChanged,true);
});
test('source change before running aborts and preserves backup', t => {
  const root = mkdtempSync(join(tmpdir(),'diagnostic-test-')); t.after(() => rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'test-results')); writeFileSync(join(root,'test-results','original.txt'),'old');
  let calls=0; assert.throws(() => runDiagnostic(root, () => { throw new Error('must not run'); }, identity, () => ++calls === 1 ? 'before' : 'after'), /Source changed/);
});

test('passes the requested checkout as the working directory to every child', t => {
  const root = mkdtempSync(join(tmpdir(),'diagnostic-test-')); t.after(() => rmSync(root,{recursive:true,force:true}));
  const cwdValues = [];
  runDiagnostic(root, (_name, _kind, _command, cwd) => { cwdValues.push(cwd); return {status:0}; }, identity, () => 'same');
  assert.ok(cwdValues.length > 1);
  assert.ok(cwdValues.every(cwd => cwd === root));
});

test('a failed lint run adds a clearly unavailable feature matrix', t => {
  const root = mkdtempSync(join(tmpdir(), 'diagnostic-matrix-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tests'));
  copyFileSync(new URL('./contracts.json', import.meta.url), join(root, 'tests/contracts.json'));
  copyFileSync(new URL('./feature-evidence-map.json', import.meta.url), join(root, 'tests/feature-evidence-map.json'));
  const report = runDiagnostic(root, name => {
    if (name === 'browser') {
      mkdirSync(join(root, 'test-results/odhin/browser'), { recursive: true });
      writeFileSync(join(root, 'test-results/odhin/browser/index.html'), '<html><body></body></html>');
    }
    return { status: name === 'lint' ? 1 : 0 };
  }, identity, () => 'same');
  const html = readFileSync(join(root, 'test-results/odhin/browser/index.html'), 'utf8');
  assert.equal(report.passed, false);
  assert.equal(report.featureMatrix, 'unavailable');
  assert.match(html, /Unavailable: run or gate incomplete/);
  assert.doesNotMatch(html, /required cases passed/);
});
test('a successful browser step without its report fails the diagnostic', t => {
  const root = mkdtempSync(join(tmpdir(), 'diagnostic-missing-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const report = runDiagnostic(root, () => ({status:0}), identity, () => 'same');
  assert.equal(report.featureMatrix, 'not produced');
  assert.equal(report.passed, false);
});
test('a failed final matrix browser check fails and is recorded', t => {
  const root = mkdtempSync(join(tmpdir(), 'diagnostic-check-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tests'));
  copyFileSync(new URL('./contracts.json', import.meta.url), join(root, 'tests/contracts.json'));
  copyFileSync(new URL('./feature-evidence-map.json', import.meta.url), join(root, 'tests/feature-evidence-map.json'));
  const report = runDiagnostic(root, name => {
    if (name === 'browser') {
      mkdirSync(join(root, 'test-results/odhin/browser'), { recursive: true });
      writeFileSync(join(root, 'test-results/odhin/browser/index.html'), '<html><body></body></html>');
    }
    return { status: name === 'diagnostic-report' ? 3 : 0 };
  }, identity, () => 'same');
  assert.equal(report.passed, false);
  assert.equal(report.results.find(result => result.name === 'diagnostic-report').exitCode, 3);
});

test('second backup move failure names retained paths and starts no lanes', t => {
  const root = mkdtempSync(join(tmpdir(), 'diagnostic-backup-error-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'test-results')); writeFileSync(join(root, 'test-results', 'original.txt'), 'old evidence');
  mkdirSync(join(root, 'playwright-report')); writeFileSync(join(root, 'playwright-report', 'index.html'), 'old report');
  let backupPath; let moves = 0; let lanes = 0;
  const move = (source, destination) => { backupPath = join(destination, '..'); if (++moves === 2) throw new Error('injected rename failure'); renameSync(source, destination); };
  assert.throws(() => runDiagnostic(root, () => { lanes++; return {status: 0}; }, identity, () => 'same', move), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /injected rename failure/);
    assert.ok(error.message.includes(backupPath));
    assert.match(error.message, /test-results/);
    assert.match(error.message, /playwright-report/);
    return true;
  });
  assert.equal(lanes, 0);
  assert.equal(readFileSync(join(backupPath, 'test-results/original.txt'), 'utf8'), 'old evidence');
  assert.equal(readFileSync(join(root, 'playwright-report/index.html'), 'utf8'), 'old report');
  assert.equal(existsSync(join(root, '.angular/evidence-run.lock')), false);
});
