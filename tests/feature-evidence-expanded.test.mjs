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

test('rendered feature report separates known account-switch gaps from filter behavior', () => {
  const html = parse(renderMatrix('verified', mapping, {}, inventory));
  const gapRow = html.querySelectorAll('tr').find(row => row.querySelector('th')?.text === 'Filter state known identity and bootstrap gap detection');
  const filterRow = html.querySelectorAll('tr').find(row => row.querySelector('th')?.text === 'Filter state');
  assert.ok(gapRow);
  assert.ok(filterRow);
  assert.match(gapRow.text, /3 required cases passed/);
  assert.match(html.text, /Filter state retains session and stream values across a same-tab account change/);
  assert.match(html.text, /an uncached read before owner information is available removes the local filter/);
  assert.match(html.text, /Consumer adoption and release remain blocked/);
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
