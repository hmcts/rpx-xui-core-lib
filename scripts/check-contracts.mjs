import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contracts = JSON.parse(readFileSync(new URL('../tests/contracts.json', import.meta.url), 'utf8'));

function unitOutcomes(text) {
  // This slice has only top-level node:test scenarios; nested suites need a native structured reporter.
  const outcomes = [...text.matchAll(/^(ok|not ok) (\d+) - (.+)$/gm)].map((match) => {
    const [id, directive] = match[3].split(/ # /);
    return { id, passed: match[1] === 'ok' && !directive, number: Number(match[2]) };
  });
  const plans = [...text.matchAll(/^1\.\.(\d+)$/gm)];
  if (
    !text.startsWith('TAP version 13\n') || plans.length !== 1 ||
    Number(plans[0][1]) !== outcomes.length || !outcomes.length ||
    outcomes.some((entry, index) => entry.number !== index + 1) ||
    /^Bail out!/m.test(text) || /^# (?:fail|cancelled|skipped|todo) [1-9]\d*$/m.test(text)
  ) {
    throw new Error('Malformed or incomplete native TAP report/plan');
  }
  return outcomes;
}

function browserOutcomes(report) {
  if (!Array.isArray(report.errors) || report.errors.length || !Array.isArray(report.suites)) {
    throw new Error('Malformed browser report or global browser errors');
  }
  const outcomes = [];
  function visit(suites) {
    for (const suite of suites) {
      if (suite.specs !== undefined && !Array.isArray(suite.specs)) throw new Error('Malformed browser specs');
      for (const spec of suite.specs ?? []) {
        if (typeof spec.title !== 'string' || !Array.isArray(spec.tests) || !spec.tests.length) throw new Error('Malformed browser contract');
        for (const test of spec.tests) {
          outcomes.push({ id: JSON.stringify([test.projectName, spec.title]), passed: typeof test.projectName === 'string' && test.expectedStatus === 'passed' && test.status === 'expected' && Array.isArray(test.results) && test.results.length === 1 && test.results[0].status === 'passed' });
        }
      }
      if (suite.suites !== undefined && !Array.isArray(suite.suites)) throw new Error('Malformed browser suites');
      visit(suite.suites ?? []);
    }
  }
  visit(report.suites);
  return outcomes;
}

function jestOutcomes(report) {
  if (report.success !== true || !Array.isArray(report.testResults) || !report.testResults.length ||
    report.numFailedTests !== 0 || report.numPendingTests !== 0 || report.numTodoTests !== 0 ||
    report.testResults.some((suite) => suite.status !== 'passed' || !Array.isArray(suite.assertionResults) || !suite.assertionResults.length)) {
    throw new Error('Incomplete or unsuccessful native Jest report');
  }
  const outcomes = report.testResults.flatMap((suite) => suite.assertionResults.map((test) => ({ id: test.fullName, passed: test.status === 'passed' })));
  if (report.numTotalTests !== outcomes.length || report.numPassedTests !== outcomes.length) throw new Error('Inconsistent native Jest totals');
  return outcomes;
}

function packageOutcomes(report) {
  if (report.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(report.package?.sha256 ?? '') || !Array.isArray(report.tests)) {
    throw new Error('Malformed package contract report or missing artifact hash');
  }
  return report.tests.map((test) => ({ id: test.id, passed: test.status === 'passed' }));
}

export function checkContracts(reportRoot = root) {
  const parsers = { nodeUnit: (text) => jestOutcomes(JSON.parse(text)), unit: unitOutcomes, browser: (text) => browserOutcomes(JSON.parse(text)), package: (text) => packageOutcomes(JSON.parse(text)) };
  let count = 0;
  for (const [kind, inventory] of Object.entries(contracts)) {
    const outcomes = parsers[kind](readFileSync(resolve(reportRoot, inventory.report), 'utf8'));
    for (const outcome of outcomes) {
      if (typeof outcome.id !== 'string' || !outcome.passed) throw new Error(`${kind} contract did not pass: ${outcome.id}`);
    }
    for (const required of inventory.required) {
      const id = typeof required === 'string' ? required : JSON.stringify([required.projectName, required.title]);
      const matches = outcomes.filter((outcome) => outcome.id === id);
      if (matches.length !== 1) throw new Error(`${kind} required contract must occur exactly once (missing or duplicate): ${id}`);
      count += 1;
    }
  }
  return count;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`Required contracts passed: ${checkContracts()}`);
  } catch (error) {
    console.error(`Required-contract gate failed: ${error.message}`);
    process.exitCode = 1;
  }
}
