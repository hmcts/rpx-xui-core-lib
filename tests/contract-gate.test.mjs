import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkContracts } from '../scripts/check-contracts.mjs';

const unitNames = [
  'rejects an empty group with the default minimum',
  'rejects unchecked controls',
  'accepts one actual true by default',
  'rejects truthy non-boolean values',
  'rejects fewer than the configured minimum',
  'accepts the exact configured minimum',
  'accepts zero when zero is explicitly required',
];
const nodeNames = [
  'arrayPatternMatch() matches ["pui-organisation-manager", "pui-user-manager", "pui-finance-manager"] to user-manager expecting true',
  'arrayPatternMatch() matches ["pui-organisation-manager", "pui-user-manager", "pui-finance-manager"] to . expecting true',
  'arrayPatternMatch() matches ["pui-organisation-manager", "pui-user-manager", "pui-finance-manager"] to dwp expecting false',
  'isRoleMatch() matches pui-case-manager to case-',
  'isRoleMatch() matches pui-case-manager to pui',
  'isRoleMatch() matches pui-case-manager to dwp-',
  'isRoleMatch() matches pui to .',
  'empty roles do not match, including an invalid unused pattern',
  'invalid patterns throw SyntaxError for a string or nonempty roles',
];
const i18nNames = [
  "matchCase should return the second string with the same case as the first string if the first character is uppercase",
  "matchCase should return the second string in lowercase if the first character is lowercase",
  "matchCase should return the second string as is if either string is empty",
  "replacePlaceholders should replace placeholders with the correct values - example 1",
  "replacePlaceholders should replace placeholders with the correct values - example 2",
  "replacePlaceholders should replace placeholders with the correct values - example 3",
  "RpxTranslatePipe create an instance",
  "RpxTranslatePipe transform should return null when called with null or undefined",
  "RpxTranslatePipe transform should return the same string when called with a string",
  "RpxTranslatePipe transform should call getTranslation with the string argument when no replacements or yesOrNo are provided",
  "RpxTranslatePipe transform should call getTranslationWithReplacements with the string and replacements arguments when replacements are provided",
  "RpxTranslatePipe transform should call getYesTranslationReplacement with the string and yesOrNo argument when yesOrNo is \"yes\"",
  "RpxTranslatePipe transform should call getNoTranslationReplacement with the string and yesOrNo argument when yesOrNo is \"no\"",
  "RpxTranslationService should be created",
  "RpxTranslationService should return the default language en as a string",
  "RpxTranslationService should normalise repeated spacing before translating a phrase",
  "RpxTranslationService should normalise multiple spacing runs before translating a phrase",
  "RpxTranslationService should preserve markdown line breaks while normalising horizontal spacing",
  "RpxTranslationService should request the normalised phrase when loading a phrase with multiple spaces",
  "RpxTranslationService should not call load method with given phrase, language, and yesOrNo value when translation not found in DB",
  "RpxTranslationService shouldTranslate should return false for phrases without alphabetic characters",
  "RpxTranslationService shouldTranslate should return true for phrases with alphabetic characters",
  "RpxTranslationService shouldTranslate should return false for phrases containing [Translation in progress]",
  "RpxTranslationService shouldTranslate should return true for phrases not containing [Translation in progress]",
  "RpxTranslationService shouldTranslate should return false for placeholder-only phrases",
  "RpxTranslationService shouldTranslate should return true for phrases containing placeholders with other text",
  "RpxTranslationService shouldTranslate should return false for null or undefined phrases",
  "RpxTranslationService Null/Undefined handling should handle null phrase in normalisePhraseSpacing",
  "RpxTranslationService Null/Undefined handling should handle undefined phrase in normalisePhraseSpacing",
  "RpxTranslationService Null/Undefined handling should handle empty string in normalisePhraseSpacing",
  "RpxTranslationService Null/Undefined handling should handle null phrase in getTranslation$",
  "RpxTranslationService Null/Undefined handling should handle undefined phrase in getTranslation$",
  "RpxTranslationService Null/Undefined handling should safely get persisted language when cookie not set",
  "RpxTranslationService Null/Undefined handling should safely get persisted language when cookie is set",
  "RpxTranslationService Null/Undefined handling should handle normalisePhraseSpacing with multiple spaces and null/undefined",
  "RpxTranslationService Null/Undefined handling should handle shouldTranslate with various null/undefined edge cases",
  "RpxTranslationService Null/Undefined handling should handle getTranslationWithYesOrNo$ with null yesOrNoValue",
  "RpxTranslationService Null/Undefined handling should handle getTranslationWithReplacements$ with empty replacements",
  "canonical translation provider scope forChild inherits the root service and configuration identities",
  "canonical translation provider scope a child injector can override configuration without replacing the root service",
  "canonical translation provider scope renders the real public pipe through the root module",
  "RpxTranslationService language changes retires a pending cache lookup on English selection and can reuse Welsh cache later",
  "RpxTranslationService language changes caches a late Welsh response without overwriting English",
  "RpxTranslationService language changes does not replace English with a stale failed-request fallback",
  "RpxTranslationService language changes returns English for phrases matching inherited Object property names",
  "RpxTranslationService public API composition translates only static fragments and preserves repeated numeric replacements and spacing",
  "RpxTranslationService public API composition selects Yes/No metadata and matches each input’s initial letter case from one request",
  "RpxTranslationService public API composition restores original Yes/No inputs after a successful response without answer metadata",
  "RpxTranslationService request lifecycle batches distinct phrases and deduplicates repeated subscriptions and normalized aliases",
  "RpxTranslationService request lifecycle uses source fallback in production mode and allows a subsequent phrase to translate",
  "RpxTranslationService overlapping batches keeps a queued second batch after an in-flight success",
  "RpxTranslationService overlapping batches keeps a queued second batch after an in-flight failure",
  "RpxTranslationService overlapping batches keeps dispatched batches independent when the second finishes before the first success",
  "RpxTranslationService overlapping batches keeps dispatched batches independent when the second finishes before the first failure",
  "RpxTranslationService phrase dictionary keys keeps hasOwnProperty and subsequent phrases working across a language change and HTTP success",
  "RpxTranslationService phrase dictionary keys keeps hasOwnProperty and subsequent phrases working across a language change and HTTP failure",
  "RpxTranslationService phrase dictionary keys keeps __proto__ and subsequent phrases working across a language change and HTTP success",
  "RpxTranslationService phrase dictionary keys keeps __proto__ and subsequent phrases working across a language change and HTTP failure"
];
const i18nJourneys = ['a late Welsh response preserves English and is reused after switching back', 'locale switches reuse persisted translations across English and page reloads', 'a translation HTTP failure returns and caches the original phrase'];
const journey = 'keyboard checkbox toggles update real FormGroup validity and submitted errors';
const packageIds = [
  'package.physical-secondary-declaration', 'package.strict-node', 'package.strict-bundler',
  'package.installed-runtime', 'package.missing-declaration-fault', 'package.restored-node',
  'package.physical-node', 'package.installed-node-runtime', 'package.browser-denied',
  'package.missing-marker-fault', 'package.restored-node-runtime',
  'package.physical-i18n', 'package.staged-i18n-identity',
];

