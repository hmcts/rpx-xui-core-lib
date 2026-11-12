import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSteps, startupCollision, executeStep } from '../scripts/diagnostic-lanes.mjs';
const plan = [['build','yarn','build'], ['lint','yarn','lint'], ['unit','lane','test'], ['browser','lane','test:browser']];
test('lint failure is recorded and later lanes still run with nonzero result', () => {
  const calls = [];
  const report = runSteps(name => { calls.push(name); return { status: name === 'lint' ? 2 : 0 }; }, plan, {});
  assert.deepEqual(calls, ['build','lint','unit','browser']);
  assert.deepEqual(report.results.map(item => item.status), ['passed','failed','passed','passed']);
  assert.equal(report.results[1].exitCode, 2);
  assert.equal(report.passed, false);
  assert.equal(report.releaseReady, false);
});
test('later failure and process launch errors cannot be reported as success', () => {
  const report = runSteps(name => { if (name === 'unit') throw new Error('launch failed'); return { status: name === 'browser' ? 1 : 0 }; }, plan, {});
  assert.deepEqual(report.results.map(item => item.status), ['passed','passed','failed','failed']);
  assert.equal(report.results[2].error, 'launch failed');
  assert.equal(report.passed, false);
});
test('even all passing diagnostics do not claim release readiness', () => {
  const report = runSteps(() => ({ status: 0 }), plan, {});
  assert.equal(report.passed, true);
  assert.equal(report.diagnosticOnly, true);
  assert.equal(report.releaseReady, false);
});

test('failed prerequisite blocks dependent steps without treating them as passing', () => {
  const called = [];
  const report = runSteps(name => { called.push(name); return { status: name === 'build' ? 1 : 0 }; }, plan, { browser: ['build'] });
  assert.deepEqual(called, ['build','lint','unit']);
  assert.deepEqual(report.results[3], {name:'browser',status:'blocked',exitCode:null,blockers:['build']});
  assert.equal(report.passed, false);
});
test('signal interruption blocks remaining steps rather than continuing', () => {
  const calls = [];
  const report = runSteps(name => { calls.push(name); return name === 'lint' ? { status: null, signal: 'SIGINT' } : { status: 0 }; }, plan, {});
  assert.deepEqual(calls, ['build', 'lint']);
  assert.equal(report.results[1].signal, 'SIGINT');
  assert.deepEqual(report.results[2].blockers, ['interrupted']);
  assert.equal(report.passed, false);
});


test('server startup collision is rejected even when a driver exits successfully', () => {
  assert.equal(startupCollision('An unhandled exception occurred: Port 4314 is already in use', ''), true);
  assert.equal(startupCollision('', 'Error: listen EADDRINUSE: address already in use'), true);
  assert.equal(startupCollision('Tests passed successfully', ''), false);
});


test('a successful driver with a failed server is a failed lane and blocks dependants', () => {
  const collision = executeStep('i18nUnit', 'lane', 'test:i18n', process.cwd(), () => ({pid: 1, output: ['', '', '[WebServer] An unhandled exception occurred: Port 4314 is already in use'], signal: null, status: 0, stdout: '', stderr: '[WebServer] An unhandled exception occurred: Port 4314 is already in use'}), () => {});
  const result = runSteps(name => name === 'i18nUnit' ? collision : {status:0}, [['i18nUnit','lane','test:i18n'],['gate','yarn','check']], {gate:['i18nUnit']});
  assert.equal(result.passed, false);
  assert.equal(result.results[0].status, 'failed');
  assert.deepEqual(result.results[1].blockers, ['i18nUnit']);
});
