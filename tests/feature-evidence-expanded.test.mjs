import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
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

test('rendered filter rows show verified counts and the consumer adoption gate', () => {
  const html = parse(renderMatrix('verified', mapping, {}, inventory));
  const lanes = html.querySelectorAll('thead th').slice(1).map(cell => cell.text);
  const expected = {
    'Filter state': { unit: 15, package: 2 },
    'Filter renderers': { unit: 8, browser: 6, package: 3 },
    'Capitalize pipe': { unit: 1, package: 1 },
    'Generic Filter': { unit: 12, browser: 3, package: 3 },
    'Generic Filter accessibility': { browser: 2 },
  };
  for (const [name, counts] of Object.entries(expected)) {
    const row = html.querySelectorAll('tbody tr').find(candidate => candidate.querySelector('th')?.text === name);
    assert.ok(row, name);
    assert.deepEqual(row.querySelectorAll('td').map(cell => cell.text),
      lanes.map(lane => counts[lane] ? `${counts[lane]} required cases passed` : 'Not mapped'), name);
  }
  assert.match(html.text, /Filter state and Generic Filter have Core-only evidence/);
  assert.match(html.text, /Each consuming application still needs to validate token identity, owner-hash delivery, storage lifecycle and its cutover/);
});

test('rendered feature report separates inherited find-person gaps from passing behavior', () => {
  const html = parse(renderMatrix('verified', mapping, {}, inventory));
  const gapRow = html.querySelectorAll('tr').find(row => row.querySelector('th')?.text === 'Find person known identity, direct-call and accessibility gap detection');
  const behaviorRow = html.querySelectorAll('tr').find(row => row.querySelector('th')?.text === 'Find person');
  assert.ok(gapRow);
  assert.ok(behaviorRow);
  assert.match(gapRow.text, /4 required cases passed/);
  assert.match(gapRow.text, /1 required cases passed/);
  assert.match(html.text, /Instances sharing a default or identical idValue still have duplicate input, hint and error IDs; the accessible name uses a translated phrase with an English fallback/);
  assert.match(html.text, /pending names include an English translation-in-progress marker/);
  assert.match(html.text, /Multiple instances sharing one parent FormGroup still share a control and can issue duplicate lookups/);
  assert.match(html.text, /Hint and error DOM IDs now include the supplied idValue, so external references require cutover verification/);
});

test('rendered lookup report exposes inherited accessibility and cache limitations', () => {
  const html = parse(renderMatrix('verified', mapping, {}, inventory));
  const gapRow = html.querySelectorAll('tr').find(row => row.querySelector('th')?.text === 'Task-name accessibility and work-type known gap');
  assert.ok(gapRow);
  assert.match(html.text, /Task and work-type lookup default IDs can collide/);
  assert.match(html.text, /task-name hint and error IDs are scoped when consumers provide distinct idValue values/);
  assert.match(html.text, /bypass cache without writing until picker recreation/);
  assert.match(html.text, /Real consumer dependency injection, Welsh error copy and assistive-technology acceptance remain unverified/);
});

test('all migrated Node server cases have named feature groups', () => {
  assert.equal(inventory.nodeServerUnit.required.length, 170);
  assert.equal(mapping.suiteGroups.filter(group => group.lane === 'nodeServerUnit').length, 8);
  const html = renderMatrix('verified', mapping, {}, inventory);
  for (const feature of ['Node logger namespaces', 'Node HTTP session middleware', 'Node content security policy', 'Node authentication strategy', 'Node OIDC authentication', 'Node token refresh integration',
    'Node OAuth2 authentication', 'Node service authentication', 'Node application middleware', 'Node file sessions', 'Node Redis sessions']) {
    assert.ok(html.includes(feature));
  }
  assert.match(html, /<th scope="col">nodeServerUnit<\/th>/);
  assert.match(html, /54 required cases passed/);
  assert.match(html, /21 required cases passed/);
});
