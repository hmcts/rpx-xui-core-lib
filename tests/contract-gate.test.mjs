import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
const journey = 'keyboard checkbox toggles update real FormGroup validity and submitted errors';
const packageIds = [
  'package.physical-secondary-declaration', 'package.strict-node', 'package.strict-bundler',
  'package.installed-runtime', 'package.missing-declaration-fault', 'package.restored-node',
];

/** @returns {Record<string, any>} */
function reports() {
  return {
    'validation.tap': `TAP version 13\n${unitNames.map((name, index) => `ok ${index + 1} - ${name}`).join('\n')}\n1..7\n# tests 7\n# pass 7\n# fail 0\n`,
    'browser.json': { errors: [], suites: [{ specs: [{ title: journey, tests: [{ projectName: 'chromium', expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] }] }] },
    'package.json': { schemaVersion: 1, package: { sha256: 'a'.repeat(64) }, tests: packageIds.map((id) => ({ id, status: 'passed' })) },
  };
}

function checkFixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'core-contract-gate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'test-results'));
  for (const [file, report] of Object.entries(files)) {
    writeFileSync(join(root, 'test-results', file), typeof report === 'string' ? report : JSON.stringify(report));
  }
  return () => checkContracts(root);
}

test('accepts all independently required successful contracts', (t) => {
  assert.equal(checkFixture(t, reports())(), 14);
});

for (const file of ['validation.tap', 'browser.json', 'package.json']) {
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
  assert.equal(checkFixture(t, files)(), 14);
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
