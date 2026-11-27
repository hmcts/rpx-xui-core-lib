import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertPackedBrowserReport } from './package/packed-browser.mjs';
const required = [{ projectName: 'chromium', title: 'required journey' }];
function report() {
  return { stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 }, errors: [], suites: [{ specs: [{ title: 'required journey', tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] }] }] };
}
test('packed browser proof accepts the exact required project and title once', () => {
  assert.doesNotThrow(() => assertPackedBrowserReport(report(), required));
});
for (const [name, mutate] of Object.entries({
  missing: value => { value.suites[0].specs = []; },
  duplicate: value => { value.suites[0].specs.push(structuredClone(value.suites[0].specs[0])); },
  unregistered: value => { const extra = structuredClone(value.suites[0].specs[0]); extra.title = 'unexpected journey'; value.suites[0].specs.push(extra); },
  project: value => { value.suites[0].specs[0].tests[0].projectName = 'firefox'; },
  skipped: value => { value.suites[0].specs[0].tests[0].results[0].status = 'skipped'; },
  retry: value => { value.suites[0].specs[0].tests[0].results.unshift({ status: 'failed' }); },
  globalError: value => { value.errors.push({ message: 'Host failed' }); }
})) {
  test(`packed browser proof rejects ${name} outcomes`, () => {
    const value = report();
    mutate(value);
    assert.throws(() => assertPackedBrowserReport(value, required));
  });
}
test('packed browser proof rejects an empty required feature inventory', () => {
  assert.throws(() => assertPackedBrowserReport({ errors: [], suites: [] }, []), /required/i);
});

for (const field of ['expected', 'unexpected', 'skipped', 'flaky']) {
  test(`packed browser proof rejects contradictory ${field} summaries`, () => {
    const value = report();
    value.stats[field] += 1;
    assert.throws(() => assertPackedBrowserReport(value, required));
  });
}
