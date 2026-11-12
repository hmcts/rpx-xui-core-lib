import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkContracts } from './check-contracts.mjs';
import { sourceSnapshot } from './evidence-source-snapshot.mjs';
import publisher from '../tests/reporters/odhin-site-publisher.cjs';

const key = (lane, id) => JSON.stringify([lane, typeof id === 'string' ? id : [id.projectName, id.title]]);
export function validateMapping(inventory, mapping) {
  if (mapping.schemaVersion !== 1 || !Array.isArray(mapping.features) || !Array.isArray(mapping.unmigrated) || !Array.isArray(mapping.fallbacks) || !Array.isArray(mapping.suiteGroups)) throw new Error('Invalid feature mapping');
  const expected = new Set(), seen = new Set(), names = new Set();
  for (const [lane, value] of Object.entries(inventory)) for (const id of value.required ?? []) {
    const k = key(lane, id); if (expected.has(k)) throw new Error('Duplicate required contract'); expected.add(k);
  }
  for (const row of mapping.features) {
    if (typeof row.feature !== 'string' || !row.feature.trim() || names.has(row.feature) || !row.contracts || typeof row.contracts !== 'object') throw new Error('Invalid or duplicate feature');
    names.add(row.feature);
    for (const [lane, ids] of Object.entries(row.contracts)) {
      if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid mapping lane');
      for (const id of ids) {
        const k = key(lane, id); if (!expected.has(k)) throw new Error('Unknown mapped contract');
        if (seen.has(k)) throw new Error('Duplicate or ambiguous mapping'); seen.add(k);
      }
    }
  }
  const suiteKeys = new Set();
  for (const group of mapping.suiteGroups) {
    if (typeof group.feature !== 'string' || !group.feature.trim() || names.has(group.feature) || !Array.isArray(inventory[group.lane]?.required) || !Array.isArray(group.suiteTokens) || !group.suiteTokens.length) throw new Error('Invalid suite group');
    names.add(group.feature);
    for (const token of group.suiteTokens) {
      const tokenKey = JSON.stringify([group.lane, token]);
      if (typeof token !== 'string' || !token || /\s/.test(token) || suiteKeys.has(tokenKey)) throw new Error('Duplicate or invalid suite token');
      suiteKeys.add(tokenKey);
      const matches = inventory[group.lane].required.filter(id => typeof id === 'string' && id.split(' ')[0] === token);
      if (!matches.length) throw new Error('Unknown suite token');
      for (const id of matches) {
        const k = key(group.lane, id);
        if (seen.has(k)) throw new Error('Overlapping suite mapping');
        seen.add(k);
      }
    }
  }
  const fallbackLanes = new Set();
  for (const fallback of mapping.fallbacks) {
    if (typeof fallback.feature !== 'string' || !fallback.feature.includes('(unclassified)') || names.has(fallback.feature) || !Array.isArray(inventory[fallback.lane]?.required) || fallbackLanes.has(fallback.lane)) throw new Error('Invalid or duplicate fallback');
    names.add(fallback.feature); fallbackLanes.add(fallback.lane);
    for (const id of inventory[fallback.lane].required) {
      const k = key(fallback.lane, id);
      if (!seen.has(k)) seen.add(k);
    }
  }
  if (seen.size !== expected.size) throw new Error('Missing contract mapping');
}
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function matrixState(root, expected, sequencePassed, checks = { checkContracts, sourceSnapshot }) {
  try {
    const run = JSON.parse(readFileSync(resolve(root, 'test-results/lane-provenance/run.json'), 'utf8'));
    if (!sequencePassed || ['sourceSha', 'runId', 'attempt', 'invocationId'].some(key => !expected[key] || expected[key] !== run[key]) || checks.sourceSnapshot(root) !== run.sourceSnapshot) throw new Error('Run mismatch');
    const inventory = JSON.parse(readFileSync(resolve(root, 'tests/contracts.json'), 'utf8'));
    validateMapping(inventory, JSON.parse(readFileSync(resolve(root, 'tests/feature-evidence-map.json'), 'utf8')));
    checks.checkContracts(root, expected);
    return 'verified';
  } catch { return 'unavailable'; }
}