/** @returns {Record<string, any>} */
function reports() {
  return {
    'validation.tap': `TAP version 13\n${unitNames.map((name, index) => `ok ${index + 1} - ${name}`).join('\n')}\n1..7\n# tests 7\n# pass 7\n# fail 0\n`,
    'node-jest.json': { success: true, numTotalTests: 9, numPassedTests: 9, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0, testResults: [{ status: 'passed', assertionResults: nodeNames.map((fullName) => ({ fullName, status: 'passed' })) }] },
    'i18n/junit.xml': `<?xml version="1.0"?><testsuite name="Chrome Headless" tests="58" errors="0" failures="0">${i18nNames.map((name) => `<testcase name="${name.replaceAll('&', '&amp;').replaceAll('\"', '&quot;')}"/>`).join('')}</testsuite>`,
    'browser.json': { errors: [], suites: [{ specs: [journey, ...i18nJourneys].map((title) => ({ title, tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] },
    'package.json': { schemaVersion: 1, package: { sha256: 'a'.repeat(64) }, tests: packageIds.map((id) => ({ id, status: 'passed' })) },
  };
}

function checkFixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'core-contract-gate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'test-results'));
  for (const [file, report] of Object.entries(files)) {
    mkdirSync(dirname(join(root, 'test-results', file)), { recursive: true });
    writeFileSync(join(root, 'test-results', file), typeof report === 'string' ? report : JSON.stringify(report));
  }
  return () => checkContracts(root);
}

test('accepts all independently required successful contracts', (t) => {
  assert.equal(checkFixture(t, reports())(), 91);
});

for (const file of ['validation.tap', 'browser.json', 'package.json', 'node-jest.json', 'i18n/junit.xml']) {
  test(`rejects missing ${file} even when other reports pass`, (t) => {
    const files = reports();
    delete files[file];
    assert.throws(checkFixture(t, files), /ENOENT|report/i);
  });
  test(`rejects empty ${file}`, (t) => {
    const files = reports();
    files[file] = '';
    assert.throws(checkFixture(t, files));
  });
}

for (const name of unitNames) {
  test(`rejects a filtered-out unit contract: ${name}`, (t) => {
    const files = reports();
    files['validation.tap'] = `TAP version 13\n${unitNames.filter((value) => value !== name).map((value, index) => `ok ${index + 1} - ${value}`).join('\n')}\n1..6\n`;
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const outcome of ['not ok 1', 'ok 1 # SKIP', 'ok 1 # TODO']) {
  test(`rejects unsuccessful native TAP outcome ${outcome}`, (t) => {
    const files = reports();
    files['validation.tap'] = files['validation.tap'].replace(`ok 1 - ${unitNames[0]}`, outcome.startsWith('not') ? `not ok 1 - ${unitNames[0]}` : `ok 1 - ${unitNames[0]} ${outcome.slice(5)}`);
    assert.throws(checkFixture(t, files), /pass|skip|todo|contract/i);
  });
}

test('rejects truncated TAP without a complete plan', (t) => {
  const files = reports();
  files['validation.tap'] = files['validation.tap'].replace('1..7\n', '');
  assert.throws(checkFixture(t, files), /plan|TAP/i);
});

test('rejects duplicate native outcomes', (t) => {
  const files = reports();
  files['validation.tap'] = files['validation.tap'].replace('1..7', `ok 8 - ${unitNames[0]}\n1..8`);
  assert.throws(checkFixture(t, files), /duplicate|once/i);
});

for (const status of ['failed', 'skipped', 'timedOut', 'interrupted']) {
  test(`rejects browser result ${status}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs[0].tests[0].results[0].status = status;
    assert.throws(checkFixture(t, files), /pass|contract/i);
  });
}

for (const replacement of [[], [{ title: 'a different passing journey', tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] }]]) {
  test('rejects an excluded browser journey despite an otherwise green report', (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = replacement;
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

test('rejects expected browser failure and empty attempts', (t) => {
  for (const change of [{ expectedStatus: 'failed' }, { results: [] }]) {
    const files = reports();
    Object.assign(files['browser.json'].suites[0].specs[0].tests[0], change);
    assert.throws(checkFixture(t, files), /pass|contract/i);
  }
});

test('rejects browser global errors', (t) => {
  const files = reports();
  files['browser.json'].errors.push({ message: 'worker crashed' });
  assert.throws(checkFixture(t, files), /error/i);
});

for (const id of packageIds) {
  test(`rejects missing package contract ${id}`, (t) => {
    const files = reports();
    files['package.json'].tests = files['package.json'].tests.filter((entry) => entry.id !== id);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

test('rejects unsuccessful package checks, empty checks, and invalid artifact hashes', (t) => {
  for (const change of [
    { tests: [{ id: packageIds[0], status: 'failed' }] },
    { tests: [] },
    { package: { sha256: '' } },
    { schemaVersion: 2 },
  ]) {
    const files = reports();
    Object.assign(files['package.json'], change);
    assert.throws(checkFixture(t, files));
  }
});

for (const file of ['browser.json', 'package.json']) {
  test(`rejects malformed ${file}`, (t) => {
    const files = reports();
    files[file] = '{broken';
    assert.throws(checkFixture(t, files));
  });
}

test('accepts a real native node:test TAP stream', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'core-native-tap-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'native.test.mjs');
  writeFileSync(file, `import { test } from 'node:test';\nfor (const name of ${JSON.stringify(unitNames)}) test(name, () => {});`);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const files = reports();
  files['validation.tap'] = result.stdout;
  assert.equal(checkFixture(t, files)(), 91);
});

for (const file of ['browser.json', 'package.json']) {
  test(`rejects duplicate required outcomes in ${file}`, (t) => {
    const files = reports();
    if (file === 'browser.json') files[file].suites[0].specs.push(files[file].suites[0].specs[0]);
    else files[file].tests.push(files[file].tests[0]);
    assert.throws(checkFixture(t, files), /duplicate|once/i);
  });
}

test('rejects contradictory nonzero native TAP failure summaries', (t) => {
  for (const summary of ['fail', 'cancelled', 'skipped', 'todo']) {
    const files = reports();
    files['validation.tap'] += `# ${summary} 1\n`;
    assert.throws(checkFixture(t, files), /pass|TAP|report/i);
  }
});

test('rejects a passing same-title journey from the wrong project', (t) => {
  const files = reports();
  files['browser.json'].suites[0].specs[0].tests[0].projectName = 'firefox';
  assert.throws(checkFixture(t, files), /missing|required/i);
});

test('rejects an absent or empty browser project name', (t) => {
  for (const projectName of [undefined, '']) {
    const files = reports();
    files['browser.json'].suites[0].specs[0].tests[0].projectName = projectName;
    assert.throws(checkFixture(t, files), /contract|missing|required/i);
  }
});

for (const name of nodeNames) {
  test(`rejects a filtered-out Jest contract: ${name}`, (t) => {
    const files = reports();
    files['node-jest.json'].testResults[0].assertionResults = files['node-jest.json'].testResults[0].assertionResults.filter((result) => result.fullName !== name);
    files['node-jest.json'].numTotalTests -= 1;
    files['node-jest.json'].numPassedTests -= 1;
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const status of ['failed', 'pending', 'todo']) {
  test(`rejects a ${status} Jest contract`, (t) => {
    const files = reports();
    files['node-jest.json'].testResults[0].assertionResults[0].status = status;
    assert.throws(checkFixture(t, files), /pass|Jest|contract/i);
  });
}

test('rejects Jest failure summaries and interrupted suites', (t) => {
  for (const change of [{ success: false }, { numFailedTests: 1 }, { numPendingTests: 1 }, { numTodoTests: 1 }, { numTotalTests: 10 }, { testResults: [] }]) {
    const files = reports();
    Object.assign(files['node-jest.json'], change);
    assert.throws(checkFixture(t, files), /Jest|pass|report|missing|required/i);
  }
});

for (const status of ['failure', 'error', 'skipped']) {
  test(`rejects a ${status} native Karma outcome`, (t) => {
    const files = reports();
    files['i18n/junit.xml'] = files['i18n/junit.xml'].replace('/>', `><${status}/></testcase>`);
    assert.throws(checkFixture(t, files), /pass|Karma|report/i);
  });
}

test('rejects a filtered native Karma contract and contradictory totals', (t) => {
  for (const change of [
    (xml) => xml.replace(/<testcase [^>]+\/>/, '').replace('tests="58"', 'tests="57"'),
    (xml) => xml.replace('tests="58"', 'tests="59"'),
    (xml) => xml.replace('failures="0"', 'failures="1"'),
    (xml) => xml.replace('</testsuite>', ''),
  ]) {
    const files = reports();
    files['i18n/junit.xml'] = change(files['i18n/junit.xml']);
    assert.throws(checkFixture(t, files), /missing|required|Karma|report/i);
  }
});
