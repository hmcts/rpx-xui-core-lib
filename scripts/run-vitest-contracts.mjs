import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vitestOutcomes } from './check-contracts.mjs';
import { renderFeatureReport } from '../tests/editor/feature-report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const lane = process.argv[2];
if (!['i18n', 'editor'].includes(lane) || process.argv.length !== 3) throw new Error('Expected i18n or editor lane');
const inventory = JSON.parse(readFileSync(resolve(root, 'tests/contracts.json'), 'utf8'))[lane === 'i18n' ? 'i18nUnit' : 'editorUnit'];
const receipt = resolve(root, inventory.report);
mkdirSync(resolve(root, 'test-results', lane), { recursive: true });
rmSync(receipt, { force: true });
if (lane === 'editor') rmSync(resolve(root, 'test-results/editor/features.html'), { force: true });
const target = lane === 'i18n' ? 'translation-tests:vitest' : 'editor-tests:vitest';
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/@angular/cli/bin/ng.js'), 'run', target, '--watch=false'], {
  cwd: root,
  env: { ...process.env, XUI_VITEST_RECEIPT: receipt },
  stdio: 'inherit'
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`${target} exited ${result.status ?? result.signal}`);
const reportText = readFileSync(receipt, 'utf8');
const actual = vitestOutcomes(reportText).map(item => item.id);
assert.deepEqual([...actual].sort(), [...inventory.required].sort(), `${lane} Vitest contracts differ from inventory`);
if (lane === 'editor') writeFileSync(resolve(root, 'test-results/editor/features.html'), renderFeatureReport(JSON.parse(reportText)));
console.log(`${lane} native Vitest contracts passed: ${actual.length}`);
