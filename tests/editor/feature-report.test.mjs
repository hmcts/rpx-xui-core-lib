import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFeatureReport } from './feature-report.mjs';

test('reports actual outcomes and escapes descriptions', () => {
  const html = renderFeatureReport({ complete: false, browserErrors: ['sensitive diagnostic'], driverError: 'private detail', events: [
    { type: 'suiteDone', result: { id: 'one', fullName: 'Feature <unsafe>', status: 'failed', failedExpectations: [] } },
    { type: 'specDone', result: { parentSuiteId: 'one', description: 'passes', status: 'passed' } },
    { type: 'specDone', result: { parentSuiteId: 'one', description: '<script>', status: 'failed' } },
    { type: 'specDone', result: { parentSuiteId: 'missing', description: 'pending', status: 'pending' } }
  ] });
  assert.match(html, /Incomplete or failed run/);
  assert.match(html, /<strong>Tests<\/strong><h2>3<\/h2>/);
  assert.match(html, /<strong>Passed<\/strong><h2>1<\/h2>/);
  assert.match(html, /<strong>Failed<\/strong><h2>1<\/h2>/);
  assert.match(html, /<strong>Skipped<\/strong><h2>1<\/h2>/);
  assert.match(html, /<strong>Other outcomes<\/strong><h2>0<\/h2>/);
  assert.match(html, /Feature &lt;unsafe&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Unattributed/);
  assert.match(html, /<strong>Suite errors<\/strong><h2>1<\/h2>/);
  assert.match(html, /<strong>Browser errors<\/strong><h2>1<\/h2>/);
  assert.match(html, /<strong>Driver errors<\/strong><h2>1<\/h2>/);
  assert.doesNotMatch(html, /sensitive diagnostic|private detail/);
});

test('does not describe a completed empty result as coverage', () => {
  const html = renderFeatureReport({ complete: true, events: [] });
  assert.match(html, /This shows executed tests, not code coverage or consumer acceptance/);
  assert.match(html, /<strong>Tests<\/strong><h2>0<\/h2>/);
});

test('does not call malformed, failed or partial runs complete', () => {
  const start = { type: 'jasmineStarted', result: { totalSpecsDefined: 1 } };
  const suite = { type: 'suiteDone', result: { id: 'suite', fullName: 'Example', status: 'passed', failedExpectations: [] } };
  const spec = { type: 'specDone', result: { id: 'spec', parentSuiteId: 'suite', description: 'case', status: 'passed' } };
  const done = { type: 'jasmineDone', result: { overallStatus: 'passed', failedExpectations: [] } };
  const valid = { complete: true, browserErrors: [], events: [start, spec, suite, done] };
  assert.match(renderFeatureReport(valid), /Completed Jasmine contract run/);
  for (const report of [
    { complete: true, events: [] },
    { ...valid, events: [start, spec, suite] },
    { ...valid, events: [{ ...start, result: { totalSpecsDefined: 2 } }, spec, suite, done] },
    { ...valid, events: [start, spec, { ...suite, result: { ...suite.result, status: 'failed' } }, done] },
    { ...valid, events: [start, spec, { ...suite, result: { ...suite.result, status: 'pending' } }, done] },
    { ...valid, browserErrors: ['page error'] }
  ]) assert.match(renderFeatureReport(report), /Incomplete or failed run/);
});
