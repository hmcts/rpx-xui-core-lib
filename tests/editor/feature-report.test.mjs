import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFeatureReport } from './feature-report.mjs';

const passed = { schemaVersion: 1, runner: 'vitest', complete: true, errors: [], tests: [{ fullName: 'Feature <unsafe> works', status: 'pass' }] };

test('reports native Vitest outcomes and escapes names', () => {
  const html = renderFeatureReport(passed);
  assert.match(html, /Completed Vitest browser contract run/);
  assert.match(html, /Feature &lt;unsafe&gt;/);
  assert.doesNotMatch(html, /<unsafe>/);
  assert.match(html, /<strong>Passed<\/strong><h2>1<\/h2>/);
});

test('does not mark malformed, failed, or empty evidence complete', () => {
  for (const report of [
    { ...passed, complete: false },
    { ...passed, errors: ['browser error'] },
    { ...passed, tests: [] },
    { ...passed, tests: [{ fullName: 'Feature broken', status: 'fail' }] },
    { ...passed, tests: [passed.tests[0], passed.tests[0]] }
  ]) assert.match(renderFeatureReport(report), /Incomplete or failed run/);
});
