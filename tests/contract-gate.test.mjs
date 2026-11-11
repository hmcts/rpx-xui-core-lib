import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkContracts } from '../scripts/check-contracts.mjs';

const identity = { sourceSha: 'a'.repeat(40), runId: 'fixture', attempt: '1' };
const candidate = Buffer.from('candidate bytes');

const unitNames = [
  'rejects an empty group with the default minimum',
  'rejects unchecked controls',
  'accepts one actual true by default',
  'rejects truthy non-boolean values',
  'rejects fewer than the configured minimum',
  'accepts the exact configured minimum',
  'accepts zero when zero is explicitly required',
  'rejects use on a non-group control with a clear error',
];
const nodeNames = [
  "getUserSessionTimeout matches configuration order and sorts roles in place",
  "getUserSessionTimeout returns the same mutable fallback for unmatched and empty roles",
  "getUserSessionTimeout throws for an invalid pattern only when there are roles to examine",
  "getUserSessionTimeout throws on missing roles or configuration",
  "hasKey includes inherited keys and rejects absent keys",
  "sortArray returns the same array sorted in place",

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
  "replacePlaceholders handles literal metacharacter keys, repeated values and empty literals",
  "RpxTranslatePipe transform passes explicit literal replacements to the service",
  "translation real cache recovery keeps literal values out of requests and real IndexedDB across language changes",
  "RpxTranslationService public API composition keeps explicit literal replacements out of translation requests",
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
  "RpxTranslationService returns English without loading a translation",
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
  "RpxTranslationService phrase dictionary keys keeps __proto__ and subsequent phrases working across a language change and HTTP failure",
  "translation provider lifecycle does not dispatch a pending batch after its owner is destroyed",
  "translation provider lifecycle cancels an in-flight request when its owner is destroyed",
  "translation provider lifecycle cancels all overlapping requests when their owner is destroyed",
  "translation provider lifecycle ignores a cache lookup that finishes after its owner is destroyed",
  "translation provider lifecycle keeps the root service active when a forChild injector is destroyed",
  "translation provider lifecycle handles a synchronously completed HTTP success",
  "translation provider lifecycle handles a synchronously completed HTTP failure",
  "translation provider lifecycle stops response processing if a subscriber destroys the owner",
  "translation provider lifecycle stops cache-miss processing if a subscriber destroys the owner",
  "translation provider lifecycle stops a language change when its subscriber destroys the owner",
  "translation provider lifecycle stops observing cached translations when its owner is destroyed",
  "translation boundary validation accepts only supported persisted and assigned languages",
  "translation boundary validation falls back for malformed response values without caching them and retains valid siblings",
  "translation boundary validation treats rejected cache reads as misses and preserves output when writes reject",
  "translation boundary validation rejects malformed cached values and tolerates deletion failure",
  "translation boundary validation falls back for malformed payloads and metadata, and accepts an empty translation",
  "translation boundary validation uses valid cached empty strings and metadata without HTTP",
  "translation boundary validation tolerates an expired cache deletion failure",
  "translation boundary validation uses own response keys for normalized phrases with inherited property names",
  "translation boundary validation uses the configured test-mode fallback without caching a malformed response",
  "RpxTranslationService Null/Undefined handling returns an empty string for undefined yesOrNoValue without a request",
  "translation real cache recovery recovers from a rejected invalid deletion with real IndexedDB and a fresh service",
  "translation real cache recovery recovers from a rejected expired deletion with real IndexedDB and a fresh service",
  "translation real cache recovery keeps a malformed response fallback stable then recovers after a language cycle",
];
const i18nJourneys = ['a late Welsh response preserves English and is reused after switching back', 'locale switches reuse persisted translations across English and page reloads', 'a translation HTTP failure returns and caches the original phrase', 'local gallery translates through its own synthetic service', 'local gallery demonstrates a synthetic service failure', 'local translation endpoint validates requests'];
const cacheJourneys = [
  "baseline: legacy to core preserves valid cached translation",
  "baseline: core to legacy preserves valid cached translation",
  "baseline: core replaces an expired cache row written by published legacy",
  "aligned: legacy to core preserves valid cached translation",
  "aligned: core to legacy preserves valid cached translation",
  "aligned: core replaces an expired cache row written by published legacy",
  "direct: baseline core to aligned core preserves valid cached translation",
  "direct: aligned core to baseline core preserves valid cached translation",
  "installed core keeps literal values out of requests and IndexedDB after reload"
];
const journey = 'keyboard checkbox toggles update real FormGroup validity and submitted errors';
const validationJourneys = [
  'validation keyboard traversal toggles roles and submits with Enter and Space',
  'validation initial exposes accessible roles and passes axe',
  'validation invalid-submit exposes accessible roles and passes axe',
  'validation valid exposes accessible roles and passes axe',
  'validation axe detects the label rule when a checkbox label is removed',
];
const packageIds = [
  'package.physical-secondary-declaration', 'package.strict-node', 'package.strict-bundler',
  'package.installed-runtime', 'package.missing-declaration-fault', 'package.restored-node',
  'package.physical-node', 'package.installed-node-runtime', 'package.node-loading-fault', 'package.browser-denied',
  'package.missing-marker-fault', 'package.restored-node-runtime',
  'package.physical-i18n', 'package.staged-i18n-identity',
  "package.root-runtime-empty",
  "package.validation-graph",
  "package.root-export-fault",
  "package.validation-i18n-fault",
  "package.restored-runtime-graph",

];

