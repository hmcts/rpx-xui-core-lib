const { createHash, randomUUID } = require('node:crypto');

const statuses = ['passed', 'failed', 'skipped', 'missing', 'duplicate'];
const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function snapshotInventory(inventory) {
  if (!Array.isArray(inventory) || !inventory.length) throw new Error('Required browser inventory is missing');
  const copy = JSON.parse(JSON.stringify(inventory));
  const seen = new Set();
  for (const item of copy) {
    if (!item || typeof item.projectName !== 'string' || !item.projectName || typeof item.title !== 'string' || !item.title || !/^[a-z][a-z0-9-]*$/.test(item.feature ?? '')) throw new Error('Invalid required browser inventory entry');
    const key = JSON.stringify([item.projectName, item.title]);
    if (seen.has(key)) throw new Error('Duplicate required browser inventory entry');
    seen.add(key);
  }
  return { inventory: copy, runId: randomUUID(), inventoryHash: createHash('sha256').update(JSON.stringify(copy)).digest('hex') };
}

function summarize(snapshot, suite) {
  if (!suite || typeof suite.allTests !== 'function') throw new Error('Browser suite is unavailable');
  const byKey = new Map();
  for (const test of suite.allTests()) {
    const project = test.parent?.project?.()?.name;
    if (typeof project !== 'string' || typeof test.title !== 'string' || !Array.isArray(test.results) || typeof test.outcome !== 'function') throw new Error('Malformed browser test result');
    const key = JSON.stringify([project, test.title]);
    const entries = byKey.get(key) ?? [];
    entries.push(test);
    byKey.set(key, entries);
  }
  const grouped = new Map();
  for (const item of snapshot.inventory) {
    if (!grouped.has(item.feature)) grouped.set(item.feature, Object.fromEntries(statuses.map(status => [status, 0])));
    const matches = byKey.get(JSON.stringify([item.projectName, item.title])) ?? [];
    let status = 'missing';
    if (matches.length > 1) status = 'duplicate';
    else if (matches.length === 1 && matches[0].results.length) {
      const test = matches[0];
      status = test.expectedStatus === 'passed' && test.outcome() === 'expected' && test.results.length === 1 && test.results[0].status === 'passed' ? 'passed'
        : (test.expectedStatus === 'skipped' || test.outcome() === 'skipped') && test.results.every(result => result.status === 'skipped') ? 'skipped' : 'failed';
    }
    grouped.get(item.feature)[status]++;
  }
  return grouped;
}

function render(snapshot, suite, unavailable) {
  const summary = unavailable ? null : summarize(snapshot, suite);
  const rows = summary ? [...summary].sort(([a], [b]) => a.localeCompare(b)).map(([feature, counts]) => `<tr><th scope="row">${escapeHtml(feature)}</th>${statuses.map(status => `<td>${counts[status]}</td>`).join('')}</tr>`).join('') : '';
  return `<section id="required-browser-evidence" aria-labelledby="required-browser-evidence-title"><h2 id="required-browser-evidence-title">Required browser-contract evidence</h2><p>Same reporter run; browser required contracts only. Other tests, non-required failures, other test layers and unlisted features are excluded. This diagnostic is not the acceptance gate.</p><p>Run ${escapeHtml(snapshot.runId)} · inventory SHA-256 ${escapeHtml(snapshot.inventoryHash)}. Correlation does not authenticate evidence.</p>${summary ? `<table><thead><tr><th scope="col">Feature</th>${statuses.map(status => `<th scope="col">${escapeHtml(status)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>` : '<p>Summary unavailable because reporting or a global browser error occurred.</p>'}</section>`;
}

module.exports = { snapshotInventory, summarize, render };
