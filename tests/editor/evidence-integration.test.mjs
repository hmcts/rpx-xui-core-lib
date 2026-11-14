import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { validateMapping } from '../../scripts/feature-evidence-matrix.mjs';

test('editor contracts are required and mapped into aggregate feature evidence', async () => {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const inventory = await read('../contracts.json');
  const required = await read('./required-specs.json');
  const mapping = await read('../feature-evidence-map.json');
  assert.deepEqual(inventory.editorUnit, { report: 'test-results/editor/jasmine.json', required });
  validateMapping(inventory, mapping);
  assert.ok(mapping.features.some(row => row.contracts.editorUnit?.length));
});
