import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vitestOutcomes } from './check-contracts.mjs';
import { renderFeatureReport } from '../tests/editor/feature-report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const lane = process.argv[2];
const config = lane === 'i18n'
  ? { inventoryKey: 'i18nUnit', dir: 'test-results/i18n', receipt: 'test-results/i18n/vitest.json', target: 'translation-tests:vitest' }
  : lane === 'editor'
    ? { inventoryKey: 'editorUnit', dir: 'test-results/editor', receipt: 'test-results/editor/vitest.json', target: 'editor-tests:vitest' }
    : null;
if (!config || process.argv.length !== 3) throw new Error('Expected i18n or editor lane');
const inventory = JSON.parse(readFileSync(resolve(root, 'tests/contracts.json'), 'utf8'))[config.inventoryKey];
assert.equal(inventory.report, config.receipt, `${lane} report path differs from contract`);
const receipt = resolve(root, config.receipt);
mkdirSync(resolve(root, config.dir), { recursive: true });
rmSync(receipt, { force: true });
if (lane === 'editor') rmSync(resolve(root, 'test-results/editor/features.html'), { force: true });
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/@angular/cli/bin/ng.js'), 'run', config.target, '--watch=false'], {
  cwd: root,
  env: { ...process.env, XUI_VITEST_RECEIPT: receipt },
  stdio: 'inherit'
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`${config.target} exited ${result.status ?? result.signal}`);
const reportText = readFileSync(receipt, 'utf8');
const actual = vitestOutcomes(reportText).map(item => item.id);
const compareIds = (left, right) => left < right ? -1 : left > right ? 1 : 0;
assert.deepEqual([...actual].sort(compareIds), [...inventory.required].sort(compareIds), `${lane} Vitest contracts differ from inventory`);
if (lane === 'editor') writeFileSync(resolve(root, 'test-results/editor/features.html'), renderFeatureReport(JSON.parse(reportText)));
console.log(`${lane} native Vitest contracts passed: ${actual.length}`);
