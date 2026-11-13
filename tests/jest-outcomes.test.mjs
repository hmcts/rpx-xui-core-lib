import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { jestOutcomes } from '../scripts/jest-outcomes.mjs';

const nodeWorkspace = createRequire(new URL('../projects/core-lib/node/package.json', import.meta.url));
const cli = join(dirname(nodeWorkspace.resolve('jest/package.json')), 'bin/jest.js');
const relativeSpec = 'projects/core-lib/node/server/evidence/native.spec.ts';
let root, native;

before(() => {
  root = mkdtempSync(join(tmpdir(), 'core-native-jest-'));
  const file = join(root, relativeSpec);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, "describe('native evidence', () => { test('first', () => expect(1).toBe(1)); test('second', () => expect(2).toBe(2)); });\n");
  const output = join(root, 'results.json');
  const result = spawnSync(process.execPath, [cli, '--config', JSON.stringify({ rootDir: root, testMatch: ['**/*.spec.ts'], transform: {} }), '--runInBand', '--json', '--outputFile', output], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  native = JSON.parse(readFileSync(output, 'utf8'));
});
after(() => { if (root) rmSync(root, { recursive: true, force: true }); });

test('accepts real native Jest output with stable individual test identities', () => {
  assert.deepEqual(jestOutcomes(JSON.stringify(native)), [
    { id: `${relativeSpec} native evidence first`, passed: true },
    { id: `${relativeSpec} native evidence second`, passed: true },
  ]);
});

test('normalizes native CI and Windows suite paths for replay', () => {
  for (const prefix of ['/__w/core/core/', 'C:\\agent\\work\\core\\', '']) {
    const report = structuredClone(native);
    report.testResults[0].name = prefix + (prefix.includes('\\') ? relativeSpec.replaceAll('/', '\\') : relativeSpec);
    assert.deepEqual(jestOutcomes(JSON.stringify(report)), jestOutcomes(JSON.stringify(native)));
  }
});

const mutations = {
  'unsuccessful run': report => { report.success = false; },
  interruption: report => { report.wasInterrupted = true; },
  'empty suites': report => { report.testResults = []; report.numTotalTests = report.numPassedTests = 0; report.numTotalTestSuites = report.numPassedTestSuites = 0; },
  'missing suite': report => { delete report.testResults; },
  'inconsistent test total': report => { report.numTotalTests += 1; report.numPassedTests += 1; },
  'inconsistent suite total': report => { report.numTotalTestSuites += 1; report.numPassedTestSuites += 1; },
  'noninteger total': report => { report.numTotalTests = report.numPassedTests = 2.5; },
  'missing failed total': report => { delete report.numFailedTests; },
  'runtime error total': report => { report.numRuntimeErrorTestSuites = 1; },
  'pending suite total': report => { report.numPendingTestSuites = 1; },
  'snapshot failure': report => { report.snapshot.failure = true; },
  'open handles': report => { report.openHandles = [{}]; },
  'failed suite': report => { report.testResults[0].status = 'failed'; },
  'runtime suite error': report => { report.testResults[0].testExecError = { message: 'synthetic error' }; },
  'suite error message': report => { report.testResults[0].message = 'synthetic error'; },
  'unfinished suite': report => { delete report.testResults[0].endTime; },
  'empty assertions': report => { report.testResults[0].assertionResults = []; },
  'duplicate suite': report => { report.testResults.push(structuredClone(report.testResults[0])); report.numTotalTests *= 2; report.numPassedTests *= 2; report.numTotalTestSuites *= 2; report.numPassedTestSuites *= 2; },
  'duplicate assertion': report => { report.testResults[0].assertionResults.push(structuredClone(report.testResults[0].assertionResults[0])); report.numTotalTests += 1; report.numPassedTests += 1; },
  'foreign spec path': report => { report.testResults[0].name = '/elsewhere/native.spec.ts'; },
  'traversal in spec path': report => { report.testResults[0].name = '/checkout/projects/core-lib/node/server/../native.spec.ts'; },
  'malformed spec suffix': report => { report.testResults[0].name += '\n'; },
  'expected failure': report => { report.testResults[0].assertionResults[0].failing = true; },
  'zero assertions': report => { report.testResults[0].assertionResults[0].numPassingAsserts = 0; },
  'missing assertion count': report => { delete report.testResults[0].assertionResults[0].numPassingAsserts; },
  'negative assertion count': report => { report.testResults[0].assertionResults[0].numPassingAsserts = -1; },
  'fractional assertion count': report => { report.testResults[0].assertionResults[0].numPassingAsserts = 1.5; },
  retry: report => { report.testResults[0].assertionResults[0].invocations = 2; },
  'retry messages': report => { report.testResults[0].assertionResults[0].retryMessages = ['previous failure']; },
  'retry reasons': report => { report.testResults[0].assertionResults[0].retryReasons = [{}]; },
  'failure details': report => { report.testResults[0].assertionResults[0].failureDetails = [{}]; },
  'failure messages': report => { report.testResults[0].assertionResults[0].failureMessages = ['previous failure']; },
  'inconsistent full name': report => { report.testResults[0].assertionResults[0].fullName = 'invented result'; },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`rejects native Jest ${name}`, () => {
    const report = structuredClone(native);
    mutate(report);
    assert.throws(() => jestOutcomes(JSON.stringify(report)), /native Jest report/);
  });
}

for (const status of ['failed', 'pending', 'todo', 'disabled', 'skipped']) {
  test(`rejects ${status} assertions even when aggregate totals claim success`, () => {
    const report = structuredClone(native);
    report.testResults[0].assertionResults[0].status = status;
    assert.throws(() => jestOutcomes(JSON.stringify(report)), /native Jest report/);
  });
}

test('rejects malformed JSON and nonreport values', () => {
  for (const text of ['{', 'null', '[]', '{}', 'true', '"passed"']) assert.throws(() => jestOutcomes(text));
});
