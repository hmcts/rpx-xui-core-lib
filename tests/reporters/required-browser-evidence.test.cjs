const assert = require('node:assert/strict');
const { test } = require('node:test');
const { snapshotInventory, summarize, render } = require('./required-browser-evidence.cjs');
const contracts = [
  { projectName: 'chromium', title: 'first', feature: 'validation' },
  { projectName: 'chromium', title: 'second', feature: 'validation' },
  { projectName: 'chromium', title: 'third', feature: 'contact' },
];
const scenario = (title, status, outcome = status === 'passed' ? 'expected' : status === 'skipped' ? 'skipped' : 'unexpected') => ({ title, parent: { project: () => ({ name: 'chromium' }) }, expectedStatus: status === 'skipped' ? 'skipped' : 'passed', results: status ? [{ status }] : [], outcome: () => outcome });
const suite = (...tests) => ({ allTests: () => tests });

test('filtered, skipped, failed and duplicate required tests remain distinct', () => {
  const snapshot = snapshotInventory(contracts);
  const counts = summarize(snapshot, suite(scenario('first', 'passed'), scenario('second', 'skipped')));
  assert.deepEqual(counts.get('validation'), { passed: 1, failed: 0, skipped: 1, missing: 0, duplicate: 0 });
  assert.equal(counts.get('contact').missing, 1);
  const mixed = summarize(snapshot, suite(scenario('first', 'failed'), scenario('first', 'passed'), scenario('second', 'passed'), scenario('third', 'failed')));
  assert.equal(mixed.get('validation').duplicate, 1);
  assert.equal(mixed.get('contact').failed, 1);
});

test('retries and unrun tests cannot appear passed; inventory snapshot is immutable', () => {
  const snapshot = snapshotInventory(contracts);
  const retry = scenario('first', 'passed', 'flaky');
  retry.results = [{ status: 'failed' }, { status: 'passed' }];
  assert.equal(summarize(snapshot, suite(retry, scenario('second', null))).get('validation').failed, 1);
  assert.equal(summarize(snapshot, suite(retry, scenario('second', null))).get('validation').missing, 1);
  contracts[0].feature = 'changed';
  assert.equal(snapshot.inventory[0].feature, 'validation');
  contracts[0].feature = 'validation';
  assert.notEqual(snapshot.runId, snapshotInventory(contracts).runId);
});

test('malformed and duplicate inventory and absent suite do not yield success', () => {
  assert.throws(() => snapshotInventory([contracts[0], contracts[0]]), /Duplicate/);
  assert.throws(() => snapshotInventory([{ ...contracts[0], feature: '' }]), /Invalid/);
  const snapshot = snapshotInventory(contracts);
  assert.throws(() => summarize(snapshot, null), /unavailable/);
  assert.match(render(snapshot, null, true), /Summary unavailable/);
});

test('all 27 current required contracts are mapped including session dialog', () => {
  const inventory = require('../contracts.json').browser.required;
  assert.equal(inventory.length, 27);
  assert.equal(inventory.filter(item => item.feature === 'contact').length, 2);
  assert.equal(inventory.filter(item => item.feature === 'due-date').length, 3);
  assert.equal(inventory.filter(item => item.feature === 'accessibility').length, 2);
  assert.equal(inventory.filter(item => item.feature === 'session-dialog').length, 6);
  assert.equal([...summarize(snapshotInventory(inventory), suite()).values()].reduce((sum, counts) => sum + counts.missing, 0), 27);
});
