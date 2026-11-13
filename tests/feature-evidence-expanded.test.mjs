import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateMapping, renderMatrix } from '../scripts/feature-evidence-matrix.mjs';
const inventory = JSON.parse(readFileSync(new URL('./contracts.json', import.meta.url), 'utf8'));
const mapping = JSON.parse(readFileSync(new URL('./feature-evidence-map.json', import.meta.url), 'utf8'));
const copy = value => structuredClone(value);
test('every current required contract is explicitly mapped once', () => validateMapping(inventory, mapping));
test('missing mapping fails closed', () => { const m = copy(mapping); Object.values(m.features[0].contracts)[0].pop(); assert.throws(() => validateMapping(inventory, m), /Missing|Invalid/); });
test('duplicate mapping fails closed', () => { const m = copy(mapping); const ids = Object.values(m.features[0].contracts)[0]; ids.push(ids[0]); assert.throws(() => validateMapping(inventory, m), /Duplicate or ambiguous/); });
test('unknown contract fails closed', () => { const m = copy(mapping); Object.values(m.features[0].contracts)[0][0] = 'unknown'; assert.throws(() => validateMapping(inventory, m), /Unknown/); });
test('a newly required contract fails closed until reviewed', () => { const value = copy(inventory); value.unit.required.push('new contract'); assert.throws(() => validateMapping(value, mapping), /Missing/); });
test('unavailable evidence makes no passing or coverage claim', () => { const html = renderMatrix('unavailable', mapping, {}, inventory); assert.match(html, /not coverage or a complete feature inventory/); assert.match(html, /unclassified/); assert.match(html, /unavailable|incomplete/i); assert.doesNotMatch(html, /required cases passed/); });

test('all migrated Node server cases have named feature groups', () => {
  assert.equal(inventory.nodeServerUnit.required.length, 150);
  assert.equal(mapping.suiteGroups.filter(group => group.lane === 'nodeServerUnit').length, 8);
  const html = renderMatrix('verified', mapping, {}, inventory);
  for (const feature of ['Node content security policy', 'Node authentication strategy', 'Node OIDC authentication', 'Node token refresh integration',
    'Node OAuth2 authentication', 'Node service authentication', 'Node application middleware', 'Node file sessions', 'Node Redis sessions']) {
    assert.ok(html.includes(feature));
  }
  assert.match(html, /<th scope="col">nodeServerUnit<\/th>/);
  assert.match(html, /54 required cases passed/);
  assert.match(html, /21 required cases passed/);
});