export function renderMatrix(state, mapping, identity = {}, inventory = {}) {
  const suites = mapping.suiteGroups.map(group => ({ feature: group.feature, contracts: { [group.lane]: (inventory[group.lane]?.required ?? []).filter(id => typeof id === 'string' && group.suiteTokens.includes(id.split(' ')[0])) } }));
  const classified = [...mapping.features, ...suites];
  const assigned = new Set(classified.flatMap(row => Object.entries(row.contracts).flatMap(([lane, ids]) => ids.map(id => key(lane, id)))));
  const features = [...classified, ...mapping.fallbacks.map(fallback => ({ feature: fallback.feature, contracts: { [fallback.lane]: (inventory[fallback.lane]?.required ?? []).filter(id => !assigned.has(key(fallback.lane, id))) } }))];
  const layers = [...new Set(features.flatMap(row => Object.keys(row.contracts)))].sort((left, right) => left.localeCompare(right));
  const rows = features.map(row => `<tr><th scope="row">${esc(row.feature)}</th>${layers.map(lane => `<td>${row.contracts[lane] ? state === 'verified' ? `${row.contracts[lane].length} required cases passed` : 'Unavailable: run or gate incomplete' : 'Not mapped'}</td>`).join('')}</tr>`).join('');
  return `<section id="feature-evidence-matrix"><h2>Required feature evidence</h2><p>Required test outcomes only, not coverage or a complete feature inventory. Unclassified groups and unmapped layers make no feature claim. The aggregate contract gate and CI determine acceptance.</p><p>Commit ${esc(identity.sourceSha ?? 'unavailable')} · working tree ${esc(identity.dirty === true ? 'modified' : identity.dirty === false ? 'clean' : 'unknown')} · source snapshot ${esc(identity.sourceSnapshot ?? 'unavailable')} · run ${esc(identity.runId ?? 'unavailable')} · attempt ${esc(identity.attempt ?? 'unavailable')} · invocation ${esc(identity.invocationId ?? 'unavailable')}. Correlation is not authentication.</p><p>${mapping.unmigrated.map(esc).join(' ')}</p><div class="feature-evidence-scroll" role="region" aria-label="Feature evidence table" tabindex="0"><table><thead><tr><th scope="col">Feature</th>${layers.map(lane => `<th scope="col">${esc(lane)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

export function writeFeatureMatrix(root, expected, sequencePassed, options = { matrixState, validateSource: publisher.validateSource }) {
  const file = resolve(root, 'test-results/odhin/browser/index.html');
  let html;
  try { html = readFileSync(file, 'utf8'); } catch (error) {
    if (sequencePassed) throw error;
    return;
  }
  if (html.includes('id="feature-evidence-matrix"') || !html.includes('</body>')) throw new Error('Cannot attach feature evidence matrix');
  const state = options.matrixState(root, expected, sequencePassed);
  if (sequencePassed && state !== 'verified') throw new Error('Successful run lacks verified feature evidence');
  const mapping = JSON.parse(readFileSync(resolve(root, 'tests/feature-evidence-map.json'), 'utf8'));
  const inventory = JSON.parse(readFileSync(resolve(root, 'tests/contracts.json'), 'utf8'));
  const identity = state === 'verified' ? JSON.parse(readFileSync(resolve(root, 'test-results/lane-provenance/run.json'), 'utf8')) : expected;
  html = html.replace('</body>', `${renderMatrix(state, mapping, identity, inventory)}</body>`);
  writeFileSync(file, html);
  if (sequencePassed) options.validateSource(resolve(root, 'test-results/odhin'));
}
