import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectVitestResults } from './reporters/vitest-evidence-reporter.mjs';
import { vitestOutcomes } from '../scripts/check-contracts.mjs';

const passing = () => collectVitestResults([{ tasks: [{ type: 'suite', name: 'Translation', tasks: [
  { type: 'test', name: 'returns Welsh phrase', result: { state: 'pass' } }
] }] }]);

test('native Vitest receipt preserves full contract names', () => {
  assert.deepEqual(vitestOutcomes(JSON.stringify(passing())), [{ id: 'Translation returns Welsh phrase', passed: true }]);
});

/** @type {Array<[string, (report: ReturnType<typeof passing>) => void]>} */
const invalidReceipts = [
  ['missing completion', report => { report.complete = false; }],
  ['wrong runner', report => { report.runner = 'jasmine'; }],
  ['wrong installed version', report => { report.vitestVersion = '0.0.0'; }],
  ['global error', report => { report.errors.push('browser crashed'); }],
  ['unexpected console error', report => { report.consoleErrors.push({ taskId: 'test-1', content: 'Unexpected browser error' }); }],
  ['unattributed console error', report => { report.consoleErrors.push({ taskId: null, content: 'Translation cache read failed' }); }],
  ['failed test', report => { report.tests[0].status = 'fail'; }],
  ['skipped test', report => { report.tests[0].status = 'skip'; }],
  ['empty test set', report => { report.tests = []; }],
  ['duplicate name', report => { report.tests.push({ ...report.tests[0] }); }],
  ['empty name', report => { report.tests[0].fullName = ''; }]
];
for (const [name, mutate] of invalidReceipts) {
  test(`native Vitest receipt rejects ${name}`, () => {
    const report = passing();
    mutate(report);
    assert.throws(() => vitestOutcomes(JSON.stringify(report)));
  });
}
