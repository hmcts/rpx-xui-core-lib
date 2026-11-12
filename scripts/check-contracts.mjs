import { createHash } from 'node:crypto';
import { currentIdentity } from './evidence-identity.mjs';
import { verifyBoundEvidence } from './evidence-lane-receipts.mjs';
import { sourceSnapshot } from './evidence-source-snapshot.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contracts = JSON.parse(readFileSync(new URL('../tests/contracts.json', import.meta.url), 'utf8'));
const expectedJasmineVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).devDependencies['jasmine-core'];

function unitOutcomes(text) {
  // This slice has only top-level node:test scenarios; nested suites need a native structured reporter.
  const outcomes = [...text.matchAll(/^(ok|not ok) (\d+) - (.+)$/gm)].map((match) => {
    const [id, directive] = match[3].split(/ # /);
    return { id, passed: match[1] === 'ok' && !directive, number: Number(match[2]) };
  });
  const plans = [...text.matchAll(/^1\.\.(\d+)$/gm)];
  const summaries = ['tests', 'pass', 'fail', 'suites', 'cancelled', 'skipped', 'todo'];
  const inconsistentSummary = summaries.some((name) => {
    const matches = [...text.matchAll(new RegExp(`^# ${name} (\\d+)$`, 'gm'))];
    const expected = name === 'tests' || name === 'pass' ? outcomes.length : 0;
    return matches.length > 1 || (['tests', 'pass', 'fail'].includes(name) && matches.length !== 1) ||
      (matches.length === 1 && Number(matches[0][1]) !== expected);
  });
  if (
    !text.startsWith('TAP version 13\n') || plans.length !== 1 || inconsistentSummary ||
    /^\s+(?:ok|not ok) \d+/m.test(text) ||
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

function invalidJasmineReport() {
  throw new Error('Malformed or unsuccessful native Jasmine report');
}

function validateJasmineEnvelope(report) {
  if (!report || report.schemaVersion !== 1 || report.complete !== true ||
    report.jasmineVersion !== expectedJasmineVersion || !Array.isArray(report.browserErrors) || report.browserErrors.length ||
    (report.driverError !== undefined && report.driverError !== null && report.driverError !== '') ||
    !Array.isArray(report.events) || report.events.length < 3) invalidJasmineReport();
  const events = report.events;
  if (events[0]?.type !== 'jasmineStarted' || events.at(-1)?.type !== 'jasmineDone') invalidJasmineReport();
  const defined = events[0].result?.totalSpecsDefined;
  if (!Number.isSafeInteger(defined) || defined < 1) invalidJasmineReport();
  return defined;
}

function validateJasmineEvent(event, index, eventCount) {
  const result = event?.result;
  if (!result || typeof result !== 'object' || Array.isArray(result)) invalidJasmineReport();
  if (event.type === 'jasmineStarted') {
    if (index !== 0) invalidJasmineReport();
    return;
  }
  if (!Array.isArray(result.failedExpectations) || result.failedExpectations.length ||
    !Array.isArray(result.deprecationWarnings) || result.deprecationWarnings.length) invalidJasmineReport();
  if (event.type === 'jasmineDone') {
    if (index !== eventCount - 1 || result.overallStatus !== 'passed' || result.incompleteReason) invalidJasmineReport();
  } else if (event.type !== 'specDone' && event.type !== 'suiteDone') invalidJasmineReport();
}

function recordJasmineResult(event, state) {
  const result = event.result;
  if (typeof result.id !== 'string' || !result.id || typeof result.fullName !== 'string' ||
    !result.fullName.trim() || result.status !== 'passed') invalidJasmineReport();
  const ids = event.type === 'specDone' ? state.specs : state.suites;
  if (ids.has(result.id)) invalidJasmineReport();
  ids.add(result.id);
  if (event.type === 'specDone') {
    if (state.names.has(result.fullName)) invalidJasmineReport();
    state.names.add(result.fullName);
    state.outcomes.push({ id: result.fullName, passed: true });
  }
}

function jasmineOutcomes(text) {
  const report = JSON.parse(text);
  const defined = validateJasmineEnvelope(report);
  const events = report.events;
  const state = { specs: new Set(), names: new Set(), suites: new Set(), outcomes: [] };
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    validateJasmineEvent(event, index, events.length);
    if (event.type === 'jasmineStarted' || event.type === 'jasmineDone') continue;
    recordJasmineResult(event, state);
  }
  if (!state.suites.size || state.specs.size !== defined) invalidJasmineReport();
  return state.outcomes;
}

function packageOutcomes(report, reportRoot, expectedIdentity) {
  const pkg = report.package;
  if (report.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(pkg?.sha256 ?? '') ||
    typeof pkg.dirty !== 'boolean' || !Array.isArray(report.tests) ||
    ['sourceSha', 'runId', 'attempt'].some((key) => typeof pkg[key] !== 'string' || !pkg[key] || pkg[key] !== expectedIdentity[key])) {
    throw new Error('Malformed package contract report or mismatched identity');
  }
  const candidate = readFileSync(resolve(reportRoot, 'test-results/package-evidence/candidate.tgz'));
  if (createHash('sha256').update(candidate).digest('hex') !== pkg.sha256) throw new Error('Package artifact hash mismatch');
  return report.tests.map((test) => ({ id: test.id, passed: test.status === 'passed' }));
}

export function checkContracts(reportRoot = root, expectedIdentity) {
  if (!expectedIdentity || ['sourceSha', 'runId', 'attempt'].some((key) => typeof expectedIdentity[key] !== 'string' || !expectedIdentity[key])) throw new Error('Expected run identity is required');
  verifyBoundEvidence(reportRoot, expectedIdentity);
  const parsers = { refDataUnit: unitOutcomes, locationUnit: unitOutcomes, windowUnit: unitOutcomes, cookieUnit: unitOutcomes, featureToggleUnit: unitOutcomes, roleUnit: unitOutcomes, i18nUnit: jasmineOutcomes, nodeUnit: unitOutcomes, unit: unitOutcomes, browser: (text) => browserOutcomes(JSON.parse(text)), cacheBrowser: (text) => browserOutcomes(JSON.parse(text)), package: (text) => packageOutcomes(JSON.parse(text), reportRoot, expectedIdentity) };
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
    const args = process.argv.slice(2);
    const options = {};
    const names = ['--report-root', '--source-sha', '--run-id', '--attempt'];
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index];
      if (!names.includes(key) || Object.hasOwn(options, key) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Invalid replay arguments');
      options[key] = args[index + 1];
    }
    if (args.length && (args.length !== 8 || names.some((key) => !options[key]))) throw new Error('Replay requires --report-root, --source-sha, --run-id and --attempt');
    const expected = args.length ? { sourceSha: options['--source-sha'], runId: options['--run-id'], attempt: options['--attempt'] } : currentIdentity(root);
    if (!args.length && !process.env.GITHUB_RUN_ID && !process.env.CORE_EVIDENCE_RUN_ID) {
      const recorded = JSON.parse(readFileSync(resolve(root, 'test-results/lane-provenance/run.json'), 'utf8'));
      if (recorded.sourceSha !== expected.sourceSha || recorded.attempt !== expected.attempt || typeof recorded.runId !== 'string' || !recorded.runId || recorded.runId === 'local') throw new Error('Missing or mismatched local run identity');
      expected.runId = recorded.runId;
    }
    if (!args.length) {
      const recorded = JSON.parse(readFileSync(resolve(root, 'test-results/lane-provenance/run.json'), 'utf8'));
      if (sourceSnapshot(root) !== recorded.sourceSnapshot) throw new Error('Source changed since evidence run began');
    }
    console.log(`Required contracts passed: ${checkContracts(options['--report-root'] ?? root, expected)}`);
  } catch (error) {
    console.error(`Required-contract gate failed: ${error.message}`);
    process.exitCode = 1;
  }
}