const expectedContracts = unitNames.length + nodeNames.length + i18nNames.length + i18nJourneys.length + cacheJourneys.length + validationJourneys.length + packageIds.length + 1;

function nativeTap(names) {
  return `TAP version 13\n${names.map((name, index) => `ok ${index + 1} - ${name}`).join('\n')}\n1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`;
}

/** @returns {Record<string, any>} */
function reports() {
  return {
    'validation.tap': nativeTap(unitNames),
    'node.tap': nativeTap(nodeNames),
    'i18n/junit.xml': `<?xml version="1.0"?><testsuite name="Chrome Headless" tests="${i18nNames.length}" errors="0" failures="0">${i18nNames.map((name) => `<testcase name="${name.replaceAll('&', '&amp;').replaceAll('\"', '&quot;')}"/>`).join('')}</testsuite>`,
    'browser.json': { errors: [], suites: [{ specs: [journey, ...validationJourneys, ...i18nJourneys].map((title) => ({ title, tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] },
    'cache-upgrade-report.json': { errors: [], suites: [{ specs: cacheJourneys.map((title) => ({ title, tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] },
    'package.json': { schemaVersion: 1, package: { sha256: createHash('sha256').update(candidate).digest('hex'), ...identity, dirty: false }, tests: packageIds.map((id) => ({ id, status: 'passed' })) },
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
  mkdirSync(join(root, 'test-results/package-evidence'), { recursive: true });
  writeFileSync(join(root, 'test-results/package-evidence/candidate.tgz'), candidate);
  const check = (expected = identity) => checkContracts(root, expected);
  check.root = root;
  return check;
}

test('accepts all independently required successful contracts', (t) => {
  assert.equal(checkFixture(t, reports())(), expectedContracts);
});

for (const file of ['validation.tap', 'browser.json', 'cache-upgrade-report.json', 'package.json', 'node.tap', 'i18n/junit.xml']) {
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
    files['validation.tap'] = nativeTap(unitNames.filter((value) => value !== name));
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
  files['validation.tap'] = files['validation.tap'].replace(`1..${unitNames.length}\n`, '');
  assert.throws(checkFixture(t, files), /plan|TAP/i);
});

test('rejects duplicate native outcomes', (t) => {
  const files = reports();
  files['validation.tap'] = nativeTap([...unitNames, unitNames[0]]);
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

for (const title of i18nJourneys.slice(-3)) {
  test(`rejects a missing ${title} result`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const title of validationJourneys) {
  test(`rejects a missing validation browser contract: ${title}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs = files['browser.json'].suites[0].specs.filter((spec) => spec.title !== title);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
  test(`rejects a skipped validation browser contract: ${title}`, (t) => {
    const files = reports();
    files['browser.json'].suites[0].specs.find((spec) => spec.title === title).tests[0].results[0].status = 'skipped';
    assert.throws(checkFixture(t, files), /pass|contract/i);
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
  assert.equal(checkFixture(t, files)(), expectedContracts);
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
  test(`rejects a filtered-out Node contract: ${name}`, (t) => {
    const files = reports();
    files['node.tap'] = nativeTap(nodeNames.filter((value) => value !== name));
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}

for (const outcome of ['not ok', 'SKIP', 'TODO']) {
  test(`rejects a ${outcome} native Node outcome`, (t) => {
    const files = reports();
    files['node.tap'] = files['node.tap'].replace(`ok 1 - ${nodeNames[0]}`,
      outcome === 'not ok' ? `not ok 1 - ${nodeNames[0]}` : `ok 1 - ${nodeNames[0]} # ${outcome}`);
    assert.throws(checkFixture(t, files), /pass|TAP|contract/i);
  });
}

test('rejects inconsistent or interrupted native Node reports', (t) => {
  for (const change of [
    (tap) => tap.replace(`1..${nodeNames.length}\n`, ''),
    (tap) => tap.replace(`1..${nodeNames.length}`, `1..${nodeNames.length + 1}`),
    (tap) => tap.replace(`# tests ${nodeNames.length}`, `# tests ${nodeNames.length + 1}`),
    (tap) => tap.replace(`# pass ${nodeNames.length}`, `# pass ${nodeNames.length - 1}`),
    (tap) => tap.replace('# fail 0', '# fail 1'),
    (tap) => tap.replace('# cancelled 0', '# cancelled 1'),
    (tap) => tap.replace('# skipped 0', '# skipped 1'),
    (tap) => tap.replace('# todo 0', '# todo 1'),
    (tap) => tap.replace('# suites 0', '# suites 1'),
    (tap) => tap.replace('# fail 0\n', ''),
    (tap) => `${tap}# pass ${nodeNames.length}\n`,
    (tap) => `${tap}Bail out! interrupted\n`,
    (tap) => tap.replace('ok 2 - ', 'ok 1 - '),
    (tap) => tap.replace('ok 2 - ', '    ok 2 - '),
  ]) {
    const files = reports();
    files['node.tap'] = change(files['node.tap']);
    assert.throws(checkFixture(t, files), /TAP|pass|report|missing|required/i);
  }
});

test('rejects duplicate native Node contracts even with consistent totals', (t) => {
  const files = reports();
  files['node.tap'] = nativeTap([...nodeNames, nodeNames[0]]);
  assert.throws(checkFixture(t, files), /duplicate|once/i);
});

test('accepts the real native Node report without transforming it', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'core-native-node-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'native.test.mjs');
  writeFileSync(file, `import { test } from 'node:test';\nfor (const name of ${JSON.stringify(nodeNames)}) test(name, () => {});`);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  const files = reports();
  files['node.tap'] = result.stdout;
  assert.equal(checkFixture(t, files)(), expectedContracts);
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
    (xml) => xml.replace(/<testcase [^>]+\/>/, '').replace(`tests="${i18nNames.length}"`, `tests="${i18nNames.length - 1}"`),
    (xml) => xml.replace(`tests="${i18nNames.length}"`, `tests="${i18nNames.length + 1}"`),
    (xml) => xml.replace('failures="0"', 'failures="1"'),
    (xml) => xml.replace('</testsuite>', ''),
  ]) {
    const files = reports();
    files['i18n/junit.xml'] = change(files['i18n/junit.xml']);
    assert.throws(checkFixture(t, files), /missing|required|Karma|report/i);
  }
});

test('rejects each omitted i18n contract', (t) => {
  for (const name of i18nNames) {
    const files = reports();
    files['i18n/junit.xml'] = files['i18n/junit.xml']
      .replace(`<testcase name="${name.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"/>`, '')
      .replace(`tests="${i18nNames.length}"`, `tests="${i18nNames.length - 1}"`);
    assert.throws(checkFixture(t, files), /missing|required|Karma|report/i);
  }
});

for (const name of cacheJourneys) {
  test(`rejects a filtered-out cache upgrade contract: ${name}`, (t) => {
    const files = reports();
    files['cache-upgrade-report.json'].suites[0].specs = files['cache-upgrade-report.json'].suites[0].specs.filter((spec) => spec.title !== name);
    assert.throws(checkFixture(t, files), /missing|required/i);
  });
}


test('rejects XML comments, malformed documents, DTDs and unknown structure', (t) => {
  for (const mutate of [
    xml => xml.replace(/(<testcase[^>]*\/>)/g, '<!--$1-->'),
    xml => xml.replace('</testsuite>', ''),
    xml => xml.replace('<testsuite', '<!DOCTYPE testsuite><testsuite'),
    xml => xml.replace('</testsuite>', '<unexpected/></testsuite>'),
    xml => xml.replace('</testsuite>', '<testcase name="duplicate"/><testcase name="duplicate"/></testsuite>').replace(`tests="${i18nNames.length}"`, `tests="${i18nNames.length + 2}"`),
  ]) {
    const files = reports();
    files['i18n/junit.xml'] = mutate(files['i18n/junit.xml']);
    assert.throws(checkFixture(t, files));
  }
});

test('rejects missing or altered candidate and missing identity', (t) => {
  for (const mutate of [
    files => delete files['package.json'].package.sourceSha,
    files => files['package.json'].package.sha256 = 'b'.repeat(64),
    files => files['package.json'].package.dirty = 'false',
  ]) {
    const files = reports(); mutate(files);
    assert.throws(checkFixture(t, files));
  }
});

test('rejects a replay with absent or different expected identity', (t) => {
  const check = checkFixture(t, reports());
  assert.throws(() => checkContracts(check.root));
  for (const expected of [null, {...identity, sourceSha: 'b'.repeat(40)}, {...identity, runId: 'other'}, {...identity, attempt: '2'}]) {
    assert.throws(() => check(expected));
  }
});


test('rejects missing and altered candidate bytes', (t) => {
  for (const bytes of [null, 'altered']) {
    const check = checkFixture(t, reports());
    const path = join(check.root, 'test-results/package-evidence/candidate.tgz');
    if (bytes === null) rmSync(path); else writeFileSync(path, bytes);
    assert.throws(check);
  }
});

test('replay CLI requires a complete unique argument set', (t) => {
  const check = checkFixture(t, reports());
  const cli = new URL('../scripts/check-contracts.mjs', import.meta.url).pathname;
  const args = ['--report-root', check.root, '--source-sha', identity.sourceSha, '--run-id', identity.runId, '--attempt', identity.attempt];
  assert.equal(spawnSync(process.execPath, [cli, ...args]).status, 0);
  for (const invalid of [args.slice(0, -2), [...args, '--attempt', '1'], [...args, '--unknown', 'x'], [...args.slice(0, -1), '2']]) {
    assert.notEqual(spawnSync(process.execPath, [cli, ...invalid]).status, 0);
  }
});

test('accepts native Karma properties and output with encoded names', (t) => {
  const files = reports();
  files['i18n/junit.xml'] = files['i18n/junit.xml']
    .replace('<testcase', '<properties><property name="browser.fullName" value="Chrome"/></properties><testcase')
    .replace('</testsuite>', '<system-out><![CDATA[<testcase name="not a test"/>]]></system-out><system-err/></testsuite>');
  assert.equal(checkFixture(t, files)(), expectedContracts);
});


test('identity uses complete CI context and rejects a partial context', () => {
  const module = new URL('../scripts/evidence-identity.mjs', import.meta.url).href;
  const script = `import { currentIdentity } from ${JSON.stringify(module)}; console.log(JSON.stringify(currentIdentity(process.cwd())));`;
  const env = { ...process.env, GITHUB_SHA: identity.sourceSha, GITHUB_RUN_ID: identity.runId, GITHUB_RUN_ATTEMPT: identity.attempt };
  const complete = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env, encoding: 'utf8' });
  assert.equal(complete.status, 0, complete.stderr);
  const value = JSON.parse(complete.stdout);
  assert.deepEqual({ sourceSha: value.sourceSha, runId: value.runId, attempt: value.attempt }, identity);
  assert.equal(typeof value.dirty, 'boolean');
  delete env.GITHUB_RUN_ATTEMPT;
  assert.notEqual(spawnSync(process.execPath, ['--input-type=module', '-e', script], { env }).status, 0);
});
